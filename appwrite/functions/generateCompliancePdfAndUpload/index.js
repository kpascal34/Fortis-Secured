import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Client, Databases, ID } from 'node-appwrite';
import { google } from 'googleapis';
import { PDFDocument } from 'pdf-lib';

const TEMPLATE_PATH = process.env.COMPLIANCE_TEMPLATE_PATH || '/mnt/data/Fortis_Staff_Declaration_Fillable.pdf';
const TEMPLATE_KEY = 'pre_employment_declaration_v1';

export default async ({ req, res, log, error }) => {
  try {
    if (req.method !== 'POST') {
      return res.json({ error: 'Method not allowed' }, 405);
    }

    const payload = JSON.parse(req.body || '{}');
    validatePayload(payload);

    const appwriteClient = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(appwriteClient);

    const fieldMap = JSON.parse(await fs.readFile(path.join(process.cwd(), 'pre_employment_declaration.map.json'), 'utf8'));

    const pdfBytes = await generatePdf({ payload, fieldMap });
    const { driveFileId, webViewLink, driveFolderId, fileName } = await uploadToDrive(payload, pdfBytes);
    const sha256 = crypto.createHash('sha256').update(pdfBytes).digest('hex');

    await databases.updateDocument(process.env.APPWRITE_DATABASE_ID, process.env.APPWRITE_COMPLIANCE_SUBMISSIONS_COLLECTION_ID, payload.submissionId, {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    });

    const instance = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_DOCUMENT_INSTANCES_COLLECTION_ID,
      ID.unique(),
      {
        staffId: payload.staffId,
        templateKey: TEMPLATE_KEY,
        submissionId: payload.submissionId,
        driveFileId,
        driveFolderId,
        webViewLink,
        sha256,
        createdAt: new Date().toISOString(),
      }
    );

    const logs = [
      ['compliance_submitted', { submissionId: payload.submissionId }],
      ['pdf_generated', { template: TEMPLATE_KEY, fileName }],
      ['drive_uploaded', { driveFileId, driveFolderId, webViewLink }],
    ];

    for (const [action, metadata] of logs) {
      await databases.createDocument(process.env.APPWRITE_DATABASE_ID, process.env.APPWRITE_AUDIT_LOGS_COLLECTION_ID, ID.unique(), {
        actorUserId: payload.staffId,
        action,
        entityType: 'complianceSubmissions',
        entityId: payload.submissionId,
        metadataJson: JSON.stringify(metadata),
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({ driveFileId, webViewLink, driveFolderId, submissionId: payload.submissionId, instanceId: instance.$id });
  } catch (err) {
    error(err);
    return res.json({ error: err.message || 'Failed to generate compliance PDF' }, 500);
  }
};

function validatePayload(payload) {
  const required = ['staffId', 'fullName', 'submissionId', 'formData'];
  for (const key of required) {
    if (!payload[key]) throw new Error(`Missing required payload key: ${key}`);
  }

  if (!payload.formData.signatureDataUrl) {
    throw new Error('Signature is required.');
  }
}

async function generatePdf({ payload, fieldMap }) {
  const templateBytes = await fs.readFile(TEMPLATE_PATH);
  const pdf = await PDFDocument.load(templateBytes);
  const form = pdf.getForm();
  const fields = fieldMap.fieldMap;

  for (const [jsonPath, mapValue] of Object.entries(fields)) {
    const value = getByPath(payload.formData, jsonPath);
    if (value === undefined || value === null || value === '') continue;

    if (mapValue.type === 'checkbox') {
      try {
        if (value) form.getCheckBox(mapValue.pdfFieldName).check();
      } catch (err) {}
      continue;
    }

    try {
      form.getTextField(mapValue.pdfFieldName).setText(String(value));
    } catch (err) {}
  }

  const historyRows = payload.formData.employmentHistory || [];
  fillEmploymentRows(form, fieldMap, historyRows);

  const signatureBase64 = payload.formData.signatureDataUrl.split(',')[1];
  const signatureImage = await pdf.embedPng(Buffer.from(signatureBase64, 'base64'));
  const firstPage = pdf.getPages()[fieldMap.signature.pageIndex || 0];
  firstPage.drawImage(signatureImage, {
    x: fieldMap.signature.x,
    y: fieldMap.signature.y,
    width: fieldMap.signature.width,
    height: fieldMap.signature.height,
  });

  form.flatten();
  return Buffer.from(await pdf.save());
}

function fillEmploymentRows(form, fieldMap, historyRows) {
  const configuredRows = 6;
  const rows = historyRows.slice(0, configuredRows);
  for (let i = 0; i < rows.length; i += 1) {
    for (const rowField of fieldMap.employmentHistory.rowFields) {
      const name = rowField.pdfPattern.replace('{index}', String(i + 1));
      const value = rows[i][rowField.path];
      if (!value) continue;
      try {
        form.getTextField(name).setText(String(value));
      } catch (err) {}
    }
  }
}

async function uploadToDrive(payload, pdfBytes) {
  const credentialsJson = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
  const credentials = JSON.parse(credentialsJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });
  const folderNames = [
    'Fortis Security',
    'Compliance',
    'Staff',
    `${payload.staffId}_${payload.fullName}`,
    'BS7858',
    'Pre-Employment Declaration',
  ];

  let parentId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null;
  for (const folderName of folderNames) {
    parentId = await ensureFolder(drive, folderName, parentId);
  }

  const fileName = `${new Date().toISOString().slice(0, 10)}_${payload.staffId}_Pre-Employment_Declaration_Vetting_Consent.pdf`;

  const file = await drive.files.create({
    supportsAllDrives: true,
    requestBody: { name: fileName, mimeType: 'application/pdf', parents: [parentId] },
    media: { mimeType: 'application/pdf', body: Buffer.from(pdfBytes) },
    fields: 'id, webViewLink',
  });

  return {
    driveFileId: file.data.id,
    webViewLink: file.data.webViewLink,
    driveFolderId: parentId,
    fileName,
  };
}

async function ensureFolder(drive, name, parentId) {
  const q = [`mimeType='application/vnd.google-apps.folder'`, `name='${name.replace(/'/g, "\\'")}'`, 'trashed=false'];
  if (parentId) q.push(`'${parentId}' in parents`);

  const list = await drive.files.list({
    q: q.join(' and '),
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'files(id, name)',
    pageSize: 1,
  });

  if (list.data.files?.length) return list.data.files[0].id;

  const created = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  });

  return created.data.id;
}

function getByPath(obj, pathValue) {
  return pathValue.split('.').reduce((acc, part) => acc?.[part], obj);
}
