import { ID, Query } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';
import { PERMISSIONS, ROLES } from '../lib/rbac.ts';
import {
  assertScopedDocument,
  ensureDatabaseConfig,
  getAuthorizedScope,
} from '../lib/serviceSecurity.js';
import {
  RESOURCE_TYPES,
  assertScopedAccess,
  enforceTenancyFields,
  scopeQueries,
} from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';
import {
  notifyTimesheetApproved,
  notifyTimesheetRejected,
  notifyTimesheetSubmitted,
} from './notificationService.js';

const dbId = config.databaseId;
const timesheetsCol = config.timesheetsCollectionId || 'timesheets';
const timesheetEntriesCol = config.timesheetEntriesCollectionId || 'timesheet_entries';
const shiftsCol = config.shiftsCollectionId || 'shifts';

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;
const LIST_PAGE_SIZE = 100;

const ensureCollections = () => {
  ensureDatabaseConfig(timesheetsCol, 'timesheets collection');
  ensureDatabaseConfig(timesheetEntriesCol, 'timesheet entries collection');
};

const clampLimit = (value, fallback = DEFAULT_PAGE_LIMIT) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_PAGE_LIMIT);
};

const parseIso = (value, field) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return parsed;
};

const asDateOnlyIso = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const utcMidnight = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return utcMidnight.toISOString();
};

const normalizeBreakMinutes = (value) => {
  const minutes = Number(value || 0);
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new Error('breakMinutes must be a non-negative number.');
  }
  return Math.floor(minutes);
};

const computeMinutesWorked = (startAt, endAt) => {
  if (!startAt || !endAt) return 0;
  const start = parseIso(startAt, 'startAt');
  const end = parseIso(endAt, 'endAt');
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    throw new Error('endAt cannot be before startAt.');
  }
  return Math.floor(diffMs / 60000);
};

const computePayableMinutes = (minutesWorked, breakMinutes) => {
  return Math.max(0, Math.floor(minutesWorked) - normalizeBreakMinutes(breakMinutes));
};

const chunk = (items, size = 100) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const toRole = (scope) => String(scope?.role || '').toLowerCase();

const formatDateInTimeZoneParts = (value, timeZone) => {
  const date = value instanceof Date ? value : new Date(value);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
    hour: Number(byType.hour),
    minute: Number(byType.minute),
    second: Number(byType.second),
  };
};

const zonedDateTimeToUtc = ({ year, month, day, hour = 0, minute = 0, second = 0, ms = 0 }, timeZone) => {
  const baseUtc = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const zonedParts = formatDateInTimeZoneParts(new Date(baseUtc), timeZone);
  const asIfUtc = Date.UTC(
    zonedParts.year,
    zonedParts.month - 1,
    zonedParts.day,
    zonedParts.hour,
    zonedParts.minute,
    zonedParts.second,
    ms,
  );
  const offsetMs = asIfUtc - baseUtc;
  return new Date(baseUtc - offsetMs);
};

const toUkStartOfDayIso = (value, timeZone = 'Europe/London') => {
  const parts = formatDateInTimeZoneParts(value, timeZone);
  return zonedDateTimeToUtc({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: 0,
    minute: 0,
    second: 0,
    ms: 0,
  }, timeZone).toISOString();
};

export const getWeekRange = (value, timeZone = 'Europe/London') => {
  const target = value ? new Date(value) : new Date();
  if (Number.isNaN(target.getTime())) {
    throw new Error(`Invalid date for getWeekRange: ${value}`);
  }

  const local = formatDateInTimeZoneParts(target, timeZone);
  const dayIndex = new Date(Date.UTC(local.year, local.month - 1, local.day)).getUTCDay();
  const mondayOffset = (dayIndex + 6) % 7;

  const mondayUtcNoon = new Date(Date.UTC(local.year, local.month - 1, local.day - mondayOffset, 12, 0, 0));
  const mondayLocal = formatDateInTimeZoneParts(mondayUtcNoon, timeZone);

  const weekStart = zonedDateTimeToUtc({
    year: mondayLocal.year,
    month: mondayLocal.month,
    day: mondayLocal.day,
    hour: 0,
    minute: 0,
    second: 0,
    ms: 0,
  }, timeZone);

  const weekEnd = zonedDateTimeToUtc({
    year: mondayLocal.year,
    month: mondayLocal.month,
    day: mondayLocal.day + 6,
    hour: 23,
    minute: 59,
    second: 59,
    ms: 999,
  }, timeZone);

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
  };
};

