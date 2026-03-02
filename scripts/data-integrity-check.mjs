#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { Client, Databases, Query } from 'node-appwrite';

const PAGE_SIZE = 100;

const STATUS_RULES = {
  shifts: new Set(['scheduled', 'confirmed', 'completed', 'cancelled', 'open', 'assigned', 'filled', 'unfilled', 'active']),
  shift_assignments: new Set(['assigned', 'checked-in', 'completed', 'cancelled', 'pending']),
  applications: new Set(['pending', 'approved', 'rejected', 'withdrawn', 'expired']),
  compliance_uploads: new Set(['pending', 'submitted', 'approved', 'rejected', 'archived']),
  notification_outbox: new Set(['pending', 'sent', 'failed']),
  timesheets: new Set(['open', 'submitted', 'approved', 'rejected', 'locked']),
  timesheet_entries: new Set(['open', 'submitted', 'approved', 'rejected']),
  incidents: new Set(['draft', 'submitted', 'interim_sent', 'needs_review', 'approved', 'final_sent', 'rejected']),
  compliance_flags: new Set(['open', 'resolved', 'dismissed']),
};

const issues = [];
const addIssue = (severity, code, message, context = {}) => {
  issues.push({ severity, code, message, context });
};

loadDotenv();

const env = {
  endpoint: process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID,
};

const collections = {
  clients: process.env.APPWRITE_CLIENTS_COLLECTION_ID || process.env.VITE_APPWRITE_CLIENTS_COLLECTION_ID || 'clients',
  sites: process.env.APPWRITE_SITES_COLLECTION_ID || process.env.VITE_APPWRITE_SITES_COLLECTION_ID || 'sites',
  shifts: process.env.APPWRITE_SHIFTS_COLLECTION_ID || process.env.VITE_APPWRITE_SHIFTS_COLLECTION_ID || 'shifts',
  shiftAssignments:
    process.env.APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID ||
    'shift_assignments',
  applications:
    process.env.APPWRITE_APPLICATIONS_COLLECTION_ID || process.env.VITE_APPWRITE_APPLICATIONS_COLLECTION_ID || 'applications',
  complianceUploads:
    process.env.APPWRITE_COMPLIANCE_UPLOADS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_COMPLIANCE_UPLOADS_COLLECTION_ID ||
    'compliance_uploads',
  notificationOutbox:
    process.env.APPWRITE_NOTIFICATION_OUTBOX_COLLECTION_ID ||
    process.env.VITE_APPWRITE_NOTIFICATION_OUTBOX_COLLECTION_ID ||
    'notification_outbox',
  timesheets:
    process.env.APPWRITE_TIMESHEETS_COLLECTION_ID || process.env.VITE_APPWRITE_TIMESHEETS_COLLECTION_ID || 'timesheets',
  timesheetEntries:
    process.env.APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    process.env.VITE_APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID ||
    'timesheet_entries',
  incidents:
    process.env.APPWRITE_INCIDENTS_COLLECTION_ID || process.env.VITE_APPWRITE_INCIDENTS_COLLECTION_ID || 'incidents',
  complianceFlags:
    process.env.APPWRITE_COMPLIANCE_FLAGS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_COMPLIANCE_FLAGS_COLLECTION_ID ||
    'compliance_flags',
  contracts:
    process.env.APPWRITE_CONTRACTS_COLLECTION_ID || process.env.VITE_APPWRITE_CONTRACTS_COLLECTION_ID || 'contracts',
  billingExports:
    process.env.APPWRITE_BILLING_EXPORTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_BILLING_EXPORTS_COLLECTION_ID ||
    'billing_exports',
  payrollExports:
    process.env.APPWRITE_PAYROLL_EXPORTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_PAYROLL_EXPORTS_COLLECTION_ID ||
    'payroll_exports',
  profitSnapshots:
    process.env.APPWRITE_PROFIT_SNAPSHOTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_PROFIT_SNAPSHOTS_COLLECTION_ID ||
    'profit_snapshots',
  financeEvents:
    process.env.APPWRITE_FINANCE_EVENTS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_FINANCE_EVENTS_COLLECTION_ID ||
    'finance_events',
};

