/**
 * Drag-and-Drop Schedule Service
 * Handles all database operations for shifts with the drag-drop UI
 */

import { databases, config } from './appwrite';
import { Query } from 'appwrite';

// Collection IDs
export const SHIFTS_COLLECTION_ID = config.shiftsCollectionId;
export const DATABASE_ID = config.databaseId;

// Ensure backend is configured; throws with actionable guidance when not
const ensureConfigured = () => {
  const missing = [];
  if (!DATABASE_ID) missing.push('VITE_APPWRITE_DATABASE_ID');
  if (!SHIFTS_COLLECTION_ID) missing.push('VITE_APPWRITE_SHIFTS_COLLECTION_ID');
  if (!config.projectId) missing.push('VITE_APPWRITE_PROJECT_ID');
  if (!config.endpoint) missing.push('VITE_APPWRITE_ENDPOINT');
  if (config.isDemoMode) {
    throw new Error(
      'Scheduling backend disabled: demo mode is ON. Set VITE_ENABLE_DEMO_MODE=false and configure Appwrite env vars in Vercel.'
    );
  }
  if (!databases) {
    throw new Error(
      'Scheduling backend unavailable (Appwrite client not initialized). Check Vercel env vars and Appwrite Web Platform origins.'
    );
  }
  if (missing.length) {
    throw new Error(
      `Missing required env vars: ${missing.join(', ')}. Configure these in Vercel project settings.`
    );
  }
};

// Fetch shifts for a specific date (uses 'shiftDate' in DB, maps to 'date' for UI)
export const fetchShiftsForDate = async (date) => {
  try {
    ensureConfigured();
    const response = await databases.listDocuments(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      [
        Query.equal('shiftDate', date),
        Query.orderAsc('startTime'),
      ]
    );
    return response.documents.map(doc => ({
      ...doc,
      date: doc.shiftDate || doc.date || date,
    }));
  } catch (error) {
    console.error('Error fetching shifts for date:', error);
    throw error;
  }
};

// Fetch shifts for a date range (uses 'shiftDate' in DB)
export const fetchShiftsForDateRange = async (startDate, endDate) => {
  try {
    ensureConfigured();
    const response = await databases.listDocuments(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      [
        Query.greaterThanEqual('shiftDate', startDate),
        Query.lessThanEqual('shiftDate', endDate),
        Query.orderAsc('shiftDate'),
        Query.limit(500),
      ]
    );
    return response.documents.map(doc => ({
      ...doc,
      date: doc.shiftDate || doc.date,
    }));
  } catch (error) {
    console.error('Error fetching shifts for date range:', error);
    throw error;
  }
};

// Fetch shifts for a specific site (uses 'shiftDate' in DB)
export const fetchSiteShifts = async (siteId, startDate, endDate) => {
  try {
    ensureConfigured();
    const response = await databases.listDocuments(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      [
        Query.equal('siteId', siteId),
        Query.greaterThanEqual('shiftDate', startDate),
        Query.lessThanEqual('shiftDate', endDate),
        Query.orderAsc('shiftDate'),
      ]
    );
    return response.documents.map(doc => ({
      ...doc,
      date: doc.shiftDate || doc.date,
    }));
  } catch (error) {
    console.error('Error fetching site shifts:', error);
    throw error;
  }
};

// Fetch shifts for a staff member (uses 'shiftDate' in DB)
export const fetchStaffShifts = async (staffId, startDate, endDate) => {
  try {
    ensureConfigured();
    const response = await databases.listDocuments(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      [
        Query.equal('staffId', staffId),
        Query.greaterThanEqual('shiftDate', startDate),
        Query.lessThanEqual('shiftDate', endDate),
        Query.orderAsc('shiftDate'),
      ]
    );
    return response.documents.map(doc => ({
      ...doc,
      date: doc.shiftDate || doc.date,
    }));
  } catch (error) {
    console.error('Error fetching staff shifts:', error);
    throw error;
  }
};