const listAllEntriesForTimesheet = async (timesheetId) => {
  const all = [];
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments(dbId, timesheetEntriesCol, [
      Query.equal('timesheetId', timesheetId),
      Query.limit(LIST_PAGE_SIZE),
      Query.offset(offset),
    ]);

    all.push(...response.documents);

    if (response.documents.length < LIST_PAGE_SIZE) break;
    if (response.total && all.length >= response.total) break;
    offset += LIST_PAGE_SIZE;
  }

  return all;
};

const listTimesheetByGuardAndWeek = async (guardId, weekStart) => {
  const result = await databases.listDocuments(dbId, timesheetsCol, [
    Query.equal('guardId', guardId),
    Query.equal('weekStart', weekStart),
    Query.limit(2),
  ]);

  if (result.documents.length > 1) {
    throw new Error('Duplicate timesheets detected for guardId + weekStart.');
  }

  return result.documents[0] || null;
};

const getTimesheetOrThrow = async (timesheetId) => {
  return databases.getDocument(dbId, timesheetsCol, timesheetId);
};

const assertTimesheetEditable = (timesheet) => {
  const status = String(timesheet.status || 'open');
  if (status === 'approved' || status === 'locked') {
    throw new Error('Permission denied: approved/locked timesheets are immutable.');
  }
};

const ensureWorkDateWithinWeek = (workDateIso, timesheet) => {
  const workDate = parseIso(workDateIso, 'workDate');
  const weekStart = parseIso(timesheet.weekStart, 'timesheet.weekStart');
  const weekEnd = parseIso(timesheet.weekEnd, 'timesheet.weekEnd');

  if (workDate < weekStart || workDate > weekEnd) {
    throw new Error('workDate must be within the timesheet week range.');
  }
};

const ensureNoOpenEntry = async (guardId, excludeEntryId = null) => {
  const response = await databases.listDocuments(dbId, timesheetEntriesCol, [
    Query.equal('guardId', guardId),
    Query.equal('status', 'open'),
    Query.limit(5),
  ]);

  const conflict = response.documents.find((doc) => String(doc.$id) !== String(excludeEntryId || ''));
  if (conflict) {
    throw new Error('A guard can only have one open timesheet entry at a time.');
  }
};

const summarizeEntries = (entries) => {
  const summary = {
    totalMinutes: 0,
    totalPayMinutes: 0,
    clientBreakdown: {},
  };

  for (const entry of entries) {
    const worked = Number(entry.minutesWorked || 0);
    const payable = Number(entry.minutesPayable || 0);
    summary.totalMinutes += worked;
    summary.totalPayMinutes += payable;

    const key = `${entry.clientId || 'unknown'}::${entry.siteId || 'unknown'}`;
    if (!summary.clientBreakdown[key]) {
      summary.clientBreakdown[key] = {
        clientId: entry.clientId || null,
        siteId: entry.siteId || null,
        minutesWorked: 0,
        minutesPayable: 0,
        entryCount: 0,
      };
    }

    summary.clientBreakdown[key].minutesWorked += worked;
    summary.clientBreakdown[key].minutesPayable += payable;
    summary.clientBreakdown[key].entryCount += 1;
  }

  return summary;
};

const updateAllEntriesStatus = async (timesheetId, status, extra = {}) => {
  const entries = await listAllEntriesForTimesheet(timesheetId);
  for (const entry of entries) {
    await databases.updateDocument(dbId, timesheetEntriesCol, entry.$id, {
      status,
      ...extra,
      updatedAt: new Date().toISOString(),
    });
  }
};

const ensureStaffOwner = (scope, guardId) => {
  if (toRole(scope) === ROLES.STAFF && String(scope.userId || '') !== String(guardId || '')) {
    throw new Error('Permission denied: staff can only access their own timesheets.');
  }
};

