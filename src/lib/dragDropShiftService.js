/**
 * Drag-and-Drop Schedule Service
 * Handles all database operations for shifts with the drag-drop UI
 */

import { databases, config } from './appwrite';
import { Query } from 'appwrite';
import { toISO, fromISO } from './date';

export const SHIFTS_COLLECTION_ID = config.shiftsCollectionId;
export const DATABASE_ID = config.databaseId;

const ensureConfigured = () => {
  const missing = [];
  if (!DATABASE_ID) missing.push('VITE_APPWRITE_DATABASE_ID');
  if (!SHIFTS_COLLECTION_ID) missing.push('VITE_APPWRITE_SHIFTS_COLLECTION_ID');
  if (!config.projectId) missing.push('VITE_APPWRITE_PROJECT_ID');
  if (!config.endpoint) missing.push('VITE_APPWRITE_ENDPOINT');
  if (config.isDemoMode) {
    throw new Error('Scheduling backend disabled: demo mode is ON. Set VITE_ENABLE_DEMO_MODE=false and configure Appwrite env vars in Vercel.');
  }
  if (!databases) {
    throw new Error('Scheduling backend unavailable (Appwrite client not initialized). Check Vercel env vars and Appwrite Web Platform origins.');
  }
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}. Configure these in Vercel project settings.`);
  }
};

const toDayBoundsISO = (dateString) => {
  const start = new Date(`${dateString}T00:00:00.000Z`);
  const end = new Date(`${dateString}T23:59:59.999Z`);
  return { start: toISO(start), end: toISO(end) };
};

const normalizeShift = (doc) => ({
  ...doc,
  date: doc.startTime ? doc.startTime.slice(0, 10) : '',
});

export const fetchShiftsForDate = async (date) => {
  try {
    ensureConfigured();
    const { start, end } = toDayBoundsISO(date);
    const response = await databases.listDocuments(DATABASE_ID, SHIFTS_COLLECTION_ID, [
      Query.greaterThanEqual('startTime', start),
      Query.lessThanEqual('startTime', end),
      Query.orderAsc('startTime'),
    ]);
    return response.documents.map(normalizeShift);
  } catch (error) {
    console.error('Error fetching shifts for date:', error);
    throw error;
  }
};

export const fetchShiftsForDateRange = async (startDate, endDate) => {
  try {
    ensureConfigured();
    const { start } = toDayBoundsISO(startDate);
    const { end } = toDayBoundsISO(endDate);
    const response = await databases.listDocuments(DATABASE_ID, SHIFTS_COLLECTION_ID, [
      Query.greaterThanEqual('startTime', start),
      Query.lessThanEqual('startTime', end),
      Query.orderAsc('startTime'),
      Query.limit(500),
    ]);
    return response.documents.map(normalizeShift);
  } catch (error) {
    console.error('Error fetching shifts for date range:', error);
    throw error;
  }
};

export const fetchSiteShifts = async (siteId, startDate, endDate) => {
  try {
    ensureConfigured();
    const { start } = toDayBoundsISO(startDate);
    const { end } = toDayBoundsISO(endDate);
    const response = await databases.listDocuments(DATABASE_ID, SHIFTS_COLLECTION_ID, [
      Query.equal('siteId', siteId),
      Query.greaterThanEqual('startTime', start),
      Query.lessThanEqual('startTime', end),
      Query.orderAsc('startTime'),
    ]);
    return response.documents.map(normalizeShift);
  } catch (error) {
    console.error('Error fetching site shifts:', error);
    throw error;
  }
};

export const fetchStaffShifts = async (staffId, startDate, endDate) => {
  try {
    ensureConfigured();
    const { start } = toDayBoundsISO(startDate);
    const { end } = toDayBoundsISO(endDate);
    const response = await databases.listDocuments(DATABASE_ID, SHIFTS_COLLECTION_ID, [
      Query.equal('staffId', staffId),
      Query.greaterThanEqual('startTime', start),
      Query.lessThanEqual('startTime', end),
      Query.orderAsc('startTime'),
    ]);
    return response.documents.map(normalizeShift);
  } catch (error) {
    console.error('Error fetching staff shifts:', error);
    throw error;
  }
};

const buildShiftTimes = (shiftData) => {
  if (shiftData.startTime?.includes('T') && shiftData.endTime?.includes('T')) {
    return { startTime: shiftData.startTime, endTime: shiftData.endTime };
  }

  if (!shiftData.date || !shiftData.startTime || !shiftData.endTime) {
    throw new Error('Shift requires date, startTime, and endTime');
  }

  return {
    startTime: toISO(new Date(`${shiftData.date}T${shiftData.startTime}:00.000Z`)),
    endTime: toISO(new Date(`${shiftData.date}T${shiftData.endTime}:00.000Z`)),
  };
};

export const createShift = async (shiftData) => {
  try {
    ensureConfigured();
    const docId = `shift_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const { startTime, endTime } = buildShiftTimes(shiftData);

    return await databases.createDocument(DATABASE_ID, SHIFTS_COLLECTION_ID, docId, {
      shiftId: shiftData.shiftId || docId,
      startTime,
      endTime,
      title: shiftData.title || 'Shift',
      description: shiftData.description || '',
      status: shiftData.status || 'active',
      siteId: shiftData.siteId,
      staffId: shiftData.staffId || null,
      notes: shiftData.notes || '',
      createdAt: toISO(new Date()),
      updatedAt: toISO(new Date()),
      ...shiftData,
      startTime,
      endTime,
    });
  } catch (error) {
    console.error('Error creating shift:', error);
    throw error;
  }
};