// Create a new shift (stores 'shiftDate' in DB, maps UI 'date')
export const createShift = async (shiftData) => {
  try {
    ensureConfigured();
    // Use existing Appwrite shift collection
    const docId = `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const response = await databases.createDocument(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      docId,
      {
        shiftDate: shiftData.date || shiftData.shiftDate,
        startTime: shiftData.startTime,
        endTime: shiftData.endTime,
        title: shiftData.title || 'Shift',
        description: shiftData.description || '',
        status: shiftData.status || 'active',
        siteId: shiftData.siteId,
        staffId: shiftData.staffId || null,
        notes: shiftData.notes || '',
        // Preserve other fields if they exist
        ...shiftData,
      }
    );
    return response;
  } catch (error) {
    console.error('Error creating shift:', error);
    throw error;
  }
};

// Update an existing shift
export const updateShift = async (shiftId, updates) => {
  try {
    ensureConfigured();
    const response = await databases.updateDocument(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      shiftId,
      updates
    );
    return response;
  } catch (error) {
    console.error('Error updating shift:', error);
    throw error;
  }
};

// Delete a shift
export const deleteShift = async (shiftId) => {
  try {
    ensureConfigured();
    await databases.deleteDocument(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      shiftId
    );
  } catch (error) {
    console.error('Error deleting shift:', error);
    throw error;
  }
};

// Bulk update shifts (optimized for drag-drop operations)
export const bulkUpdateShifts = async (shifts) => {
  try {
    ensureConfigured();
    const updates = shifts
      .filter(shift => shift.$id && !shift.$id.startsWith('shift_temp'))
      .map(shift =>
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
    return results.filter(r => r.status === 'fulfilled').length;
  } catch (error) {
    console.error('Error bulk updating shifts:', error);
    throw error;
  }
};

// Save shift changes (create or update as needed)
export const saveShiftChanges = async (originalShifts, updatedShifts, currentDate) => {
  try {
    ensureConfigured();
    const toCreate = updatedShifts.filter(s => !s.$id);
    const toUpdate = updatedShifts.filter(
      s => s.$id && originalShifts.find(o => o.$id === s.$id)
    );
    const toDelete = originalShifts.filter(
      s => !updatedShifts.find(u => u.$id === s.$id)
    );

    // Create new shifts
    const createPromises = toCreate.map(shift => createShift(shift));
    
    // Update modified shifts
    const updatePromises = toUpdate.map(shift => {
      const original = originalShifts.find(o => o.$id === shift.$id);
      const changes = {};
      
      if (original.startTime !== shift.startTime) changes.startTime = shift.startTime;
      if (original.endTime !== shift.endTime) changes.endTime = shift.endTime;
      if (original.title !== shift.title) changes.title = shift.title;
      if (original.description !== shift.description) changes.description = shift.description;
      if (original.staffId !== shift.staffId) changes.staffId = shift.staffId;
      
      if (Object.keys(changes).length > 0) {
        return updateShift(shift.$id, changes);
      }
      return Promise.resolve(null);
    });

    // Delete removed shifts
    const deletePromises = toDelete.map(shift => deleteShift(shift.$id));

    const results = await Promise.allSettled([
      ...createPromises,
      ...updatePromises,
      ...deletePromises,
    ]);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      success: failed === 0,
      created: toCreate.length,
      updated: toUpdate.length,
      deleted: toDelete.length,
      successful,
      failed,
    };
  } catch (error) {
    console.error('Error saving shift changes:', error);
    throw error;
  }
};

// Get shift statistics for a date range (uses 'shiftDate')
export const getShiftStats = async (startDate, endDate, siteId = null) => {
  try {
    ensureConfigured();
    let query = [
      Query.greaterThanEqual('shiftDate', startDate),
      Query.lessThanEqual('shiftDate', endDate),
    ];

    if (siteId) {
      query.push(Query.equal('siteId', siteId));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      query
    );

    const shifts = response.documents;
    const stats = {
      total: shifts.length,
      byStatus: {},
      byDate: {},
      totalHours: 0,
      staffCoverage: new Set(),
    };

    shifts.forEach(shift => {
      // Count by status
      if (!stats.byStatus[shift.status]) {
        stats.byStatus[shift.status] = 0;
      }
      stats.byStatus[shift.status]++;

      // Count by date
      const d = shift.shiftDate || shift.date;
      if (!stats.byDate[d]) {
        stats.byDate[d] = 0;
      }
      stats.byDate[d]++;

      // Calculate hours
      const start = parseInt(shift.startTime.split(':')[0]);
      const end = parseInt(shift.endTime.split(':')[0]);
      stats.totalHours += end - start;

      // Track staff coverage
      if (shift.staffId) {
        stats.staffCoverage.add(shift.staffId);
      }
    });

    stats.staffCoverage = stats.staffCoverage.size;

    return stats;
  } catch (error) {
    console.error('Error getting shift stats:', error);
    throw error;
  }
};

// Transform Appwrite shifts to drag-drop format (map 'shiftDate' -> 'date')
export const transformShiftsForDragDrop = (appwriteShifts) => {
  return appwriteShifts.map(shift => ({
    $id: shift.$id,
    date: shift.shiftDate || shift.date || new Date().toISOString().split('T')[0],
    startTime: shift.startTime,
    endTime: shift.endTime,
    title: shift.title || 'Shift',
    description: shift.description || '',
    status: shift.status || 'active',
    siteId: shift.siteId,
    staffId: shift.staffId,
    notes: shift.notes || '',
    // Preserve original fields
    ...shift,
  }));
};

// Validate shift before saving
export const validateShiftForSave = (shift) => {
  const errors = [];

  if (!shift.date) errors.push('Date is required');
  if (!shift.startTime) errors.push('Start time is required');
  if (!shift.endTime) errors.push('End time is required');
  // Site is recommended but not strictly required for basic scheduling interactions
  // if (!shift.siteId) errors.push('Site is required');

  // Validate time format
  if (shift.startTime && !/^\d{2}:\d{2}$/.test(shift.startTime)) {
    errors.push('Invalid start time format (use HH:MM)');
  }
  if (shift.endTime && !/^\d{2}:\d{2}$/.test(shift.endTime)) {
    errors.push('Invalid end time format (use HH:MM)');
  }

  // Validate date format
  if (shift.date && !/^\d{4}-\d{2}-\d{2}$/.test(shift.date)) {
    errors.push('Invalid date format (use YYYY-MM-DD)');
  }

  // Validate end time is after start time
  if (shift.startTime && shift.endTime) {
    const startMinutes = parseInt(shift.startTime.split(':').join(''));
    const endMinutes = parseInt(shift.endTime.split(':').join(''));
    if (startMinutes >= endMinutes) {
      errors.push('End time must be after start time');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Export shifts as JSON
export const exportShiftsToJSON = (shifts) => {
  const dataStr = JSON.stringify(shifts, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `schedule-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
};

// Import shifts from JSON
export const importShiftsFromJSON = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const shifts = JSON.parse(e.target.result);
        if (Array.isArray(shifts)) {
          resolve(shifts);
        } else {
          reject(new Error('Invalid JSON format - expected an array'));
        }
      } catch (error) {
        reject(new Error(`Failed to parse JSON: ${error.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