const assertManagerCanOperateTimesheet = async (scope, entries) => {
  if (toRole(scope) !== ROLES.MANAGER) return true;
  if (!entries.length) {
    throw new Error('Permission denied: manager cannot approve/reject an empty timesheet.');
  }

  let matched = false;
  for (const entry of entries) {
    try {
      assertScopedAccess(RESOURCE_TYPES.TIMESHEET_ENTRIES, entry, scope);
      matched = true;
      break;
    } catch (_) {
      // continue
    }
  }

  if (!matched) {
    throw new Error('Permission denied: no timesheet entries are within manager scope.');
  }

  return true;
};

const maybeResolveShiftTenancy = async ({ shiftId, clientId, siteId, scope }) => {
  if (clientId && siteId) {
    return { clientId, siteId };
  }

  if (!shiftId) {
    throw new Error('clientId and siteId are required when shiftId is not provided.');
  }

  ensureDatabaseConfig(shiftsCol, 'shifts collection');
  const shift = await databases.getDocument(dbId, shiftsCol, shiftId);
  assertScopedAccess(RESOURCE_TYPES.SHIFTS, shift, scope);

  return {
    clientId: clientId || shift.clientId,
    siteId: siteId || shift.siteId,
  };
};

const reopenRejectedTimesheet = async (timesheet, actorId) => {
  if (String(timesheet.status || '') !== 'rejected') {
    return timesheet;
  }

  const updated = await databases.updateDocument(dbId, timesheetsCol, timesheet.$id, {
    status: 'open',
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: null,
    updatedAt: new Date().toISOString(),
  });

  await updateAllEntriesStatus(timesheet.$id, 'open', {
    rejectionReason: null,
    approvedAt: null,
    approvedBy: null,
  });

  await logEvent({
    actorId,
    action: 'TIMESHEET_REOPENED',
    resourceType: RESOURCE_TYPES.TIMESHEETS,
    resourceId: timesheet.$id,
    metadata: {
      previousStatus: 'rejected',
      reason: 'Entry edited after rejection',
    },
  });

  return updated;
};

export const getOrCreateTimesheet = async (guardId, weekStart, actor = null) => {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_TIME_TRACKING,
  });

  ensureStaffOwner(scope, guardId);

  const normalizedWeekStart = asDateOnlyIso(weekStart);
  if (!normalizedWeekStart) {
    throw new Error('weekStart is required.');
  }

  const existing = await listTimesheetByGuardAndWeek(guardId, normalizedWeekStart);
  if (existing) {
    return existing;
  }

  const { weekEnd } = getWeekRange(normalizedWeekStart);

  const nowIso = new Date().toISOString();
  const payload = {
    guardId,
    weekStart: normalizedWeekStart,
    weekEnd,
    status: 'open',
    totalMinutes: 0,
    totalPayMinutes: 0,
    clientBreakdown: {},
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const created = await databases.createDocument(dbId, timesheetsCol, ID.unique(), payload);

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'TIMESHEET_CREATED',
    resourceType: RESOURCE_TYPES.TIMESHEETS,
    resourceId: created.$id,
    metadata: { guardId, weekStart: normalizedWeekStart },
  });

  return created;
};

export const listMyTimesheets = async (guardId, { limit = DEFAULT_PAGE_LIMIT, cursor = null } = {}, actor = null) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_TIME_TRACKING,
  });

  ensureStaffOwner(scope, guardId);

  const queries = [
    Query.equal('guardId', guardId),
    Query.orderDesc('weekStart'),
    Query.limit(clampLimit(limit)),
  ];

  if (cursor) {
    queries.push(Query.cursorAfter(String(cursor)));
  }

  const response = await databases.listDocuments(dbId, timesheetsCol, queries);
  const last = response.documents[response.documents.length - 1] || null;

  return {
    documents: response.documents,
    total: response.total,
    nextCursor: response.documents.length >= clampLimit(limit) && last ? last.$id : null,
  };
};