export const updateShift = async (shiftId, updates) => {
  try {
    ensureConfigured();
    return await databases.updateDocument(DATABASE_ID, SHIFTS_COLLECTION_ID, shiftId, {
      ...updates,
      updatedAt: toISO(new Date()),
    });
  } catch (error) {
    console.error('Error updating shift:', error);
    throw error;
  }
};

export const deleteShift = async (shiftId) => {
  try {
    ensureConfigured();
    await databases.deleteDocument(DATABASE_ID, SHIFTS_COLLECTION_ID, shiftId);
  } catch (error) {
    console.error('Error deleting shift:', error);
    throw error;
  }
};

export const bulkUpdateShifts = async (shifts) => {
  try {
    ensureConfigured();
    const updates = shifts
      .filter((shift) => shift.$id && !shift.$id.startsWith('shift_temp'))
      .map((shift) =>
        updateShift(shift.$id, {
          startTime: shift.startTime,
          endTime: shift.endTime,
          title: shift.title,
          description: shift.description,
          staffId: shift.staffId,
          status: shift.status,
        })
      );

    const results = await Promise.allSettled(updates);
    return results.filter((r) => r.status === 'fulfilled').length;
  } catch (error) {
    console.error('Error bulk updating shifts:', error);
    throw error;
  }
};

export const saveShiftChanges = async (originalShifts, updatedShifts) => {
  try {
    ensureConfigured();
    const toCreate = updatedShifts.filter((s) => !s.$id);
    const toUpdate = updatedShifts.filter((s) => s.$id && originalShifts.find((o) => o.$id === s.$id));
    const toDelete = originalShifts.filter((s) => !updatedShifts.find((u) => u.$id === s.$id));

    const createPromises = toCreate.map((shift) => createShift(shift));
    const updatePromises = toUpdate.map((shift) => {
      const original = originalShifts.find((o) => o.$id === shift.$id);
      const changes = {};
      if (original.startTime !== shift.startTime) changes.startTime = shift.startTime;
      if (original.endTime !== shift.endTime) changes.endTime = shift.endTime;
      if (original.title !== shift.title) changes.title = shift.title;
      if (original.description !== shift.description) changes.description = shift.description;
      if (original.staffId !== shift.staffId) changes.staffId = shift.staffId;
      if (Object.keys(changes).length > 0) return updateShift(shift.$id, changes);
      return Promise.resolve(null);
    });

    const deletePromises = toDelete.map((shift) => deleteShift(shift.$id));
    const results = await Promise.allSettled([...createPromises, ...updatePromises, ...deletePromises]);
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return { success: failed === 0, created: toCreate.length, updated: toUpdate.length, deleted: toDelete.length, successful, failed };
  } catch (error) {
    console.error('Error saving shift changes:', error);
    throw error;
  }
};

export const getShiftStats = async (startDate, endDate, siteId = null) => {
  try {
    ensureConfigured();
    const { start } = toDayBoundsISO(startDate);
    const { end } = toDayBoundsISO(endDate);
    const query = [Query.greaterThanEqual('startTime', start), Query.lessThanEqual('startTime', end)];
    if (siteId) query.push(Query.equal('siteId', siteId));

    const response = await databases.listDocuments(DATABASE_ID, SHIFTS_COLLECTION_ID, query);
    const shifts = response.documents;
    const stats = { total: shifts.length, byStatus: {}, byDate: {}, totalHours: 0, staffCoverage: new Set() };

    shifts.forEach((shift) => {
      stats.byStatus[shift.status] = (stats.byStatus[shift.status] || 0) + 1;
      const day = shift.startTime?.slice(0, 10) || 'unknown';
      stats.byDate[day] = (stats.byDate[day] || 0) + 1;
      try {
        const hours = (fromISO(shift.endTime).getTime() - fromISO(shift.startTime).getTime()) / (1000 * 60 * 60);
        stats.totalHours += Math.max(0, hours);
      } catch (error) {
        console.error('Invalid shift time while calculating stats', error);
      }
      if (shift.staffId) stats.staffCoverage.add(shift.staffId);
    });

    stats.staffCoverage = stats.staffCoverage.size;
    return stats;
  } catch (error) {
    console.error('Error getting shift stats:', error);
    throw error;
  }
};

export const transformShiftsForDragDrop = (appwriteShifts) => appwriteShifts.map((shift) => ({
  $id: shift.$id,
  date: shift.startTime ? shift.startTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
  startTime: shift.startTime,
  endTime: shift.endTime,
  title: shift.title || 'Shift',
  description: shift.description || '',
  status: shift.status || 'active',
  siteId: shift.siteId,
  staffId: shift.staffId,
  notes: shift.notes || '',
  ...shift,
}));

export const validateShiftForSave = (shift) => {
  const errors = [];
  if (!shift.startTime) errors.push('Start time is required');
  if (!shift.endTime) errors.push('End time is required');

  if (shift.startTime) {
    try { fromISO(shift.startTime); } catch { errors.push('Invalid startTime ISO format'); }
  }
  if (shift.endTime) {
    try { fromISO(shift.endTime); } catch { errors.push('Invalid endTime ISO format'); }
  }
  if (shift.startTime && shift.endTime && fromISO(shift.startTime) >= fromISO(shift.endTime)) {
    errors.push('End time must be after start time');
  }

  return { valid: errors.length === 0, errors };
};

export const exportShiftsToJSON = (shifts) => {
  const dataStr = JSON.stringify(shifts, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `schedule-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
};

export const importShiftsFromJSON = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const shifts = JSON.parse(e.target.result);
      if (Array.isArray(shifts)) resolve(shifts);
      else reject(new Error('Invalid JSON format - expected an array'));
    } catch (error) {
      reject(new Error(`Failed to parse JSON: ${error.message}`));
    }
  };
  reader.onerror = () => reject(new Error('Failed to read file'));
  reader.readAsText(file);
});