validateEnv(env);

const client = new Client().setEndpoint(env.endpoint).setProject(env.projectId).setKey(env.apiKey);
const databases = new Databases(client);

(async () => {
  const clientsDocs = await listAllDocuments(databases, env.databaseId, collections.clients);
  const clientIds = new Set(clientsDocs.map((doc) => doc.$id));
  const clientEntityById = new Map(clientsDocs.map((doc) => [doc.$id, doc.entityId || null]));

  for (const client of clientsDocs) {
    if (!client.entityId) {
      addIssue('critical', 'CLIENT_MISSING_ENTITY', 'Client missing entityId', {
        clientId: client.$id,
      });
    }
  }

  const sitesDocs = await listAllDocuments(databases, env.databaseId, collections.sites);
  const siteIds = new Set(sitesDocs.map((doc) => doc.$id));

  for (const site of sitesDocs) {
    if (!site.clientId) {
      addIssue('critical', 'SITE_MISSING_CLIENT', 'Site missing clientId', { siteId: site.$id });
      continue;
    }

    if (!clientIds.has(site.clientId)) {
      addIssue('critical', 'SITE_ORPHAN_CLIENT', 'Site references unknown clientId', {
        siteId: site.$id,
        clientId: site.clientId,
      });
      continue;
    }

    const clientEntityId = clientEntityById.get(site.clientId) || null;
    if (site.entityId && clientEntityId && String(site.entityId) !== String(clientEntityId)) {
      addIssue('critical', 'SITE_ENTITY_MISMATCH', 'Site entityId mismatches parent client entityId', {
        siteId: site.$id,
        siteEntityId: site.entityId,
        clientId: site.clientId,
        clientEntityId,
      });
    }

    if (!site.entityId) {
      addIssue('critical', 'SITE_MISSING_ENTITY', 'Site missing entityId', {
        siteId: site.$id,
        clientId: site.clientId,
      });
    }
  }

  const shiftsDocs = await listAllDocuments(databases, env.databaseId, collections.shifts);

  for (const shift of shiftsDocs) {
    if (!shift.clientId || !shift.siteId || !shift.date) {
      addIssue('critical', 'SHIFT_MISSING_TENANCY', 'Shift missing required tenancy/date fields', {
        shiftId: shift.$id,
        clientId: shift.clientId || null,
        siteId: shift.siteId || null,
        date: shift.date || null,
      });
    }

    if (shift.siteId && !siteIds.has(shift.siteId)) {
      addIssue('critical', 'SHIFT_ORPHAN_SITE', 'Shift references unknown siteId', {
        shiftId: shift.$id,
        siteId: shift.siteId,
      });
    }

    const clientEntityId = clientEntityById.get(shift.clientId) || null;
    if (shift.entityId && clientEntityId && String(shift.entityId) !== String(clientEntityId)) {
      addIssue('critical', 'SHIFT_ENTITY_MISMATCH', 'Shift entityId mismatches parent client entityId', {
        shiftId: shift.$id,
        shiftEntityId: shift.entityId,
        clientId: shift.clientId,
        clientEntityId,
      });
    }

    if (shift.status && !STATUS_RULES.shifts.has(String(shift.status))) {
      addIssue('critical', 'SHIFT_INVALID_STATUS', 'Shift has invalid status', {
        shiftId: shift.$id,
        status: shift.status,
      });
    }
  }

  const assignmentsDocs = await listAllDocuments(databases, env.databaseId, collections.shiftAssignments);

  for (const assignment of assignmentsDocs) {
    if (!assignment.shiftId || !assignment.clientId || !assignment.siteId || !assignment.guardId) {
      addIssue('critical', 'ASSIGNMENT_MISSING_TENANCY', 'Shift assignment missing denormalized tenancy fields', {
        assignmentId: assignment.$id,
        shiftId: assignment.shiftId || null,
        clientId: assignment.clientId || null,
        siteId: assignment.siteId || null,
        guardId: assignment.guardId || null,
      });
    }

    if (assignment.status && !STATUS_RULES.shift_assignments.has(String(assignment.status))) {
      addIssue('critical', 'ASSIGNMENT_INVALID_STATUS', 'Shift assignment has invalid status', {
        assignmentId: assignment.$id,
        status: assignment.status,
      });
    }

    const clientEntityId = clientEntityById.get(assignment.clientId) || null;
    if (assignment.entityId && clientEntityId && String(assignment.entityId) !== String(clientEntityId)) {
      addIssue('critical', 'ASSIGNMENT_ENTITY_MISMATCH', 'Shift assignment entityId mismatches client entityId', {
        assignmentId: assignment.$id,
        assignmentEntityId: assignment.entityId,
        clientId: assignment.clientId,
        clientEntityId,
      });
    }
  }

  const applicationsDocs = await listAllDocuments(databases, env.databaseId, collections.applications);

  for (const application of applicationsDocs) {
    if (!application.clientId || !application.siteId) {
      addIssue('critical', 'APPLICATION_MISSING_TENANCY', 'Application missing denormalized clientId/siteId', {
        applicationId: application.$id,
        clientId: application.clientId || null,
        siteId: application.siteId || null,
      });
    }

    if (application.status && !STATUS_RULES.applications.has(String(application.status))) {
      addIssue('critical', 'APPLICATION_INVALID_STATUS', 'Application has invalid status', {
        applicationId: application.$id,
        status: application.status,
      });
    }

    const clientEntityId = clientEntityById.get(application.clientId) || null;
    if (application.entityId && clientEntityId && String(application.entityId) !== String(clientEntityId)) {
      addIssue('critical', 'APPLICATION_ENTITY_MISMATCH', 'Application entityId mismatches client entityId', {
        applicationId: application.$id,
        applicationEntityId: application.entityId,
        clientId: application.clientId,
        clientEntityId,
      });
    }
  }

  const uploadsDocs = await listAllDocuments(databases, env.databaseId, collections.complianceUploads);

  for (const upload of uploadsDocs) {
    if (upload.status && !STATUS_RULES.compliance_uploads.has(String(upload.status))) {
      addIssue('warning', 'UPLOAD_INVALID_STATUS', 'Compliance upload has unexpected status', {
        uploadId: upload.$id,
        status: upload.status,
      });
    }
  }

  const outboxDocs = await listAllDocuments(databases, env.databaseId, collections.notificationOutbox);
  for (const item of outboxDocs) {
    if (!STATUS_RULES.notification_outbox.has(String(item.status || ''))) {
      addIssue('critical', 'OUTBOX_INVALID_STATUS', 'Notification outbox has invalid status', {
        outboxId: item.$id,
        status: item.status,
      });
    }

    const attempts = Number(item.attempts);
    if (!Number.isFinite(attempts) || attempts < 0) {
      addIssue('critical', 'OUTBOX_INVALID_ATTEMPTS', 'Notification outbox has invalid attempts value', {
        outboxId: item.$id,
        attempts: item.attempts,
      });
    }
  }

  // Phase 5 checks
  const timesheetsDocs = await listAllDocuments(databases, env.databaseId, collections.timesheets);
  const timesheetMap = new Map(timesheetsDocs.map((doc) => [doc.$id, doc]));

  for (const sheet of timesheetsDocs) {
    if (!sheet.guardId || !sheet.weekStart || !sheet.weekEnd) {
      addIssue('critical', 'TIMESHEET_MISSING_REQUIRED', 'Timesheet missing required guard/week fields', {
        timesheetId: sheet.$id,
      });
    }

    if (!STATUS_RULES.timesheets.has(String(sheet.status || ''))) {
      addIssue('critical', 'TIMESHEET_INVALID_STATUS', 'Timesheet has invalid status', {
        timesheetId: sheet.$id,
        status: sheet.status,
      });
    }
  }

  const entriesDocs = await listAllDocuments(databases, env.databaseId, collections.timesheetEntries);
  const entriesByTimesheet = new Map();

  for (const entry of entriesDocs) {
    if (!entry.timesheetId || !entry.guardId || !entry.clientId || !entry.siteId || !entry.workDate) {
      addIssue('critical', 'TIMESHEET_ENTRY_MISSING_REQUIRED', 'Timesheet entry missing required fields', {
        entryId: entry.$id,
      });
    }

    if (!STATUS_RULES.timesheet_entries.has(String(entry.status || ''))) {
      addIssue('critical', 'TIMESHEET_ENTRY_INVALID_STATUS', 'Timesheet entry has invalid status', {
        entryId: entry.$id,
        status: entry.status,
      });
    }

    const parent = timesheetMap.get(entry.timesheetId);
    if (!parent) {
      addIssue('critical', 'TIMESHEET_ENTRY_ORPHAN_PARENT', 'Timesheet entry references non-existent timesheet', {
        entryId: entry.$id,
        timesheetId: entry.timesheetId,
      });
      continue;
    }

    if (!entriesByTimesheet.has(entry.timesheetId)) {
      entriesByTimesheet.set(entry.timesheetId, []);
    }
    entriesByTimesheet.get(entry.timesheetId).push(entry);

    const workDate = new Date(entry.workDate);
    const weekStart = new Date(parent.weekStart);
    const weekEnd = new Date(parent.weekEnd);

    if (
      Number.isNaN(workDate.getTime()) ||
      Number.isNaN(weekStart.getTime()) ||
      Number.isNaN(weekEnd.getTime()) ||
      workDate < weekStart ||
      workDate > weekEnd
    ) {
      addIssue('critical', 'TIMESHEET_ENTRY_OUTSIDE_WEEK', 'Timesheet entry workDate is outside parent week range', {
        entryId: entry.$id,
        timesheetId: entry.timesheetId,
        workDate: entry.workDate,
        weekStart: parent.weekStart,
        weekEnd: parent.weekEnd,
      });
    }

    const clientEntityId = clientEntityById.get(entry.clientId) || null;
    if (entry.entityId && clientEntityId && String(entry.entityId) !== String(clientEntityId)) {
      addIssue('critical', 'TIMESHEET_ENTRY_ENTITY_MISMATCH', 'Timesheet entry entityId mismatches client entityId', {
        entryId: entry.$id,
        entryEntityId: entry.entityId,
        clientId: entry.clientId,
        clientEntityId,
      });
    }
  }

  for (const sheet of timesheetsDocs) {
    if (!['approved', 'locked'].includes(String(sheet.status || ''))) continue;
    const childEntries = entriesByTimesheet.get(sheet.$id) || [];

    const hasOpenEntry = childEntries.some((entry) => String(entry.status || '') === 'open');
    if (hasOpenEntry) {
      addIssue('critical', 'TIMESHEET_APPROVED_WITH_OPEN_ENTRY', 'Approved/locked timesheet contains open entries', {
        timesheetId: sheet.$id,
        status: sheet.status,
      });
    }
  }

  const incidentsDocs = await listAllDocuments(databases, env.databaseId, collections.incidents);
  for (const incident of incidentsDocs) {
    if (!incident.clientId || !incident.siteId || !incident.reportedBy) {
      addIssue('critical', 'INCIDENT_MISSING_REQUIRED', 'Incident missing required tenancy/reporter fields', {
        incidentId: incident.$id,
      });
    }

    if (!STATUS_RULES.incidents.has(String(incident.status || ''))) {
      addIssue('critical', 'INCIDENT_INVALID_STATUS', 'Incident has invalid workflow status', {
        incidentId: incident.$id,
        status: incident.status,
      });
    }
  }

  const flagsDocs = await listAllDocuments(databases, env.databaseId, collections.complianceFlags);
  for (const flag of flagsDocs) {
    if (!STATUS_RULES.compliance_flags.has(String(flag.status || ''))) {
      addIssue('critical', 'COMPLIANCE_FLAG_INVALID_STATUS', 'Compliance flag has invalid status', {
        flagId: flag.$id,
        status: flag.status,
      });
    }

    if (!flag.guardId || !flag.type || !flag.dueAt) {
      addIssue('warning', 'COMPLIANCE_FLAG_MISSING_FIELDS', 'Compliance flag missing expected fields', {
        flagId: flag.$id,
      });
    }
  }

  const contractsDocs = await listAllDocuments(databases, env.databaseId, collections.contracts);
  for (const contract of contractsDocs) {
    if (!contract.entityId) {
      addIssue('critical', 'CONTRACT_MISSING_ENTITY', 'Contract missing entityId', {
        contractId: contract.$id,
      });
    }

    const clientEntityId = clientEntityById.get(contract.clientId) || null;
    if (contract.entityId && clientEntityId && String(contract.entityId) !== String(clientEntityId)) {
      addIssue('critical', 'CONTRACT_ENTITY_MISMATCH', 'Contract entityId mismatches client entityId', {
        contractId: contract.$id,
        contractEntityId: contract.entityId,
        clientId: contract.clientId,
        clientEntityId,
      });
    }
  }

  const billingExportsDocs = await listAllDocuments(databases, env.databaseId, collections.billingExports);
  for (const record of billingExportsDocs) {
    if (!record.entityId) {
      addIssue('critical', 'BILLING_EXPORT_MISSING_ENTITY', 'Billing export missing entityId', {
        exportId: record.$id,
      });
    }
  }

  const payrollExportsDocs = await listAllDocuments(databases, env.databaseId, collections.payrollExports);
  for (const record of payrollExportsDocs) {
    if (!record.entityId) {
      addIssue('critical', 'PAYROLL_EXPORT_MISSING_ENTITY', 'Payroll export missing entityId', {
        exportId: record.$id,
      });
    }
  }

  const profitSnapshotsDocs = await listAllDocuments(databases, env.databaseId, collections.profitSnapshots);
  for (const snapshot of profitSnapshotsDocs) {
    if (!snapshot.entityId) {
      addIssue('critical', 'PROFIT_SNAPSHOT_MISSING_ENTITY', 'Profit snapshot missing entityId', {
        snapshotId: snapshot.$id,
      });
    }
  }

  const financeEventsDocs = await listAllDocuments(databases, env.databaseId, collections.financeEvents);
  for (const event of financeEventsDocs) {
    if (!event.entityId) {
      addIssue('critical', 'FINANCE_EVENT_MISSING_ENTITY', 'Finance event missing entityId', {
        financeEventId: event.$id,
      });
    }
  }

  printResults();

  const criticalCount = issues.filter((issue) => issue.severity === 'critical').length;
  if (criticalCount > 0) {
    process.exit(1);
  }
})();