export const listTimesheetEntries = async (timesheetId, actor = null) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_TIME_TRACKING,
  });

  const timesheet = await getTimesheetOrThrow(timesheetId);
  ensureStaffOwner(scope, timesheet.guardId);

  const entries = await listAllEntriesForTimesheet(timesheetId);

  if (toRole(scope) === ROLES.MANAGER) {
    const scopedEntries = entries.filter((entry) => {
      try {
        assertScopedAccess(RESOURCE_TYPES.TIMESHEET_ENTRIES, entry, scope);
        return true;
      } catch (_) {
        return false;
      }
    });

    if (scopedEntries.length === 0) {
      throw new Error('Permission denied: timesheet entries are outside manager scope.');
    }

    return scopedEntries.sort((a, b) => String(b.startAt || '').localeCompare(String(a.startAt || '')));
  }

  return entries.sort((a, b) => String(b.startAt || '').localeCompare(String(a.startAt || '')));
};

export const upsertEntry = async (entryPayload, actor = null) => {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_TIME_TRACKING,
  });

  const entryId = entryPayload?.entryId || entryPayload?.$id || null;
  const candidateGuardId = entryPayload?.guardId || resolvedActor.$id;
  ensureStaffOwner(scope, candidateGuardId);

  let timesheet = null;
  if (entryPayload?.timesheetId) {
    timesheet = await getTimesheetOrThrow(entryPayload.timesheetId);
  } else {
    const seedDate = entryPayload?.workDate || entryPayload?.startAt || new Date().toISOString();
    const { weekStart } = getWeekRange(seedDate);
    timesheet = await getOrCreateTimesheet(candidateGuardId, weekStart, resolvedActor);
  }

  ensureStaffOwner(scope, timesheet.guardId);
  assertTimesheetEditable(timesheet);

  if (toRole(scope) === ROLES.MANAGER) {
    throw new Error('Permission denied: managers can approve/reject timesheets but cannot edit entries.');
  }

  timesheet = await reopenRejectedTimesheet(timesheet, resolvedActor.$id);

  const tenancy = await maybeResolveShiftTenancy({
    shiftId: entryPayload?.shiftId || null,
    clientId: entryPayload?.clientId || null,
    siteId: entryPayload?.siteId || null,
    scope,
  });

  const startAt = entryPayload?.startAt || new Date().toISOString();
  const endAt = entryPayload?.endAt || null;
  const workDate = asDateOnlyIso(entryPayload?.workDate || startAt);
  ensureWorkDateWithinWeek(workDate, timesheet);

  const breakMinutes = normalizeBreakMinutes(entryPayload?.breakMinutes || 0);
  const minutesWorked = computeMinutesWorked(startAt, endAt);
  const minutesPayable = computePayableMinutes(minutesWorked, breakMinutes);

  if (!endAt) {
    await ensureNoOpenEntry(timesheet.guardId, entryId);
  }

  const payload = {
    timesheetId: timesheet.$id,
    guardId: timesheet.guardId,
    clientId: tenancy.clientId,
    siteId: tenancy.siteId,
    shiftId: entryPayload?.shiftId || null,
    workDate,
    startAt,
    endAt,
    breakMinutes,
    minutesWorked,
    minutesPayable,
    source: entryPayload?.source || 'manual',
    gpsMeta: entryPayload?.gpsMeta || null,
    status: 'open',
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
    notes: entryPayload?.notes || null,
    updatedAt: new Date().toISOString(),
  };

  enforceTenancyFields('timesheet_entries', payload);

  let result;
  if (entryId) {
    const existing = await databases.getDocument(dbId, timesheetEntriesCol, entryId);
    if (String(existing.timesheetId) !== String(timesheet.$id)) {
      throw new Error('Cannot move an entry between timesheets.');
    }

    if (String(existing.status || '') === 'approved') {
      throw new Error('Permission denied: approved entry is immutable.');
    }

    result = await databases.updateDocument(dbId, timesheetEntriesCol, entryId, payload);
  } else {
    result = await databases.createDocument(dbId, timesheetEntriesCol, ID.unique(), {
      ...payload,
      createdAt: new Date().toISOString(),
    });
  }

  await logEvent({
    actorId: resolvedActor.$id,
    action: entryId ? 'TIMESHEET_ENTRY_UPDATED' : 'TIMESHEET_ENTRY_CREATED',
    resourceType: RESOURCE_TYPES.TIMESHEET_ENTRIES,
    resourceId: result.$id,
    clientId: result.clientId,
    siteId: result.siteId,
    metadata: {
      timesheetId: result.timesheetId,
      minutesWorked,
      minutesPayable,
    },
  });

  return result;
};

