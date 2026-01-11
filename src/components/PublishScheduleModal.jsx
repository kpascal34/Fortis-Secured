import React, { useState } from 'react';
import {
  SHIFT_STATUS,
  NOTIFICATION_TYPES,
  generateNotification,
} from '../lib/scheduleUtils';
import {
  AiOutlineBell,
  AiOutlineMail,
  AiOutlineMessage,
  AiOutlineClose,
  AiOutlineCheckCircle,
  AiOutlineWarning,
} from 'react-icons/ai';

const PublishScheduleModal = ({ shifts, guards, onClose, onPublish }) => {
  const [selectedShifts, setSelectedShifts] = useState(shifts.map(s => s.$id));
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [notifyBySMS, setNotifyBySMS] = useState(false);
  const [notifyByPush, setNotifyByPush] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [publishing, setPublishing] = useState(false);

  const shiftsToPublish = shifts.filter(s => selectedShifts.includes(s.$id));
  const affectedGuards = [...new Set(shiftsToPublish.map(s => s.assignedGuardId).filter(Boolean))];

  const handlePublish = async () => {
    if (shiftsToPublish.length === 0) {
      alert('Please select at least one shift to publish');
      return;
    }

    setPublishing(true);

    try {
      // Generate notifications for each affected guard
      const notifications = [];
      
      for (const shift of shiftsToPublish) {
        if (shift.assignedGuardId) {
          const guard = guards.find(g => g.$id === shift.assignedGuardId);
          if (guard) {
            const notification = generateNotification(
              NOTIFICATION_TYPES.SHIFT_PUBLISHED,
              shift,
              guard,
              {
                email: notifyByEmail,
                sms: notifyBySMS,
                push: notifyByPush,
                customMessage,
              }
            );
            notifications.push(notification);
          }
        }
      }

      // Update shift statuses
      const updatedShifts = shiftsToPublish.map(shift => ({
        ...shift,
        status: shift.assignedGuardId ? SHIFT_STATUS.ASSIGNED : SHIFT_STATUS.UNASSIGNED,
        publishedAt: new Date().toISOString(),
        requiresConfirmation: true,
      }));

      // Call parent callback
      await onPublish(updatedShifts, notifications);

      alert(`Successfully published ${shiftsToPublish.length} shifts and sent ${notifications.length} notifications`);
      onClose();
    } catch (error) {
      console.error('Error publishing schedule:', error);
      alert('Failed to publish schedule. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const toggleShift = (shiftId) => {
    setSelectedShifts(prev =>
      prev.includes(shiftId)
        ? prev.filter(id => id !== shiftId)
        : [...prev, shiftId]
    );
  };

  const selectAll = () => {
    setSelectedShifts(shifts.map(s => s.$id));
  };

  const deselectAll = () => {
    setSelectedShifts([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-night-sky p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Publish Schedule</h2>
            <p className="text-white/60 mt-1">
              Review and publish shifts to notify assigned staff
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors"
          >
            <AiOutlineClose className="text-white" />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg bg-white/5 border border-white/10 p-4">
            <p className="text-sm text-white/50">Shifts Selected</p>
            <p className="mt-2 text-2xl font-bold text-white">{selectedShifts.length}</p>
          </div>
          <div className="rounded-lg bg-white/5 border border-white/10 p-4">
            <p className="text-sm text-white/50">To Publish</p>
            <p className="mt-2 text-2xl font-bold text-white">{shiftsToPublish.length}</p>
          </div>
          <div className="rounded-lg bg-white/5 border border-white/10 p-4">
            <p className="text-sm text-white/50">Guards Notified</p>
            <p className="mt-2 text-2xl font-bold text-white">{affectedGuards.length}</p>
          </div>
        </div>

        {/* Notification Channels */}
        <div className="mb-6 rounded-lg bg-white/5 border border-white/10 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Notification Channels</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <AiOutlineMail className="text-xl text-accent" />
                <div>
                  <p className="font-medium text-white">Email Notifications</p>
                  <p className="text-sm text-white/60">Send email alerts to guards</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyByEmail}
                onChange={(e) => setNotifyByEmail(e.target.checked)}
                className="h-5 w-5 rounded border-white/20 bg-white/10 text-accent focus:ring-accent"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <AiOutlineMessage className="text-xl text-accent" />
                <div>
                  <p className="font-medium text-white">SMS Notifications</p>
                  <p className="text-sm text-white/60">Send text messages to guards</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyBySMS}
                onChange={(e) => setNotifyBySMS(e.target.checked)}
                className="h-5 w-5 rounded border-white/20 bg-white/10 text-accent focus:ring-accent"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <AiOutlineBell className="text-xl text-accent" />
                <div>
                  <p className="font-medium text-white">Push Notifications</p>
                  <p className="text-sm text-white/60">Send in-app notifications</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyByPush}
                onChange={(e) => setNotifyByPush(e.target.checked)}
                className="h-5 w-5 rounded border-white/20 bg-white/10 text-accent focus:ring-accent"
              />
            </label>
          </div>
        </div>

        {/* Custom Message */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2">
            Custom Message (Optional)
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Add a custom message to include with the notification..."
            rows="3"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
        </div>

        {/* Shift Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Select Shifts</h3>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-sm text-accent hover:text-accent/80"
              >
                Select All
              </button>
              <span className="text-white/30">|</span>
              <button
                onClick={deselectAll}
                className="text-sm text-accent hover:text-accent/80"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg bg-white/5 border border-white/10 p-3">
            {shifts.map((shift) => {
              const guard = guards.find(g => g.$id === shift.assignedGuardId);
              return (
                <label
                  key={shift.$id}
                  className={`flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedShifts.includes(shift.$id)
                      ? 'bg-accent/20 border border-accent/50'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedShifts.includes(shift.$id)}
                    onChange={() => toggleShift(shift.$id)}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-accent focus:ring-accent"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white text-sm">{shift.siteName}</p>
                      {!shift.assignedGuardId && (
                        <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-500">
                          Unassigned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/60 mt-1">
                      {shift.date} • {shift.startTime}-{shift.endTime}
                      {guard && ` • ${guard.firstName} ${guard.lastName}`}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Warnings */}
        {shiftsToPublish.some(s => !s.assignedGuardId) && (
          <div className="mb-6 rounded-lg bg-yellow-500/10 border border-yellow-500/50 p-4">
            <div className="flex items-start gap-3">
              <AiOutlineWarning className="text-xl text-yellow-500 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-500">Unassigned Shifts</p>
                <p className="text-sm text-white/70 mt-1">
                  {shiftsToPublish.filter(s => !s.assignedGuardId).length} shifts have no assigned guards.
                  These will be published as open shifts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={publishing}
            className="rounded-lg bg-white/10 px-6 py-2 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || shiftsToPublish.length === 0 || (!notifyByEmail && !notifyBySMS && !notifyByPush)}
            className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2 text-white hover:bg-accent/80 transition-colors disabled:opacity-50"
          >
            {publishing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Publishing...
              </>
            ) : (
              <>
                <AiOutlineCheckCircle />
                Publish & Notify
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishScheduleModal;
