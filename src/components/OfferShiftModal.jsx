import React, { useState } from 'react';
import { SHIFT_STATUS } from '../lib/scheduleUtils';
import { createAuditLog, AUDIT_CATEGORY, AUDIT_ACTION } from '../lib/auditLog';
import {
  AiOutlineUser,
  AiOutlineCalendar,
  AiOutlineClockCircle,
  AiOutlineEnvironment,
  AiOutlineCheckCircle,
  AiOutlineClose,
  AiOutlineFire,
  AiOutlineStar,
} from 'react-icons/ai';

const OfferShiftModal = ({ shift, guards, onClose, onOffer }) => {
  const [selectedGuards, setSelectedGuards] = useState([]);
  const [offerType, setOfferType] = useState('direct'); // 'direct' or 'open'
  const [urgency, setUrgency] = useState('normal'); // 'normal', 'high', 'urgent'
  const [expiresIn, setExpiresIn] = useState(24); // hours
  const [message, setMessage] = useState('');
  const [payRateBonus, setPayRateBonus] = useState(0);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySMS, setNotifySMS] = useState(false);
  const [notifyPush, setNotifyPush] = useState(true);
  const [offering, setOffering] = useState(false);

  const toggleGuard = (guardId) => {
    if (selectedGuards.includes(guardId)) {
      setSelectedGuards(selectedGuards.filter((id) => id !== guardId));
    } else {
      setSelectedGuards([...selectedGuards, guardId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedGuards.length === guards.length) {
      setSelectedGuards([]);
    } else {
      setSelectedGuards(guards.map((g) => g.$id));
    }
  };

  const handleOfferShift = async () => {
    if (offerType === 'direct' && selectedGuards.length === 0) {
      alert('Please select at least one guard');
      return;
    }

    if (!notifyEmail && !notifySMS && !notifyPush) {
      alert('Please select at least one notification method');
      return;
    }

    setOffering(true);

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresIn);

      const updatedShift = {
        ...shift,
        status: offerType === 'open' ? SHIFT_STATUS.OFFERED : SHIFT_STATUS.OFFERED,
        offeredTo: offerType === 'direct' ? selectedGuards : 'all',
        offeredAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        urgency,
        payRate: (shift.payRate || 12.50) + payRateBonus,
        offerMessage: message,
        offerType,
        claimCount: 0,
        viewCount: 0,
      };

      // Create notifications for each selected guard
      const notifications = selectedGuards.map((guardId) => {
        const guard = guards.find((g) => g.$id === guardId);
        return {
          guardId,
          guardName: `${guard.firstName} ${guard.lastName}`,
          shiftId: shift.$id,
          type: 'shift_offered',
          title: offerType === 'open' ? 'New Open Shift Available' : 'Shift Offered to You',
          message: message || `A shift at ${shift.siteName} on ${shift.date} is now available to claim`,
          timestamp: new Date().toISOString(),
          read: false,
          channels: {
            email: notifyEmail,
            sms: notifySMS,
            push: notifyPush,
          },
        };
      });

      // Audit log
      await createAuditLog({
        category: AUDIT_CATEGORY.SHIFT,
        action: AUDIT_ACTION.SHIFT_PUBLISHED,
        resourceType: 'shift',
        resourceId: shift.$id,
        resourceName: `${shift.siteName} - ${shift.date} ${shift.startTime}`,
        description: `Shift offered to ${offerType === 'open' ? 'all guards (open shift)' : `${selectedGuards.length} selected guard(s)`}`,
        metadata: {
          offerType,
          guardCount: selectedGuards.length,
          urgency,
          expiresAt: expiresAt.toISOString(),
          payRate: updatedShift.payRate,
        },
      });

      onOffer(updatedShift, notifications);
      alert(
        `Shift ${offerType === 'open' ? 'posted as open shift' : `offered to ${selectedGuards.length} guard(s)`}`
      );
      onClose();
    } catch (error) {
      console.error('Error offering shift:', error);
      alert('Failed to offer shift. Please try again.');
    } finally {
      setOffering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="max-w-4xl w-full rounded-xl border border-white/10 bg-night-sky p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Offer Shift</h2>
            <p className="text-white/60 mt-1">
              {shift.siteName} - {shift.date} {shift.startTime} - {shift.endTime}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/5 p-2 hover:bg-white/10 transition-colors"
          >
            <AiOutlineClose className="text-white" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Offer Type */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">Offer Type</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setOfferType('direct')}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  offerType === 'direct'
                    ? 'border-accent bg-accent/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AiOutlineUser className="text-accent" />
                  <span className="font-semibold text-white">Direct Offer</span>
                </div>
                <p className="text-sm text-white/60">
                  Offer to selected guards only. First to accept gets assigned.
                </p>
              </button>
              <button
                onClick={() => setOfferType('open')}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  offerType === 'open'
                    ? 'border-accent bg-accent/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AiOutlineCalendar className="text-accent" />
                  <span className="font-semibold text-white">Open Shift</span>
                </div>
                <p className="text-sm text-white/60">
                  Post to all eligible guards. Anyone can claim.
                </p>
              </button>
            </div>
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">Urgency Level</label>
            <div className="grid grid-cols-3 gap-4">
              {['normal', 'high', 'urgent'].map((level) => (
                <button
                  key={level}
                  onClick={() => setUrgency(level)}
                  className={`rounded-lg border p-3 text-center transition-colors ${
                    urgency === level
                      ? 'border-accent bg-accent/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-white font-medium capitalize">{level}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Expires In */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Offer Expires In (hours)
            </label>
            <input
              type="number"
              value={expiresIn}
              onChange={(e) => setExpiresIn(Number(e.target.value))}
              min="1"
              max="168"
              className="w-full rounded-lg border border-white/10 bg-night-sky px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="mt-1 text-sm text-white/60">
              Expires at: {new Date(Date.now() + expiresIn * 60 * 60 * 1000).toLocaleString()}
            </p>
          </div>

          {/* Pay Rate Bonus */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Additional Pay Rate (£/hour)
            </label>
            <input
              type="number"
              value={payRateBonus}
              onChange={(e) => setPayRateBonus(Number(e.target.value))}
              min="0"
              max="20"
              step="0.50"
              className="w-full rounded-lg border border-white/10 bg-night-sky px-4 py-2 text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="mt-1 text-sm text-white/60">
              Total rate: £{((shift.payRate || 12.50) + payRateBonus).toFixed(2)}/hour
            </p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Custom Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="3"
              placeholder="Add any additional information for guards..."
              className="w-full rounded-lg border border-white/10 bg-night-sky px-4 py-2 text-white placeholder-white/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Notification Channels */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              Notification Channels
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="rounded border-white/10 bg-night-sky text-accent focus:ring-accent"
                />
                <span className="text-white">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifySMS}
                  onChange={(e) => setNotifySMS(e.target.checked)}
                  className="rounded border-white/10 bg-night-sky text-accent focus:ring-accent"
                />
                <span className="text-white">SMS</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyPush}
                  onChange={(e) => setNotifyPush(e.target.checked)}
                  className="rounded border-white/10 bg-night-sky text-accent focus:ring-accent"
                />
                <span className="text-white">Push</span>
              </label>
            </div>
          </div>

          {/* Guard Selection (for direct offers) */}
          {offerType === 'direct' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-white">
                  Select Guards ({selectedGuards.length} selected)
                </label>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-accent hover:text-accent/80"
                >
                  {selectedGuards.length === guards.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
                {guards.map((guard) => (
                  <label
                    key={guard.$id}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-night-sky p-3 cursor-pointer hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGuards.includes(guard.$id)}
                      onChange={() => toggleGuard(guard.$id)}
                      className="rounded border-white/10 bg-night-sky text-accent focus:ring-accent"
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {guard.firstName} {guard.lastName}
                      </p>
                      <p className="text-xs text-white/60">
                        SIA: {guard.siaLicenseNumber} • {guard.status}
                      </p>
                    </div>
                    {guard.reliability && guard.reliability > 90 && (
                      <AiOutlineStar className="text-yellow-500" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="rounded-lg border border-accent/30 bg-accent/10 p-4">
            <h3 className="font-semibold text-white mb-2">Summary</h3>
            <div className="space-y-1 text-sm text-white/70">
              <p>
                • Offer type:{' '}
                <span className="text-white">
                  {offerType === 'open' ? 'Open to all guards' : `Direct to ${selectedGuards.length} guard(s)`}
                </span>
              </p>
              <p>
                • Urgency: <span className="text-white capitalize">{urgency}</span>
              </p>
              <p>
                • Expires in: <span className="text-white">{expiresIn} hours</span>
              </p>
              <p>
                • Pay rate: <span className="text-white">£{((shift.payRate || 12.50) + payRateBonus).toFixed(2)}/hour</span>
              </p>
              <p>
                • Notifications:{' '}
                <span className="text-white">
                  {[notifyEmail && 'Email', notifySMS && 'SMS', notifyPush && 'Push']
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleOfferShift}
              disabled={offering || (offerType === 'direct' && selectedGuards.length === 0)}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-white hover:bg-accent/80 transition-colors disabled:opacity-50"
            >
              {offering ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Offering...
                </>
              ) : (
                <>
                  <AiOutlineCheckCircle />
                  {offerType === 'open' ? 'Post Open Shift' : 'Send Offers'}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferShiftModal;