export const clockIn = async ({ clientId, siteId, shiftId = null, gpsMeta = null } = {}, actor = null) => {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_TIME_TRACKING,
  });

  ensureStaffOwner(scope, resolvedActor.$id);

  await ensureNoOpenEntry(resolvedActor.$id);

  const nowIso = new Date().toISOString();
  const { weekStart } = getWeekRange(nowIso);
  let timesheet = await getOrCreateTimesheet(resolvedActor.$id, weekStart, resolvedActor);
  assertTimesheetEditable(timesheet);
  timesheet = await reopenRejectedTimesheet(timesheet, resolvedActor.$id);

  const tenancy = await maybeResolveShiftTenancy({ shiftId, clientId, siteId, scope });

  const entry = await databases.createDocument(dbId, timesheetEntriesCol, ID.unique(), {
    timesheetId: timesheet.$id,
    guardId: resolvedActor.$id,
    clientId: tenancy.clientId,
    siteId: tenancy.siteId,
    shiftId,
    workDate: toUkStartOfDayIso(nowIso),
    startAt: nowIso,
    endAt: null,
    breakMinutes: 0,
    minutesWorked: 0,
    minutesPayable: 0,
    source: 'gps_clock',
    gpsMeta,
    status: 'open',
    notes: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'TIMESHEET_CLOCK_IN',
    resourceType: RESOURCE_TYPES.TIMESHEET_ENTRIES,
    resourceId: entry.$id,
    clientId: tenancy.clientId,
    siteId: tenancy.siteId,
    metadata: { timesheetId: timesheet.$id, shiftId },
  });

  return entry;
};

export const clockOut = async ({ entryId, gpsMeta = null } = {}, actor = null) => {
  ensureCollections();

  if (!entryId) {
    throw new Error('entryId is required for clockOut.');
  }

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_TIME_TRACKING,
  });

  const entry = await databases.getDocument(dbId, timesheetEntriesCol, entryId);
  ensureStaffOwner(scope, entry.guardId);

  if (entry.endAt) {
    throw new Error('Entry is already clocked out.');
  }

  const timesheet = await getTimesheetOrThrow(entry.timesheetId);
  assertTimesheetEditable(timesheet);

  const endAt = new Date().toISOString();
  const breakMinutes = normalizeBreakMinutes(entry.breakMinutes || 0);
  const minutesWorked = computeMinutesWorked(entry.startAt, endAt);
  const minutesPayable = computePayableMinutes(minutesWorked, breakMinutes);

  const updated = await databases.updateDocument(dbId, timesheetEntriesCol, entry.$id, {
    endAt,
    minutesWorked,
    minutesPayable,
    gpsMeta: gpsMeta || entry.gpsMeta || null,
    updatedAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'TIMESHEET_CLOCK_OUT',
    resourceType: RESOURCE_TYPES.TIMESHEET_ENTRIES,
    resourceId: updated.$id,
    clientId: updated.clientId,
    siteId: updated.siteId,
    metadata: {
      timesheetId: updated.timesheetId,
      minutesWorked,
      minutesPayable,
    },
  });

  return updated;
};

