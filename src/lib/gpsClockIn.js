/**
 * GPS Clock-In/Out System
 * Location-verified time tracking with geofencing
 */

import { createAuditLog, AUDIT_CATEGORY, AUDIT_ACTION } from './auditLog';

// Geofence radius in meters
export const GEOFENCE_RADIUS = 100; // 100 meters

export const CLOCK_STATUS = {
  CLOCKED_OUT: 'clocked_out',
  CLOCKED_IN: 'clocked_in',
  ON_BREAK: 'on_break',
};

export const LOCATION_ACCURACY = {
  HIGH: 'high',       // <10m
  MEDIUM: 'medium',   // 10-50m
  LOW: 'low',         // >50m
  UNAVAILABLE: 'unavailable',
};

/**
 * Get user's current GPS position
 * @returns {Promise<Object>} Position data
 */
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Check if current location is within geofence
 * @param {Object} currentLocation - Current GPS position
 * @param {Object} siteLocation - Site GPS position
 * @param {number} radius - Geofence radius in meters
 * @returns {Object} Verification result
 */
export const verifyGeofence = (currentLocation, siteLocation, radius = GEOFENCE_RADIUS) => {
  const distance = calculateDistance(
    currentLocation.latitude,
    currentLocation.longitude,
    siteLocation.latitude,
    siteLocation.longitude
  );

  const withinGeofence = distance <= radius;
  const accuracy = getLocationAccuracy(currentLocation.accuracy);

  return {
    withinGeofence,
    distance: Math.round(distance),
    radius,
    accuracy,
    verified: withinGeofence && accuracy !== LOCATION_ACCURACY.UNAVAILABLE,
    message: withinGeofence
      ? `Within geofence (${Math.round(distance)}m from site)`
      : `Outside geofence (${Math.round(distance)}m from site, max ${radius}m)`,
  };
};

/**
 * Determine location accuracy level
 * @param {number} accuracy - Accuracy in meters
 * @returns {string} Accuracy level
 */
const getLocationAccuracy = (accuracy) => {
  if (!accuracy) return LOCATION_ACCURACY.UNAVAILABLE;
  if (accuracy < 10) return LOCATION_ACCURACY.HIGH;
  if (accuracy < 50) return LOCATION_ACCURACY.MEDIUM;
  return LOCATION_ACCURACY.LOW;
};

/**
 * Clock in at site with GPS verification
 * @param {Object} guard - Guard object
 * @param {Object} shift - Shift object
 * @param {Object} site - Site object with GPS coordinates
 * @returns {Promise<Object>} Clock-in result
 */
export const clockIn = async (guard, shift, site) => {
  try {
    // Get current position
    const position = await getCurrentPosition();

    // Verify geofence
    const verification = verifyGeofence(
      position,
      { latitude: site.latitude, longitude: site.longitude },
      site.geofenceRadius || GEOFENCE_RADIUS
    );

    // Create clock-in record
    const clockInRecord = {
      guardId: guard.$id,
      guardName: `${guard.firstName} ${guard.lastName}`,
      shiftId: shift.$id,
      siteId: site.$id,
      siteName: site.siteName,
      status: CLOCK_STATUS.CLOCKED_IN,
      clockInTime: new Date().toISOString(),
      location: {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
      },
      geofenceVerified: verification.verified,
      distance: verification.distance,
      timestamp: Date.now(),
    };

    // Audit log
    await createAuditLog({
      category: AUDIT_CATEGORY.SHIFT,
      action: AUDIT_ACTION.CREATE,
      description: `${guard.firstName} ${guard.lastName} clocked in at ${site.siteName} ${
        verification.verified ? '(GPS verified)' : '(outside geofence)'
      }`,
      metadata: {
        guardId: guard.$id,
        shiftId: shift.$id,
        siteId: site.$id,
        gpsVerified: verification.verified,
        distance: verification.distance,
        accuracy: verification.accuracy,
      },
    });

    return {
      success: verification.verified,
      record: clockInRecord,
      verification,
      warning: !verification.verified
        ? 'Location verification failed - outside geofence'
        : null,
    };
  } catch (error) {
    console.error('Clock-in error:', error);
    
    // Create audit log for failed attempt
    await createAuditLog({
      category: AUDIT_CATEGORY.SHIFT,
      action: AUDIT_ACTION.CREATE,
      severity: 'warning',
      status: 'failure',
      description: `Failed clock-in attempt by ${guard.firstName} ${guard.lastName}: ${error.message}`,
      metadata: {
        guardId: guard.$id,
        shiftId: shift.$id,
        error: error.message,
      },
    });

    return {
      success: false,
      error: error.message,
      verification: null,
    };
  }
};

/**
 * Clock out from site with GPS verification
 * @param {Object} guard - Guard object
 * @param {Object} shift - Shift object
 * @param {Object} site - Site object
 * @param {Object} clockInRecord - Original clock-in record
 * @returns {Promise<Object>} Clock-out result
 */
