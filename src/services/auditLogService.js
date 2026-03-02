import { ID } from 'appwrite';
import { databases, config } from '../lib/appwrite.js';

const retryQueue = [];
let retryTimer = null;

const scheduleRetry = () => {
  if (retryTimer) return;

  retryTimer = setTimeout(async () => {
    retryTimer = null;

    if (retryQueue.length === 0) return;

    const nextBatch = retryQueue.splice(0, retryQueue.length);
    for (const item of nextBatch) {
      try {
        await persistEvent(item.payload);
      } catch (error) {
        if (item.attempts < 3) {
          retryQueue.push({ payload: item.payload, attempts: item.attempts + 1 });
        }
        await reportFailure(error, item.payload);
      }
    }

    if (retryQueue.length > 0) {
      scheduleRetry();
    }
  }, 1500);
};

const reportFailure = async (error, payload) => {
  console.error('[auditLogService] Failed to persist audit event', error, payload);

  try {
    await fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'audit-log-service',
        error: error?.message || String(error),
        payload,
        at: new Date().toISOString(),
      }),
    });
  } catch (fetchError) {
    console.error('[auditLogService] Failed to report audit failure via /api/log-error', fetchError);
  }
};

const persistEvent = async ({
  actorId,
  action,
  resourceType,
  resourceId,
  clientId = null,
  siteId = null,
  metadata = {},
}) => {
  if (config.isDemoMode || !databases || !config.databaseId || !config.auditLogsCollectionId) {
    return null;
  }

  return databases.createDocument(
    config.databaseId,
    config.auditLogsCollectionId,
    ID.unique(),
    {
      actorId,
      action,
      resourceType,
      entity: resourceType,
      entityId: resourceId || null,
      clientId,
      siteId,
      metadataJson: JSON.stringify(metadata || {}),
      createdAt: new Date().toISOString(),
    }
  );
};

export const logEvent = async ({
  actorId,
  action,
  resourceType,
  resourceId,
  clientId = null,
  siteId = null,
  metadata = {},
}) => {
  const payload = {
    actorId,
    action,
    resourceType,
    resourceId,
    clientId,
    siteId,
    metadata,
  };

  try {
    return await persistEvent(payload);
  } catch (error) {
    await reportFailure(error, payload);
    retryQueue.push({ payload, attempts: 1 });
    scheduleRetry();
    return null;
  }
};