export const submitTimesheet = async (timesheetId, actor = null) => {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_TIME_TRACKING,
  });

  const timesheet = await getTimesheetOrThrow(timesheetId);
  ensureStaffOwner(scope, timesheet.guardId);

  if (String(timesheet.guardId) !== String(resolvedActor.$id)) {
    throw new Error('Permission denied: only the owner guard can submit this timesheet.');
  }

  assertTimesheetEditable(timesheet);

  const entries = await listAllEntriesForTimesheet(timesheetId);
  if (entries.length === 0) {
    throw new Error('Cannot submit an empty timesheet.');
  }

  for (const entry of entries) {
    if (!entry.endAt) {
      throw new Error('All entries must be clocked out before submission.');
    }
  }

  const summary = summarizeEntries(entries);
  const nowIso = new Date().toISOString();

  const updated = await databases.updateDocument(dbId, timesheetsCol, timesheetId, {
    status: 'submitted',
    submittedAt: nowIso,
    submittedBy: resolvedActor.$id,
    totalMinutes: summary.totalMinutes,
    totalPayMinutes: summary.totalPayMinutes,
    clientBreakdown: summary.clientBreakdown,
    updatedAt: nowIso,
  });

  await updateAllEntriesStatus(timesheetId, 'submitted', {
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'TIMESHEET_SUBMITTED',
    resourceType: RESOURCE_TYPES.TIMESHEETS,
    resourceId: updated.$id,
    metadata: {
      totalMinutes: summary.totalMinutes,
      totalPayMinutes: summary.totalPayMinutes,
      entryCount: entries.length,
    },
  });

  try {
    await notifyTimesheetSubmitted({
      guardId: updated.guardId,
      staffName: resolvedActor.name || resolvedActor.profile?.fullName || resolvedActor.email || updated.guardId,
      weekStart: updated.weekStart,
      weekEnd: updated.weekEnd,
      totalPayHours: Number(updated.totalPayMinutes || 0) / 60,
      userId: updated.guardId,
    });
  } catch (notifyError) {
    console.error('[timesheetService] Failed to enqueue timesheetSubmitted notification:', notifyError);
  }

  return updated;
};

export const listApprovalQueue = async (
  actor = null,
  { weekStart = null, status = 'submitted', filters = {}, limit = DEFAULT_PAGE_LIMIT, cursor = null } = {},
) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.MANAGE_SHIFTS,
  });

  const safeLimit = clampLimit(limit);

  if (toRole(scope) === ROLES.ADMIN) {
    const queries = [
      Query.equal('status', String(status || 'submitted')),
      Query.orderDesc('weekStart'),
      Query.limit(safeLimit),
    ];

    if (weekStart) queries.push(Query.equal('weekStart', asDateOnlyIso(weekStart)));
    if (cursor) queries.push(Query.cursorAfter(String(cursor)));
    if (filters?.guardId) queries.push(Query.equal('guardId', String(filters.guardId)));

    const response = await databases.listDocuments(dbId, timesheetsCol, queries);
    const last = response.documents[response.documents.length - 1] || null;

    return {
      documents: response.documents,
      total: response.total,
      nextCursor: response.documents.length >= safeLimit && last ? last.$id : null,
    };
  }

  if (toRole(scope) !== ROLES.MANAGER) {
    throw new Error('Permission denied: only admin/manager can access approval queue.');
  }

  const managerQueries = [
    Query.equal('status', String(status || 'submitted')),
    Query.orderDesc('startAt'),
    Query.limit(Math.min(safeLimit * 5, MAX_PAGE_LIMIT)),
  ];

  if (cursor) managerQueries.push(Query.cursorAfter(String(cursor)));
  if (filters?.guardId) managerQueries.push(Query.equal('guardId', String(filters.guardId)));
  if (filters?.clientId) managerQueries.push(Query.equal('clientId', String(filters.clientId)));
  if (filters?.siteId) managerQueries.push(Query.equal('siteId', String(filters.siteId)));

  managerQueries.push(...scopeQueries(RESOURCE_TYPES.TIMESHEET_ENTRIES, scope));

  const entriesPage = await databases.listDocuments(dbId, timesheetEntriesCol, managerQueries);
  const timesheetIds = Array.from(new Set(entriesPage.documents.map((entry) => entry.timesheetId).filter(Boolean)));

  if (timesheetIds.length === 0) {
    return {
      documents: [],
      total: 0,
      nextCursor: null,
    };
  }

  const timesheets = [];
  for (const ids of chunk(timesheetIds, 100)) {
    const page = await databases.listDocuments(dbId, timesheetsCol, [Query.equal('$id', ids), Query.limit(ids.length)]);
    timesheets.push(...page.documents);
  }

  const filtered = timesheets
    .filter((item) => (weekStart ? String(item.weekStart || '') === String(asDateOnlyIso(weekStart)) : true))
    .filter((item) => String(item.status || '') === String(status || 'submitted'))
    .sort((a, b) => String(b.weekStart || '').localeCompare(String(a.weekStart || '')))
    .slice(0, safeLimit);

  const lastEntry = entriesPage.documents[entriesPage.documents.length - 1] || null;

  return {
    documents: filtered,
    total: filtered.length,
    nextCursor: entriesPage.documents.length >= Math.min(safeLimit * 5, MAX_PAGE_LIMIT) && lastEntry ? lastEntry.$id : null,
  };
};

