import nodemailer from 'nodemailer';
import { Client, Databases } from 'node-appwrite';
import { NOTIFICATION_EVENT_TYPES, renderEmailTemplate } from '../src/emails/templates/index.js';

const REQUIRED_ENV_KEYS = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'APPWRITE_DATABASE_ID',
  'NOTIFY_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'APP_URL',
  'OPS_EMAIL',
];

const OUTBOX_DEFAULT = 'notification_outbox';
const MAX_BATCH = 20;

const readEnv = (key, fallback = '') => {
  const value = process.env[key];
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const redactPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;

  const clone = { ...payload };
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization', 'signatureDataUrl'];

  for (const key of sensitiveKeys) {
    if (key in clone) {
      clone[key] = '[REDACTED]';
    }
  }

  return clone;
};

const parsePayloadJson = (payload) => {
  if (!payload) return {};
  if (typeof payload === 'object') return payload;
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch (_) {
      return {};
    }
  }
  return {};
};

const parseIds = (body) => {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object.');
  }

  if (body.outboxId) {
    return [String(body.outboxId)];
  }

  if (Array.isArray(body.outboxIds) && body.outboxIds.length > 0) {
    return body.outboxIds.slice(0, MAX_BATCH).map((id) => String(id));
  }

  throw new Error('Provide outboxId or outboxIds[].');
};

const validateConfig = () => {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !readEnv(key));
  if (missing.length > 0) {
    throw new Error(`Missing required server env: ${missing.join(', ')}`);
  }
};

const buildAppwriteDatabases = () => {
  const client = new Client()
    .setEndpoint(readEnv('APPWRITE_ENDPOINT'))
    .setProject(readEnv('APPWRITE_PROJECT_ID'))
    .setKey(readEnv('APPWRITE_API_KEY'));

  return new Databases(client);
};

const buildTransporter = () => {
  const port = Number(readEnv('SMTP_PORT', '587'));
  const secure = port === 465;

  return nodemailer.createTransport({
    host: readEnv('SMTP_HOST'),
    port,
    secure,
    auth: {
      user: readEnv('SMTP_USER'),
      pass: readEnv('SMTP_PASS'),
    },
  });
};

const outboxCollectionId = () => readEnv('APPWRITE_NOTIFICATION_OUTBOX_COLLECTION_ID', OUTBOX_DEFAULT);

const updateOutbox = async ({ databases, outboxId, currentAttempts, status, lastError, subject }) => {
  const payload = {
    status,
    attempts: Number(currentAttempts || 0) + 1,
    lastError: lastError || null,
    updatedAt: new Date().toISOString(),
  };

  if (subject) {
    payload.subject = subject;
  }

  return databases.updateDocument(
    readEnv('APPWRITE_DATABASE_ID'),
    outboxCollectionId(),
    outboxId,
    payload,
  );
};

const processOutboxDoc = async ({ databases, transporter, outboxId }) => {
  const databaseId = readEnv('APPWRITE_DATABASE_ID');
  const doc = await databases.getDocument(databaseId, outboxCollectionId(), outboxId);

  if (doc.status === 'sent') {
    return {
      outboxId,
      status: 'skipped',
      reason: 'already_sent',
    };
  }

  const eventType = String(doc.eventType || '').trim();
  if (!NOTIFICATION_EVENT_TYPES.includes(eventType)) {
    const message = `Unsupported outbox event type: ${eventType}`;
    await updateOutbox({
      databases,
      outboxId,
      currentAttempts: doc.attempts,
      status: 'failed',
      lastError: message,
      subject: doc.subject,
    });

    return { outboxId, status: 'failed', reason: message };
  }

  const rawPayload = parsePayloadJson(doc.payload);
  const payload = {
    ...rawPayload,
    appUrl: rawPayload?.appUrl || readEnv('APP_URL'),
  };
  const rendered = renderEmailTemplate({
    eventType,
    payload,
    subjectOverride: doc.subject,
  });

  const recipientEmail =
    eventType === 'complianceSubmitted' && readEnv('OPS_EMAIL') ? readEnv('OPS_EMAIL') : doc.toEmail;

  try {
    const sendResult = await transporter.sendMail({
      from: readEnv('EMAIL_FROM'),
      to: recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    await updateOutbox({
      databases,
      outboxId,
      currentAttempts: doc.attempts,
      status: 'sent',
      lastError: null,
      subject: rendered.subject,
    });

    return {
      outboxId,
      status: 'sent',
      messageId: sendResult.messageId,
      eventType,
      toEmail: recipientEmail,
      payload: redactPayload(payload),
    };
  } catch (error) {
    const safeError = error?.message ? String(error.message).slice(0, 1800) : 'Unknown SMTP error';

    await updateOutbox({
      databases,
      outboxId,
      currentAttempts: doc.attempts,
      status: 'failed',
      lastError: safeError,
      subject: rendered.subject,
    });

    return {
      outboxId,
      status: 'failed',
      reason: safeError,
      eventType,
      toEmail: recipientEmail,
      payload: redactPayload(payload),
    };
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const incomingSecret = req.headers['x-notify-secret'];
  const expectedSecret = readEnv('NOTIFY_SECRET');

  if (!expectedSecret || incomingSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    validateConfig();

    const outboxIds = parseIds(req.body || {});
    const databases = buildAppwriteDatabases();
    const transporter = buildTransporter();

    const results = [];
    for (const outboxId of outboxIds) {
      results.push(await processOutboxDoc({ databases, transporter, outboxId }));
    }

    const summary = {
      total: results.length,
      sent: results.filter((item) => item.status === 'sent').length,
      failed: results.filter((item) => item.status === 'failed').length,
      skipped: results.filter((item) => item.status === 'skipped').length,
    };

    const statusCode = summary.failed > 0 ? 207 : 200;
    return res.status(statusCode).json({ summary, results });
  } catch (error) {
    console.error('[notify] request failed:', error);
    return res.status(400).json({ error: error?.message || 'Bad request' });
  }
}
