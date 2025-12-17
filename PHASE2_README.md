# Phase 2 Implementation - Open Shifts & Intelligence

## Overview
Phase 2 adds advanced scheduling capabilities including open shift claiming, eligibility filtering, shift offering workflows, and comprehensive audit logging.

## New Features

### 1. Open Shift Claiming System (`/src/pages/portal/OpenShifts.jsx`)

**Purpose**: Staff-facing page for browsing and claiming available open shifts.

**Key Features**:
- **Real-time shift availability**: View all open/offered shifts across sites
- **Eligibility scoring**: Automated calculation (0-100%) based on:
  - SIA license validity (blocking if expired)
  - Experience match (vs required years)
  - Skills match (vs required skills)
  - Reliability score (historical performance)
  - Previous site experience
  - Scheduling conflicts (rest periods, daily/weekly hours)
- **Smart filtering**:
  - All shifts
  - Eligible only (score ≥30%)
  - Today's shifts
  - This week's shifts
- **Sorting options**: By date or pay rate
- **First-accept assignment**: First guard to claim gets the shift
- **Expiring shift alerts**: Visual indicators for time-sensitive offers
- **Urgency levels**: Normal, High, Urgent

**Eligibility Factors**:
```javascript
Base score: 50 points
+ Experience match: +20 points
+ Full skills match: +20 points (partial: proportional)
+ Excellent reliability (>90%): +10 points
+ Previous site experience: +5 points
- Scheduling warnings: -5 points each
- Conflicts: BLOCKING (cannot claim)

Minimum threshold: 30 points
```

**User Flow**:
1. Guard views open shifts list
2. Clicks shift card to see details
3. System calculates eligibility and displays match score
4. Guard clicks "Claim This Shift"
5. Shift status changes to ACCEPTED
6. Shift removed from open pool

### 2. Shift Offering Workflow (`/src/components/OfferShiftModal.jsx`)

**Purpose**: Admin tool for publishing shifts as open or direct offers.

**Offer Types**:
- **Direct Offer**: Target specific guards, first to accept wins
- **Open Shift**: Available to all eligible guards

**Configuration Options**:
- **Urgency level**: Normal, High, Urgent
- **Expiration time**: 1-168 hours (customizable)
- **Pay rate bonus**: Add premium rate (£0-20/hour)
- **Custom message**: Additional instructions for guards
- **Notification channels**: Email, SMS, Push (multi-select)

**Workflow**:
1. Admin selects unassigned shift
2. Opens "Offer Shift" modal
3. Chooses offer type (direct/open)
4. Sets urgency, expiry, pay rate
5. For direct offers: Selects target guards
6. Configures notification channels
7. Reviews summary
8. Clicks "Post Open Shift" or "Send Offers"
9. System:
   - Updates shift status to OFFERED
   - Creates notifications for recipients
   - Logs to audit trail
   - Displays in Open Shifts page

### 3. Eligibility Filtering

**Real-time Validation**:
```javascript
validateShift(shift, guard, allShifts, guardSchedule)
```

**Blocking Conditions**:
- ❌ SIA license expired
- ❌ Double-booking (overlapping shifts)

**Warning Conditions** (can override):
- ⚠️ Minimum rest violation (<11 hours between shifts)
- ⚠️ Daily hours exceeded (>12 hours)
- ⚠️ Weekly hours exceeded (>48 hours)

**Info Conditions**:
- ℹ️ Overtime threshold reached (>40 hours/week)

**Compliance Status Levels**:
- `VALID`: License valid, >14 days to expiry
- `EXPIRING_SOON`: <14 days to expiry (grace period)
- `EXPIRED`: Past expiry date (BLOCKING)
- `NOT_VERIFIED`: No license record
- `GRACE_PERIOD`: Within 14-day grace after expiry

### 4. Audit Logging System (`/src/lib/auditLog.js`)

**Purpose**: Comprehensive system activity tracking for compliance, security, and debugging.

**Event Categories** (15 types):
- Authentication
- User Management
- Schedule/Shift
- Guard/Client/Site
- Compliance
- Finance/Payroll
- Incident
- Settings
- Access Control
- Data Export
- System

**Event Actions** (50+ types):
- Auth: login, logout, login_failed, password_changed, mfa_enabled
- CRUD: create, read, update, delete, bulk_*
- Shifts: published, assigned, claimed, confirmed, rejected, cancelled, completed, locked
- Compliance: license_verified, license_expired, training_completed, document_uploaded
- Finance: invoice_generated, payment_processed, expense_approved
- Payroll: payroll_calculated, payroll_approved, payslip_generated
- Access: permission_granted, permission_revoked, access_denied
- Data: export, import, backup, restore
- Settings: setting_changed, integration_enabled