export const approveTimesheet = async (timesheetId, actor = null) => {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.MANAGE_SHIFTS,
  });

  const timesheet = await getTimesheetOrThrow(timesheetId);
  if (String(timesheet.status || '') !== 'submitted') {
    throw new Error('Only submitted timesheets can be approved.');
  }

  const entries = await listAllEntriesForTimesheet(timesheetId);
  await assertManagerCanOperateTimesheet(scope, entries);

  const nowIso = new Date().toISOString();
  const approved = await databases.updateDocument(dbId, timesheetsCol, timesheetId, {
    status: 'locked',
    approvedAt: nowIso,
    approvedBy: resolvedActor.$id,
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: null,
    updatedAt: nowIso,
  });

  await updateAllEntriesStatus(timesheetId, 'approved', {
    approvedAt: nowIso,
    approvedBy: resolvedActor.$id,
    rejectionReason: null,
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'TIMESHEET_APPROVED',
    resourceType: RESOURCE_TYPES.TIMESHEETS,
    resourceId: approved.$id,
    metadata: {
      transition: ['submitted', 'approved', 'locked'],
      entryCount: entries.length,
    },
  });

  try {
    await notifyTimesheetApproved(approved.guardId, approved);
  } catch (notifyError) {
    console.error('[timesheetService] Failed to enqueue timesheetApproved notification:', notifyError);
  }

  return approved;
};

export const rejectTimesheet = async (timesheetId, reason, actor = null) => {
  ensureCollections();

  if (!reason || !String(reason).trim()) {
    throw new Error('Rejection reason is required.');
  }

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.MANAGE_SHIFTS,
  });

  const timesheet = await getTimesheetOrThrow(timesheetId);
  if (String(timesheet.status || '') !== 'submitted') {
    throw new Error('Only submitted timesheets can be rejected.');
  }

  const entries = await listAllEntriesForTimesheet(timesheetId);
  await assertManagerCanOperateTimesheet(scope, entries);

  const nowIso = new Date().toISOString();
  const rejected = await databases.updateDocument(dbId, timesheetsCol, timesheetId, {
    status: 'rejected',
    rejectedAt: nowIso,
    rejectedBy: resolvedActor.$id,
    rejectionReason: String(reason).trim(),
    approvedAt: null,
    approvedBy: null,
    updatedAt: nowIso,
  });

  await updateAllEntriesStatus(timesheetId, 'rejected', {
    approvedAt: null,
    approvedBy: null,
    rejectionReason: String(reason).trim(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'TIMESHEET_REJECTED',
    resourceType: RESOURCE_TYPES.TIMESHEETS,
    resourceId: rejected.$id,
    metadata: {
      reason: String(reason).trim(),
      entryCount: entries.length,
    },
  });

  try {
    await notifyTimesheetRejected(rejected.guardId, rejected, String(reason).trim());
  } catch (notifyError) {
    console.error('[timesheetService] Failed to enqueue timesheetRejected notification:', notifyError);
  }

  return rejected;
};

export const getTimesheetById = async (timesheetId, actor = null) => {
  ensureCollections();

  const { scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.VIEW_TIME_TRACKING,
  });

  const timesheet = await getTimesheetOrThrow(timesheetId);

  if (toRole(scope) === ROLES.STAFF) {
    ensureStaffOwner(scope, timesheet.guardId);
    return timesheet;
  }

  if (toRole(scope) === ROLES.ADMIN) {
    return timesheet;
  }

  if (toRole(scope) === ROLES.MANAGER) {
    const entries = await listAllEntriesForTimesheet(timesheetId);
    await assertManagerCanOperateTimesheet(scope, entries);
    return timesheet;
  }

  assertScopedDocument(RESOURCE_TYPES.TIMESHEETS, timesheet, scope);
  return timesheet;
};
