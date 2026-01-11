/**
 * GPS Clock-In Component
 * Mobile-friendly interface for location-verified time tracking
 */

import { useState, useEffect } from 'react';
import {
  getCurrentPosition,
  verifyGeofence,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  CLOCK_STATUS,
  LOCATION_ACCURACY,
  getDemoSiteLocations,
} from '../lib/gpsClockIn';

const GPSClockIn = ({ guard, shift, site }) => {
  const [status, setStatus] = useState(CLOCK_STATUS.CLOCKED_OUT);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [breakRecord, setBreakRecord] = useState(null);
  const [location, setLocation] = useState(null);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (status === CLOCK_STATUS.CLOCKED_IN && currentRecord) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - new Date(currentRecord.clockInTime).getTime();
        setElapsedTime(Math.floor(elapsed / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, currentRecord]);

  // Get current location
  const updateLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      const pos = await getCurrentPosition();
      setLocation(pos);

      // Verify geofence
      const siteLocation = getDemoSiteLocations()[site.id] || site.location;
      if (siteLocation) {
        const verify = verifyGeofence(pos, siteLocation);
        setVerification(verify);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateLocation();
  }, []);

  const handleClockIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await clockIn(guard, shift, site);

      if (result.success) {
        setStatus(CLOCK_STATUS.CLOCKED_IN);
        setCurrentRecord(result.record);
        setVerification(result.verification);
        
        if (result.warning) {
          setError(result.warning);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await clockOut(guard, shift, site, currentRecord);

      if (result.success) {
        setStatus(CLOCK_STATUS.CLOCKED_OUT);
        
        // Show completion message
        alert(`Shift Complete!\nDuration: ${result.duration.formatted}`);
        
        setCurrentRecord(null);
        setElapsedTime(0);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await startBreak(guard, currentRecord);

      if (result.success) {
        setStatus(CLOCK_STATUS.ON_BREAK);
        setBreakRecord(result.breakRecord);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await endBreak(guard, breakRecord);

      if (result.success) {
        setStatus(CLOCK_STATUS.CLOCKED_IN);
        setBreakRecord(null);
        
        alert(`Break Complete!\nDuration: ${result.breakDuration} minutes`);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (status) {
      case CLOCK_STATUS.CLOCKED_IN:
        return 'bg-green-500';
      case CLOCK_STATUS.ON_BREAK:
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getAccuracyColor = (accuracy) => {
    switch (accuracy) {
      case LOCATION_ACCURACY.HIGH:
        return 'text-green-600';
      case LOCATION_ACCURACY.MEDIUM:
        return 'text-yellow-600';
      case LOCATION_ACCURACY.LOW:
        return 'text-orange-600';
      default:
        return 'text-red-600';
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`${getStatusColor()} text-white p-6`}>
        <div className="text-center">
          <div className="text-4xl font-bold mb-2">
            {status === CLOCK_STATUS.CLOCKED_IN ? formatElapsedTime(elapsedTime) : '--:--:--'}
          </div>
          <div className="text-sm opacity-90">
            {status === CLOCK_STATUS.CLOCKED_OUT && 'Not Clocked In'}
            {status === CLOCK_STATUS.CLOCKED_IN && 'Working'}
            {status === CLOCK_STATUS.ON_BREAK && 'On Break'}
          </div>
        </div>
      </div>

      {/* Shift Details */}
      <div className="p-6 bg-gray-50 border-b">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600 text-sm">Site:</span>
            <span className="font-medium">{site.siteName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 text-sm">Post:</span>
            <span className="font-medium">{shift.postName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 text-sm">Scheduled:</span>
            <span className="font-medium">
              {shift.startTime} - {shift.endTime}
            </span>
          </div>
        </div>
      </div>

      {/* Location Status */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📍</span>
            <span className="font-medium">Location Status</span>
          </div>
          <button
            onClick={updateLocation}
            disabled={loading}
            className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Refresh'}
          </button>
        </div>

        {location && verification && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Within Geofence:</span>
              <span className={`font-medium ${verification.withinGeofence ? 'text-green-600' : 'text-red-600'}`}>
                {verification.withinGeofence ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Distance to Site:</span>
              <span className="font-medium">{verification.distance}m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">GPS Accuracy:</span>
              <span className={`font-medium ${getAccuracyColor(verification.accuracy)}`}>
                {verification.accuracy.toUpperCase()} (±{location.accuracy}m)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Verified:</span>
              <span className={`font-medium ${verification.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                {verification.verified ? '✓ Verified' : '! Warning'}
              </span>
            </div>
          </div>
        )}

        {!location && !loading && (
          <div className="text-center text-gray-500 py-4">
            <p className="text-sm">Location not available</p>
            <p className="text-xs mt-1">Please enable location services</p>
          </div>
        )}

        {verification && !verification.withinGeofence && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-800">
              ⚠️ You are outside the required geofence radius ({verification.radius}m). 
              You may still clock in, but it will be flagged for review.
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-6 space-y-3">
        {status === CLOCK_STATUS.CLOCKED_OUT && (
          <button
            onClick={handleClockIn}
            disabled={loading || !location}
            className="w-full py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Clocking In...' : 'Clock In'}
          </button>
        )}

        {status === CLOCK_STATUS.CLOCKED_IN && (
          <>
            <button
              onClick={handleStartBreak}
              disabled={loading}
              className="w-full py-3 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 disabled:opacity-50"
            >
              Start Break
            </button>
            <button
              onClick={handleClockOut}
              disabled={loading}
              className="w-full py-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Clocking Out...' : 'Clock Out'}
            </button>
          </>
        )}

        {status === CLOCK_STATUS.ON_BREAK && (
          <button
            onClick={handleEndBreak}
            disabled={loading}
            className="w-full py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Ending Break...' : 'End Break'}
          </button>
        )}
      </div>

      {/* Clock-In Details */}
      {currentRecord && (
        <div className="p-6 bg-gray-50 border-t">
          <div className="text-sm text-gray-600 mb-2">Clock-In Details</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Time:</span>
              <span>{new Date(currentRecord.clockInTime).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location:</span>
              <span>
                {currentRecord.location.latitude.toFixed(6)}, {currentRecord.location.longitude.toFixed(6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Geofence:</span>
              <span className={currentRecord.geofenceVerified ? 'text-green-600' : 'text-yellow-600'}>
                {currentRecord.geofenceVerified ? 'Verified' : 'Outside Range'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="p-4 bg-blue-50 text-xs text-blue-800">
        <p className="font-medium mb-1">GPS Time Tracking</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700">
          <li>Your location must be within {verification?.radius || 100}m of the site</li>
          <li>GPS accuracy affects verification status</li>
          <li>All clock-ins are logged with location data</li>
          <li>Supervisors can review flagged clock-ins</li>
        </ul>
      </div>
    </div>
  );
};

export default GPSClockIn;