**Severity Levels**:
- `INFO`: Normal operations
- `WARNING`: Potentially concerning events
- `CRITICAL`: Major issues (license expired, payment failed)
- `SECURITY`: Security-relevant events (access denied, role changes)

**Audit Log Fields**:
```javascript
{
  timestamp: ISO8601,
  category: string,
  action: string,
  severity: string,
  status: 'success' | 'failure' | 'partial',
  userId: string,
  userName: string,
  userRole: string,
  resourceType?: string,  // shift, user, license, invoice, etc.
  resourceId?: string,
  resourceName?: string,
  description: string,
  metadata: JSON,  // Additional context
  ipAddress?: string,
  userAgent?: string,
}
```

**Helper Functions**:
```javascript
// General
createAuditLog({ category, action, severity, ... })

// Specific helpers
auditLogin(success, userId, userName, ipAddress)
auditLogout(userId, userName)
auditShiftChange(action, shift, guardName, performedBy)
auditComplianceEvent(action, resourceType, resourceId, resourceName, description)
auditFinanceEvent(action, amount, description, metadata)
auditAccessDenied(userId, userName, resource, reason)
auditDataExport(dataType, recordCount, format, userId, userName)
auditSettingChange(settingName, oldValue, newValue, userId, userName)
```

**Fallback Mechanism**:
- Primary: Save to Appwrite database
- Fallback 1: Log to console with structured format
- Fallback 2: Store in localStorage (last 100 entries)
- Never throws errors (non-blocking)

### 5. Audit Log Viewer (`/src/pages/portal/AuditLog.jsx`)

**Features**:
- **Statistics dashboard**:
  - Total events
  - Critical events count
  - Security events count
  - Failed actions count
  - Success rate percentage
- **Advanced filtering**:
  - By category (15 options)
  - By severity (4 levels)
  - By status (3 options)
  - Date range (start/end)
- **Search**: Full-text search across user, action, description, resource
- **Sortable table**: Timestamp, category, action, user, severity, status, description
- **Detail modal**: Full event information including metadata JSON
- **CSV export**: Download filtered logs for external analysis
- **Color-coded severity**: Visual indicators for quick scanning

**User Interface**:
- Real-time log display (auto-refresh optional)
- Responsive design for mobile/tablet
- Pagination for large result sets
- Quick filters: "Last 24h", "Last 7 days", "Last 30 days"

## Integration Points

### Scheduling Page Updates
```javascript
// Import audit logging
import { createAuditLog, auditShiftChange } from '../../lib/auditLog';

// Log shift creation
await auditShiftChange(
  AUDIT_ACTION.CREATE,
  newShift,
  assignedGuardName,
  currentUserName
);

// Log shift assignment
await auditShiftChange(
  AUDIT_ACTION.SHIFT_ASSIGNED,
  shift,
  guardName,
  adminName
);
```

### My Schedule Page Updates
```javascript
// Log shift confirmation
await auditShiftChange(
  AUDIT_ACTION.SHIFT_CONFIRMED,
  shift,
  currentGuardName,
  'self'
);

// Log shift rejection
await auditShiftChange(
  AUDIT_ACTION.SHIFT_REJECTED,
  shift,
  currentGuardName,
  'self'
);
```

## Navigation Updates

**New Menu Items**:
- "Open Shifts" - Between "My Schedule" and "Sites"
- "Audit Log" - Between "Reports" and "AI Assistant"

**Updated Routes** (`/src/App.jsx`):
```jsx
<Route path="open-shifts" element={<OpenShifts />} />
<Route path="audit" element={<AuditLog />} />
```

## Database Schema Requirements

### Audit Logs Collection
```javascript
{
  collectionId: 'auditLogs',
  attributes: [
    { key: 'timestamp', type: 'datetime', required: true },
    { key: 'category', type: 'string', size: 50, required: true },
    { key: 'action', type: 'string', size: 50, required: true },
    { key: 'severity', type: 'string', size: 20, required: true },
    { key: 'status', type: 'string', size: 20, required: true },
    { key: 'userId', type: 'string', size: 50, required: true },
    { key: 'userName', type: 'string', size: 100, required: true },
    { key: 'userRole', type: 'string', size: 50, required: true },
    { key: 'resourceType', type: 'string', size: 50 },
    { key: 'resourceId', type: 'string', size: 50 },
    { key: 'resourceName', type: 'string', size: 255 },
    { key: 'description', type: 'string', size: 500 },
    { key: 'metadata', type: 'string', size: 10000 },  // JSON
    { key: 'ipAddress', type: 'string', size: 50 },
    { key: 'userAgent', type: 'string', size: 500 },
  ],
  indexes: [
    { key: 'timestamp', type: 'key', orders: ['DESC'] },
    { key: 'category', type: 'key' },
    { key: 'severity', type: 'key' },
    { key: 'userId', type: 'key' },
  ],
}
```