function loadDotenv() {
  const files = ['.env.local', '.env.production', '.env.development', '.env'];
  for (const file of files) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: false });
    }
  }
}

function validateEnv(envValues) {
  const missing = [];
  if (!envValues.endpoint) missing.push('APPWRITE_ENDPOINT');
  if (!envValues.projectId) missing.push('APPWRITE_PROJECT_ID');
  if (!envValues.apiKey) missing.push('APPWRITE_API_KEY');
  if (!envValues.databaseId) missing.push('APPWRITE_DATABASE_ID');

  if (missing.length > 0) {
    console.error('Missing required environment variables for data integrity check:');
    for (const key of missing) {
      console.error(`- ${key}`);
    }
    process.exit(1);
  }
}

async function listAllDocuments(databasesClient, databaseId, collectionId) {
  const docs = [];
  let offset = 0;

  while (true) {
    const response = await databasesClient.listDocuments(databaseId, collectionId, [
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
    ]);

    docs.push(...response.documents);

    if (response.documents.length < PAGE_SIZE) break;
    if (response.total && docs.length >= response.total) break;
    offset += PAGE_SIZE;
  }

  return docs;
}

function printResults() {
  const critical = issues.filter((issue) => issue.severity === 'critical').length;
  const warning = issues.filter((issue) => issue.severity === 'warning').length;

  console.log('\nData Integrity Summary');
  console.table([
    { severity: 'critical', count: critical },
    { severity: 'warning', count: warning },
  ]);

  if (issues.length === 0) {
    console.log('No integrity issues detected.');
    return;
  }

  console.log('\nDetailed findings:');
  for (const issue of issues) {
    console.log(`- [${issue.severity}] ${issue.code}: ${issue.message} ${JSON.stringify(issue.context)}`);
  }
}
