import React, { useState, useEffect, useCallback } from 'react';
import { databases, DATABASE_ID } from '../lib/appwrite';
import { Query } from 'appwrite';

const OUTBOX_COLLECTION = 'notification_outbox';
const POLL_INTERVAL = 60_000; // 1 minute

const NotificationBell = ({ userId }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await databases.listDocuments(DATABASE_ID, OUTBOX_COLLECTION, [
        Query.orderDesc('$createdAt'),
        Query.limit(20),
      ]);
      setNotifications(res.documents || []);
      setUnreadCount(res.documents.filter((d) => d.status === 'pending').length);
    } catch {
      // Collection may not exist yet — silently ignore
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  const eventLabel = (eventType) => {
    const labels = {
      inviteSent: 'Invite Sent',
      shiftAssigned: 'Shift Assigned',
      applicationApproved: 'Application Approved',
      applicationRejected: 'Application Rejected',
      complianceSubmitted: 'Compliance Submitted',
      complianceApproved: 'Compliance Approved',
      complianceRejected: 'Compliance Rejected',
      timesheetSubmitted: 'Timesheet Submitted',
      timesheetApproved: 'Timesheet Approved',
      timesheetRejected: 'Timesheet Rejected',
      incidentInterim: 'Incident Report',
      incidentFinal: 'Incident Final',
    };
    return labels[eventType] || eventType || 'Notification';
  };

  const statusDot = (status) => {
    if (status === 'sent') return 'bg-emerald-400';
    if (status === 'failed') return 'bg-rose-400';
    return 'bg-amber-400';
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) fetchNotifications(); }}
        className="relative flex items-center justify-center rounded-lg p-2 text-text-3 hover:bg-surface/50 hover:text-text transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-border bg-bg shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-text">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400">
                  {unreadCount} pending
                </span>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-3">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="mx-auto h-8 w-8 text-text-3/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  <p className="mt-2 text-xs text-text-3">No notifications yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {notifications.map((n) => (
                    <li key={n.$id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface/30 transition-colors">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDot(n.status)}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-text truncate">
                          {eventLabel(n.eventType)}
                        </p>
                        {n.toEmail && (
                          <p className="text-xs text-text-3 truncate">{n.toEmail}</p>
                        )}
                        <p className="mt-0.5 text-[10px] text-text-3">
                          {formatTime(n.$createdAt)} · {n.status}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="border-t border-border p-2">
                <button
                  type="button"
                  onClick={() => { setOpen(false); fetchNotifications(); }}
                  className="w-full rounded-lg px-3 py-2 text-xs font-medium text-brand hover:bg-brand/5 transition-colors"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