### Shifts Collection Updates
Add these fields to existing shifts collection:
```javascript
{
  // Offering fields
  status: 'offered',  // New status option
  offeredTo: ['guardId1', 'guardId2'] | 'all',
  offeredAt: datetime,
  expiresAt: datetime,
  urgency: 'normal' | 'high' | 'urgent',
  offerMessage: string,
  offerType: 'direct' | 'open',
  claimCount: integer,
  viewCount: integer,
  
  // Existing fields
  payRate: float,
  requiredSkills: [string],
  preferredExperience: integer,
}
```

## Demo Data

**Demo Audit Logs** (`/src/data/demoAuditLogs.js`):
- 18 sample audit entries
- Covers all major categories
- Realistic timestamps (last 7 days)
- Mix of success/failure/warning severities
- Example metadata structures

**Demo Open Shifts** (in OpenShifts.jsx):
- 6 sample shifts
- Various urgency levels
- Different expiry times
- Mixed skill requirements
- Realistic pay rates (£12.50-£16.00)

## UK Compliance

**Working Time Regulations**:
- ✅ Enforced in eligibility filtering
- ✅ 11-hour minimum rest between shifts
- ✅ 12-hour maximum daily work
- ✅ 48-hour maximum weekly work
- ✅ 40-hour overtime threshold

**SIA License Requirements**:
- ✅ Blocks assignments if expired
- ✅ Grace period (14 days) for renewals
- ✅ Alerts shown on My Schedule
- ✅ Tracked in audit log

## Security Considerations

**Audit Logging**:
- ✅ Non-blocking (never breaks app flow)
- ✅ Automatic fallback to console/localStorage
- ✅ IP address capture for security events
- ✅ User role tracking for access control
- ✅ Metadata scrubbing (no sensitive data)

**Access Control**:
- ✅ Guards can only see/claim open shifts for themselves
- ✅ Admins can offer shifts and view audit logs
- ✅ Access denial events logged with reason

## Performance

**Optimization Strategies**:
- Audit logs limited to 500 per query (configurable)
- LocalStorage fallback capped at 100 entries
- Eligibility calculations cached per shift
- Search debounced (300ms delay)
- Filters applied client-side for small datasets

## Future Enhancements

**Potential Phase 3 Features**:
- [ ] Automated shift offering based on guard preferences
- [ ] Machine learning for eligibility scoring
- [ ] Predictive analytics (who's most likely to accept?)
- [ ] Real-time notifications (WebSocket)
- [ ] Advanced audit log analytics dashboard
- [ ] Anomaly detection (suspicious login patterns)
- [ ] Compliance report generation from audit logs
- [ ] GDPR-compliant audit log retention policies
- [ ] Integration with external SIEM systems

## Testing Checklist

### Open Shifts
- [ ] View all open shifts
- [ ] Filter by eligible only
- [ ] Sort by date/pay rate
- [ ] Claim shift successfully
- [ ] Eligibility calculation blocks expired license
- [ ] Eligibility warns on rest period violation
- [ ] Match score displays correctly
- [ ] Expiring shift alerts show

### Shift Offering
- [ ] Create direct offer to selected guards
- [ ] Create open shift for all guards
- [ ] Set urgency level
- [ ] Add pay rate bonus
- [ ] Set expiration time
- [ ] Send multi-channel notifications
- [ ] Verify shift appears in Open Shifts

### Audit Logging
- [ ] View audit logs table
- [ ] Filter by category
- [ ] Filter by severity
- [ ] Search logs by keyword
- [ ] Export to CSV
- [ ] View log detail modal
- [ ] Statistics dashboard updates
- [ ] Fallback to localStorage works

## Known Limitations

1. **Demo Mode**: All features work with demo data if Appwrite unavailable
2. **Eligibility Scoring**: Currently uses simulated guard skills/experience
3. **Real-time Updates**: No WebSocket, requires page refresh
4. **Audit Retention**: No automated cleanup policy yet
5. **IP Address**: Not captured automatically (requires server-side)

## Migration Guide

### From Phase 1 to Phase 2

1. Update shift status enum to include `OFFERED`
2. Add new fields to shifts collection
3. Create audit logs collection
4. Import audit log utility functions
5. Add audit log calls to existing actions
6. Update navigation with new pages
7. Test eligibility filtering with real data

### Breaking Changes
- None - fully backward compatible with Phase 1

## Support

For questions or issues:
- Check console logs for audit fallback messages
- Review demo data for expected structure
- Verify Appwrite collections exist
- Check browser localStorage for cached audit logs

---

**Version**: Phase 2.0
**Last Updated**: 2025-12-15
**Author**: Fortis Secured Development Team