export const clockOut = async (guard, shift, site, clockInRecord) => {
  try {
    // Get current position
    const position = await getCurrentPosition();

    // Verify geofence
    const verification = verifyGeofence(
      position,
      { latitude: site.latitude, longitude: site.longitude },
      site.geofenceRadius || GEOFENCE_RADIUS
    );

    // Calculate shift duration
    const clockInTime = new Date(clockInRecord.clockInTime);
    const clockOutTime = new Date();
    const durationMs = clockOutTime - clockInTime;
    const durationHours = durationMs / (1000 * 60 * 60);

    // Create clock-out record
    const clockOutRecord = {
      ...clockInRecord,
      status: CLOCK_STATUS.CLOCKED_OUT,
      clockOutTime: clockOutTime.toISOString(),
      clockOutLocation: {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
      },
      clockOutGeofenceVerified: verification.verified,
      clockOutDistance: verification.distance,
      duration: {
        milliseconds: durationMs,
        hours: Math.round(durationHours * 100) / 100,
        formatted: formatDuration(durationMs),
      },
    };

    // Audit log
    await createAuditLog({
      category: AUDIT_CATEGORY.SHIFT,
      action: AUDIT_ACTION.UPDATE,
      description: `${guard.firstName} ${guard.lastName} clocked out from ${site.siteName} (${clockOutRecord.duration.formatted})`,
      metadata: {
        guardId: guard.$id,
        shiftId: shift.$id,
        siteId: site.$id,
        duration: clockOutRecord.duration.hours,
        gpsVerified: verification.verified,
      },
    });

    return {
      success: verification.verified,
      record: clockOutRecord,
      verification,
      duration: clockOutRecord.duration,
      warning: !verification.verified
        ? 'Location verification failed - outside geofence'
        : null,
    };
  } catch (error) {
    console.error('Clock-out error:', error);
    
    await createAuditLog({
      category: AUDIT_CATEGORY.SHIFT,
      action: AUDIT_ACTION.UPDATE,
      severity: 'warning',
      status: 'failure',
      description: `Failed clock-out attempt by ${guard.firstName} ${guard.lastName}: ${error.message}`,
      metadata: {
        guardId: guard.$id,
        error: error.message,
      },
    });

    return {
      success: false,
      error: error.message,
      verification: null,
    };
  }
};

/**
 * Start break with GPS verification
 * @param {Object} guard - Guard object
 * @param {Object} clockInRecord - Current clock-in record
 * @returns {Promise<Object>} Break start result
 */
export const startBreak = async (guard, clockInRecord) => {
  try {
    const position = await getCurrentPosition();

    const breakRecord = {
      ...clockInRecord,
      status: CLOCK_STATUS.ON_BREAK,
      breakStartTime: new Date().toISOString(),
      breakStartLocation: {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
      },
    };

    await createAuditLog({
      category: AUDIT_CATEGORY.SHIFT,
      action: AUDIT_ACTION.UPDATE,
      description: `${guard.firstName} ${guard.lastName} started break`,
      metadata: { guardId: guard.$id, shiftId: clockInRecord.shiftId },
    });

    return { success: true, record: breakRecord };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * End break and return to duty
 * @param {Object} guard - Guard object
 * @param {Object} breakRecord - Break record
 * @returns {Promise<Object>} Break end result
 */
export const endBreak = async (guard, breakRecord) => {
  try {
    const breakStart = new Date(breakRecord.breakStartTime);
    const breakEnd = new Date();
    const breakDuration = breakEnd - breakStart;

    const resumeRecord = {
      ...breakRecord,
      status: CLOCK_STATUS.CLOCKED_IN,
      breakEndTime: breakEnd.toISOString(),
      breakDuration: {
        milliseconds: breakDuration,
        minutes: Math.round(breakDuration / (1000 * 60)),
        formatted: formatDuration(breakDuration),
      },
    };

    await createAuditLog({
      category: AUDIT_CATEGORY.SHIFT,
      action: AUDIT_ACTION.UPDATE,
      description: `${guard.firstName} ${guard.lastName} ended break (${resumeRecord.breakDuration.formatted})`,
      metadata: {
        guardId: guard.$id,
        shiftId: breakRecord.shiftId,
        breakDuration: resumeRecord.breakDuration.minutes,
      },
    });

    return { success: true, record: resumeRecord };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Format duration for display
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration
 */
const formatDuration = (milliseconds) => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Get demo site with GPS coordinates (London examples)
 */
export const getDemoSiteLocations = () => ({
  'site-1': { latitude: 51.5074, longitude: -0.1278 }, // Central London
  'site-2': { latitude: 51.5155, longitude: -0.0922 }, // City of London
  'site-3': { latitude: 51.4545, longitude: -0.1087 }, // South London
});

export default {
  getCurrentPosition,
  calculateDistance,
  verifyGeofence,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  CLOCK_STATUS,
  LOCATION_ACCURACY,
  GEOFENCE_RADIUS,
  getDemoSiteLocations,
};
