# Phase 3 - Enterprise Features & Intelligence

## Overview
Phase 3 transforms FortisSecured from a scheduling platform into an enterprise workforce management system with intelligent assignments, advanced compliance, multi-role access, and location verification.

---

## Features Implemented

### 1. Client Portal (Read-Only Access)
**File:** `/src/pages/portal/ClientPortal.jsx` (450 lines)

Client-facing interface for schedule viewing with restricted access.

**Features:**
- **Two View Modes:**
  - Calendar View: Shifts grouped by date with expand/collapse
  - List View: Sortable table with all shift details
- **Statistics Dashboard:**
  - Total shifts count
  - Confirmed shifts count
  - Active guards count
  - Sites covered count
  - Coverage rate percentage
- **Filters:**
  - By site (dropdown with "All Sites" option)
  - By date range (This Week / This Month / All)
- **CSV Export:** Download schedule with complete details
- **Access Control:** Read-only with no edit/delete capabilities
- **Demo Data:** Acme Corporation with 3 sites, 12 shifts

**Usage:**
```javascript
import ClientPortal from './pages/portal/ClientPortal';

// In routing:
<Route path="/portal/client-portal" element={<ClientPortal />} />
```

**Client Data Structure:**
```javascript
const client = {
  id: 'client-1',
  name: 'Acme Corporation',
  sites: ['site-1', 'site-2', 'site-3']
};
```

---

### 2. Staff Intelligence System
**File:** `/src/lib/staffIntelligence.js` (420 lines)

Intelligent guard ranking and assignment recommendation engine.

**Core Functions:**

#### `calculateGuardScore(guard, shiftHistory, incidents, feedback)`
Returns 0-100 performance score with 6 weighted factors:
- **Reliability (30%):** 100 - (noShows × 10) - (late × 2)
- **Experience (15%):** 50 base + (years × 5), max 100
- **Certifications (15%):** Valid SIA license (50pts) + additional certs (10pts each)
- **Client Feedback (20%):** 5-star rating converted to 0-100 scale
- **Incident Response (10%):** 80 base, +5 excellent / -10 poor
- **Continuity (10%):** 60 base + (repeat sites × 2), max 100

#### `rankGuardsForShift(guards, shift, allShifts, options)`
Returns sorted array of guards with scores 0-100:
- **Performance Base (0-50pts):** 50% of guard's total score
- **Site Experience (0-20pts):** 4 points per completed shift at site
- **Hour Balance (0-15pts):** Prefer understaffed guards (inverse scoring)
- **Tier Bonus (0-10pts):** Platinum ×2.0, Gold ×1.5, Silver ×1.0, Bronze ×0.5
- **Availability (0-5pts):** Shift type in preferredShiftTypes
- **Recommended:** Score ≥70

**Ranking Tiers:**
- **Platinum (90+):** £2.00/hr bonus
- **Gold (80-89):** £1.50/hr bonus
- **Silver (70-79):** £1.00/hr bonus
- **Bronze (60-69):** £0.50/hr bonus
- **Standard (0-59):** £0.00/hr bonus

#### `analyzeHourBalance(guards, allShifts, targetHours=40)`
Analyzes team hour distribution:
```javascript
{
  guardHours: [
    { guardId, hours, shifts, variance, percentage },
    ...
  ],
  balanced: true/false, // maxVariance ≤8 hours
  underutilized: [], // <80% of target
  overutilized: []   // >120% of target
}
```

#### `suggestEmergencyFill(shift, availableGuards, allShifts)`
Emergency coverage with confidence levels:
- Adds proximity scoring (0-20 points, simulated)
- Adds recent activity scoring (0-10 points)
- Returns best match with high/medium/low confidence

**Example Usage:**
```javascript
import { rankGuardsForShift, analyzeHourBalance } from '../lib/staffIntelligence';

// Rank guards for shift assignment
const rankings = rankGuardsForShift(
  availableGuards,
  shift,
  allShifts,
  { includeScore: true }
);

// Top recommendation
const bestGuard = rankings.find(r => r.recommended);
console.log(`Best match: ${bestGuard.guard.name}, Score: ${bestGuard.score}`);

// Check team balance
const balance = analyzeHourBalance(allGuards, allShifts, 40);
if (!balance.balanced) {
  console.log('Underutilized:', balance.underutilized);
  console.log('Overutilized:', balance.overutilized);
}
```

---

### 3. Advanced Conflict Detection
**File:** `/src/lib/advancedConflictRules.js` (580 lines)

Comprehensive conflict validation with 18 rule types across 4 categories.

**Categories & Rules:**

#### A. Fatigue Management (4 rules)
1. **Excessive Consecutive Days:** BLOCKING if ≥12 days, WARNING if ≥10
2. **Insufficient Weekly Rest:** CRITICAL if no 24h continuous rest (Working Time Regulations)
3. **Back-to-Back Nights:** WARNING if ≥5 night shifts in 7 days
4. **Rapid Shift Rotation:** WARNING if day↔night within 48h (circadian disruption)

#### B. Client/Site Rules (4 rules)
1. **Client Restriction:** BLOCKING if guard blacklisted by client
2. **Site Blacklist:** BLOCKING with reason
3. **Required Pairing:** WARNING if buddy system not satisfied
4. **Max Guards Per Site:** BLOCKING if capacity exceeded

#### C. Regulatory Compliance (4 rules)
1. **Underage Night Work:** BLOCKING if <18 working 00:00-06:00 (Employment Rights Act 1996)
2. **Exceed Annual Hours:** CRITICAL if ≥2,304 hours (48hr/week × 48 weeks)
3. **Missing Induction:** BLOCKING (Health & Safety at Work Act)
4. **Expired Training:** WARNING with list of expired certifications

#### D. Quality Control (4 rules)
1. **Preference Mismatch:** RECOMMENDATION if shift type not preferred
2. **Skill Gap:** WARNING with list of missing required skills
3. **Language Barrier:** WARNING if required language not available
4. **Transport Issue:** INFO if night shift without transport

**Fatigue Risk Scoring:**
Cumulative 0-100 point system:
- 12+ consecutive days: 40 points
- No weekly rest: 30 points
- 5+ night shifts: 25 points
- Rapid rotation: 20 points

**Risk Levels:**
- **LOW (0-30):** Green, safe to proceed
- **MODERATE (31-60):** Yellow, monitor closely
- **HIGH (61-80):** Orange, requires review
- **SEVERE (81-100):** Red, BLOCKING

**Severity Levels:**
- **BLOCKING:** Cannot proceed
- **CRITICAL:** Requires immediate attention
- **WARNING:** Should review
- **INFO:** For awareness
- **RECOMMENDATION:** Optimization suggestion

**Usage:**
```javascript
import { advancedConflictDetection } from '../lib/advancedConflictRules';

const validation = advancedConflictDetection(
  shift,
  guard,
  allShifts,
  guardSchedule,
  { strictMode: true }
);

console.log('Valid:', validation.valid);
console.log('Blocking conflicts:', validation.conflicts.blocking);
console.log('Fatigue risk:', validation.fatigueRisk); // LOW/MODERATE/HIGH/SEVERE
console.log('Fatigue score:', validation.fatigueScore); // 0-100

// Example conflict object:
{
  type: 'excessive_consecutive_days',
  message: 'Guard has worked 13 consecutive days (UK HSE recommends max 12)',
  severity: 'blocking',
  details: {
    consecutiveDays: 13,
    maxRecommended: 12,
    regulation: 'UK Health & Safety Executive Guidelines'
  }
}
```

---

### 4. Role-Based Access Control (RBAC)
**File:** `/src/lib/rbac.js` (480 lines)

7-role hierarchy with 40+ granular permissions.

**Roles:**
1. **SUPER_ADMIN:** All permissions
2. **ADMIN:** Full operations (no critical system changes)
3. **MANAGER:** Operations + reporting (no user deletion, no system settings)
4. **SUPERVISOR:** Schedule + incidents management
5. **GUARD:** Own data only (schedule, profile, incidents)
6. **CLIENT:** Own sites only (schedules, sites, incidents)
7. **READONLY:** View-only access across all data

**Permission Categories (40+ permissions):**
- **Users (5):** view, create, edit, delete, roles
- **Schedule (8):** view, view_all, create, edit, delete, publish, assign, bulk
- **Guards (5):** view, create, edit, delete, compliance
- **Clients (4):** view, create, edit, delete
- **Sites (4):** view, create, edit, delete
- **Finance (4):** view, create, edit, approve
- **Payroll (3):** view, process, approve
- **Incidents (5):** view, view_all, create, edit, delete
- **Reports (3):** view, export, financial
- **Audit (2):** view, export
- **Settings (3):** view, edit, system
- **Data (3):** export, import, delete

**Access Control Functions:**

```javascript
import { hasPermission, canAccess, filterByAccess } from '../lib/rbac';

// Check single permission
if (hasPermission(user, 'schedule:create')) {
  // User can create schedules
}

// Check resource access with ownership
const canEdit = canAccess(user, 'shift', 'edit', shift);
// Guards: Only if shift.guardId === user.$id
// Clients: Only if shift.clientId === user.$id
// Admins: Always true

// Filter data by access
const visibleShifts = filterByAccess(user, allShifts, 'shift');
// Guards see only their shifts
// Clients see only their sites' shifts
// Admins see all shifts
```

**Row-Level Security (RLS) Rules:**
- **Guards:** `guardId === user.$id` OR user is admin/manager
- **Clients:** `clientId === user.$id` OR user is admin/manager
- **Admins/Managers:** Full access to all data

**Dynamic Navigation:**
```javascript
import { getAccessibleNavigation } from '../lib/rbac';

const menuItems = getAccessibleNavigation(user);
// Returns only items user has permission to view

// Example for GUARD role:
[
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/my-schedule', label: 'My Schedule', icon: '📅' },
  { path: '/open-shifts', label: 'Open Shifts', icon: '🔓' }
]
```

---

### 5. Bulk Operations
**File:** `/src/lib/bulkOperations.js` (400 lines)

8 mass schedule operations for efficiency.

#### `bulkDeleteShifts(shifts, startDate, endDate, filters)`
Delete multiple shifts by date range:
```javascript
const result = bulkDeleteShifts(
  allShifts,
  '2025-01-01',
  '2025-01-31',
  {
    siteId: 'site-1', // Optional: Only this site
    status: 'draft',  // Optional: Only drafts
    includeCompleted: false, // Safety: Don't delete completed
    includeLocked: false     // Safety: Don't delete locked
  }
);
// Returns: { success, deleted: count, shifts: [] }
```

#### `bulkCopyShifts(shifts, sourceStart, sourceEnd, targetStart, options)`
Copy shifts to new dates:
```javascript
const result = bulkCopyShifts(
  allShifts,
  '2025-01-01', // Source start
  '2025-01-07', // Source end
  '2025-01-08', // Target start (auto-calculates offset)
  {
    copySiteId: true,        // Keep same site
    copyGuardId: false,      // Clear assignments
    clearAssignments: true,  // Remove guard
    adjustStatus: 'draft'    // Set to draft
  }
);
// Returns: { success, copied: count, shifts: [] }
```

#### `createRecurringShifts(template, startDate, endDate, recurrence)`
Generate recurring shift patterns:
```javascript
// Weekly pattern
const result = createRecurringShifts(
  shiftTemplate,
  '2025-01-01',
  '2025-03-31',
  {
    frequency: 'weekly',
    pattern: {
      interval: 1,           // Every week
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri (0=Sun, 6=Sat)
      excludeDates: ['2025-02-14'] // Valentine's Day off
    }
  }
);

// Monthly pattern
const result = createRecurringShifts(
  shiftTemplate,
  '2025-01-01',
  '2025-12-31',
  {
    frequency: 'monthly',
    pattern: {
      interval: 1,      // Every month
      dayOfMonth: 15    // 15th of each month
    }
  }
);
// Returns: { success, created: count, shifts: [], recurrenceId }
```

#### `autoFillShifts(unassignedShifts, availableGuards, rankingFunction)`
Intelligent auto-assignment:
```javascript
import { rankGuardsForShift } from '../lib/staffIntelligence';

const result = autoFillShifts(
  unassignedShifts,
  availableGuards,
  rankGuardsForShift // Uses intelligent ranking
);

// Each assigned shift has:
// - autoAssigned: true
// - assignmentScore: 0-100
// - assignedAt: timestamp

console.log(`Assigned: ${result.assigned}, Failed: ${result.failed}`);
```

#### Other Operations:
- `bulkUpdateShifts(shifts, shiftIds, updates)` - Mass property changes
- `bulkAssignGuards(shifts, assignments)` - Multi-shift assignments
- `bulkPublishShifts(shifts, shiftIds, options)` - Mass publishing
- `generateShiftReport(shifts, startDate, endDate)` - Analytics

---

### 6. GPS Clock-In/Out System
**File:** `/src/lib/gpsClockIn.js` (380 lines)  
**UI:** `/src/components/GPSClockIn.jsx` (350 lines)

Location-verified time tracking with geofencing.

**Core Functions:**

#### `getCurrentPosition()`
HTML5 Geolocation API wrapper:
```javascript
const position = await getCurrentPosition();
// Returns: { latitude, longitude, accuracy, timestamp }
// Options: { enableHighAccuracy: true, timeout: 10000 }
```

#### `calculateDistance(lat1, lon1, lat2, lon2)`
Haversine formula for GPS distance:
```javascript
const distance = calculateDistance(
  51.5074, -0.1278, // Current location
  51.5155, -0.0922  // Site location
);
// Returns: distance in meters (integer)
```

#### `verifyGeofence(currentLocation, siteLocation, radius=100)`
Check if within geofence:
```javascript
const verification = verifyGeofence(
  currentLocation,
  siteLocation,
  100 // Default radius: 100 meters
);

// Returns:
{
  withinGeofence: true/false,
  distance: 45, // meters
  radius: 100,
  accuracy: 'high', // high/medium/low/unavailable
  verified: true,   // withinGeofence AND good accuracy
  message: 'Within geofence, GPS verified'
}
```

**Accuracy Levels:**
- **HIGH (<10m):** Green, verified
- **MEDIUM (10-50m):** Yellow, acceptable
- **LOW (>50m):** Orange, warning
- **UNAVAILABLE:** Red, cannot verify

#### `clockIn(guard, shift, site)`
GPS-verified clock-in:
```javascript
const result = await clockIn(guard, shift, site);

if (result.success) {
  console.log('Clock-in record:', result.record);
  // {
  //   id, guardId, shiftId, siteId,
  //   status: 'clocked_in',
  //   clockInTime: '2025-01-15T09:00:00Z',
  //   location: { latitude, longitude, accuracy },
  //   geofenceVerified: true,
  //   distance: 45
  // }
  
  if (result.warning) {
    console.warn(result.warning); // Outside geofence warning
  }
}
```

#### `clockOut(guard, shift, site, clockInRecord)`
GPS-verified clock-out with duration:
```javascript
const result = await clockOut(guard, shift, site, clockInRecord);

if (result.success) {
  console.log('Duration:', result.duration);
  // {
  //   milliseconds: 28800000,
  //   hours: 8.0,
  //   formatted: '8h 0m'
  // }
}
```

#### Break Tracking:
```javascript
// Start break
const breakRecord = await startBreak(guard, clockInRecord);

// End break
const result = await endBreak(guard, breakRecord);
console.log(`Break duration: ${result.breakDuration} minutes`);
```

**UI Component Features:**
- **Real-time elapsed time counter**
- **GPS status display** with accuracy indicator
- **Geofence verification** visual feedback
- **Mobile-optimized interface**
- **Color-coded status** (green=working, yellow=break, gray=off)
- **Clock-in details panel** with location coordinates
- **Warning messages** for outside geofence
- **Refresh location button**

**Demo Site Locations:**
```javascript
{
  'site-1': { latitude: 51.5074, longitude: -0.1278 }, // Central London
  'site-2': { latitude: 51.5155, longitude: -0.0922 }, // City of London
  'site-3': { latitude: 51.4545, longitude: -0.1087 }  // South London
}
```

---

### 7. Advanced Filtering System
**File:** `/src/lib/advancedFiltering.js` (420 lines)  
**UI:** `/src/components/AdvancedFilterPanel.jsx` (430 lines)

Complex query building with site groups and saved filters.

**Filter Operators (12):**
- `equals`, `not_equals`
- `contains`, `not_contains`
- `starts_with`, `ends_with`
- `greater_than`, `less_than`, `between`
- `in`, `not_in`
- `is_empty`, `is_not_empty`

**Filterable Fields:**
- **Shift:** date, status, siteId, guardId, startTime, urgency
- **Guard:** firstName, lastName, status, siaLicenseExpiry
- **Site:** siteName, siteGroup, clientId

**Usage:**
```javascript
import { createFilter, applyFilters } from '../lib/advancedFiltering';

// Create filters
const filters = [
  createFilter('shift.date', 'between', ['2025-01-01', '2025-01-31']),
  createFilter('shift.status', 'in', ['draft', 'offered']),
  createFilter('shift.guardId', 'is_empty', null)
];

// Apply with AND logic (all must match)
const filtered = applyFilters(allShifts, filters, 'AND');

// Apply with OR logic (any can match)
const filtered = applyFilters(allShifts, filters, 'OR');
```

**Saved Filters:**
```javascript
import { saveFilter, getSavedFilters } from '../lib/advancedFiltering';

// Save filter
const saved = saveFilter(
  'Unassigned Urgent Shifts',
  filters,
  'AND',
  { userId: currentUser.$id }
);

// Load saved filters
const allSaved = getSavedFilters();
```

**Site Groups:**
```javascript
import { createSiteGroup, filterByGroup } from '../lib/advancedFiltering';

// Create group
const group = createSiteGroup(
  'Retail Sites',
  ['site-1', 'site-4'],
  {
    color: '#10B981',
    description: 'Shopping centers and retail locations'
  }
);

// Filter by group
const retailShifts = filterByGroup(allShifts, 'group-1');
```

**Quick Filters (6 built-in):**
- **UNASSIGNED_SHIFTS:** No guardId
- **TODAY:** Date equals today
- **THIS_WEEK:** Date within next 7 days
- **URGENT_SHIFTS:** Urgency high/urgent
- **EXPIRING_LICENSES:** Expiry within 30 days
- **NIGHT_SHIFTS:** Start time > 22:00

**UI Component Features:**
- **4 tabs:** Custom Filters, Quick Filters, Saved Filters, Site Groups
- **Visual filter builder** with field/operator/value selectors
- **AND/OR logic selector** for multiple conditions
- **Save/load filters** with name and description
- **Site group cards** with color coding
- **Active filters summary** showing count and logic
- **Export/import filters** as JSON

---

## Integration Guide

### 1. Add Client Portal to Navigation
```javascript
// In App.jsx
import ClientPortal from './pages/portal/ClientPortal';

<Route path="portal">
  <Route path="client-portal" element={<ClientPortal />} />
</Route>
```

### 2. Use Intelligent Ranking in Scheduling
```javascript
import { rankGuardsForShift } from '../lib/staffIntelligence';

const handleAssignShift = (shift) => {
  const rankings = rankGuardsForShift(
    availableGuards,
    shift,
    allShifts,
    { includeScore: true }
  );
  
  const recommended = rankings.filter(r => r.recommended);
  setGuardOptions(recommended);
};
```

### 3. Validate with Advanced Conflicts
```javascript
import { advancedConflictDetection } from '../lib/advancedConflictRules';

const validateAssignment = (shift, guard) => {
  const validation = advancedConflictDetection(
    shift,
    guard,
    allShifts,
    guardSchedule,
    { strictMode: true }
  );
  
  if (!validation.valid) {
    showConflicts(validation.conflicts.blocking);
    return false;
  }
  
  if (validation.fatigueRisk === 'HIGH' || validation.fatigueRisk === 'SEVERE') {
    showFatigueWarning(validation.fatigueScore);
  }
  
  return true;
};
```

### 4. Implement RBAC
```javascript
import { hasPermission, canAccess, filterByAccess } from '../lib/rbac';

// Check permission before action
if (!hasPermission(currentUser, 'schedule:delete')) {
  alert('You do not have permission to delete schedules');
  return;
}

// Filter data by access
const visibleShifts = filterByAccess(currentUser, allShifts, 'shift');

// Check resource-level access
if (!canAccess(currentUser, 'shift', 'edit', shift)) {
  alert('You cannot edit this shift');
  return;
}
```

### 5. Add GPS Clock-In to My Schedule
```javascript
import GPSClockIn from '../components/GPSClockIn';

const MySchedule = () => {
  const [selectedShift, setSelectedShift] = useState(null);
  
  return (
    <div>
      {selectedShift && (
        <GPSClockIn
          guard={currentGuard}
          shift={selectedShift}
          site={getSite(selectedShift.siteId)}
        />
      )}
    </div>
  );
};
```

### 6. Add Bulk Operations to Scheduling Page
```javascript
import { bulkDeleteShifts, createRecurringShifts } from '../lib/bulkOperations';

const handleBulkDelete = () => {
  const result = bulkDeleteShifts(
    shifts,
    startDate,
    endDate,
    { siteId: selectedSite, status: 'draft' }
  );
  alert(`Deleted ${result.deleted} shifts`);
};

const handleCreateRecurring = () => {
  const result = createRecurringShifts(
    template,
    startDate,
    endDate,
    { frequency: 'weekly', pattern: { daysOfWeek: [1, 3, 5] } }
  );
  alert(`Created ${result.created} recurring shifts`);
};
```

### 7. Add Advanced Filtering to Data Tables
```javascript
import AdvancedFilterPanel from '../components/AdvancedFilterPanel';

const SchedulePage = () => {
  const [filteredShifts, setFilteredShifts] = useState(allShifts);
  
  return (
    <div>
      <AdvancedFilterPanel
        data={allShifts}
        onFilterChange={setFilteredShifts}
        entityType="shift"
      />
      <ShiftTable shifts={filteredShifts} />
    </div>
  );
};
```

---

## Appwrite Backend Setup

### Collections to Create:

#### 1. clock_in_records
```javascript
{
  guardId: string (required),
  shiftId: string (required),
  siteId: string (required),
  status: string (required), // clocked_out, clocked_in, on_break
  clockInTime: datetime,
  clockOutTime: datetime,
  location: {
    latitude: number,
    longitude: number,
    accuracy: number
  },
  geofenceVerified: boolean,
  distance: number,
  breaks: [
    { startTime: datetime, endTime: datetime, location: object }
  ]
}
```

#### 2. saved_filters
```javascript
{
  name: string (required),
  filters: array (required),
  logic: string (required),
  userId: string (required),
  createdAt: datetime,
  updatedAt: datetime
}
```

#### 3. site_groups
```javascript
{
  name: string (required),
  siteIds: array (required),
  color: string,
  description: string,
  createdAt: datetime,
  updatedAt: datetime
}
```

#### 4. guard_rankings
```javascript
{
  guardId: string (required),
  overallScore: number (0-100),
  tier: string, // platinum, gold, silver, bronze, standard
  factors: {
    reliability: number,
    experience: number,
    certifications: number,
    feedback: number,
    incidents: number,
    continuity: number
  },
  calculatedAt: datetime
}
```

### Row-Level Security Rules:

```javascript
// clock_in_records - Guards see only their records
read: roles.includes('guard') ? [guardId] === $user.$id : true
write: roles.includes('guard') ? [guardId] === $user.$id : true

// saved_filters - Users see only their filters
read: [userId] === $user.$id || roles.includes('admin')
write: [userId] === $user.$id

// site_groups - All can read, admins can write
read: true
write: roles.includes('admin') || roles.includes('manager')

// guard_rankings - Guards see only their ranking
read: roles.includes('guard') ? [guardId] === $user.$id : true
write: roles.includes('admin') || roles.includes('manager')
```

---

## Performance Considerations

### 1. Ranking Calculations
Expensive for large teams (100+ guards):
- **Cache rankings:** Store in `guard_rankings` collection
- **Recalculate:** Daily batch job or on-demand
- **Use pre-calculated scores** for real-time assignments

### 2. Advanced Conflict Detection
18 rules per validation:
- **Optimize queries:** Fetch only relevant shifts (same guard, date range)
- **Cache guard schedules:** Avoid recalculating consecutive days
- **Parallel checks:** Run independent rules concurrently

### 3. Bulk Operations
10,000+ shifts:
- **Batch processing:** Process 100-500 shifts at a time
- **Background jobs:** Use Appwrite functions for large operations
- **Progress indicators:** Show real-time progress to users

### 4. GPS Clock-In
High frequency operations:
- **Debounce location updates:** Max 1 request per 5 seconds
- **Offline support:** Queue clock-ins when offline, sync later
- **Optimize audit logs:** Batch GPS logs, write every 5 minutes

### 5. Advanced Filtering
Complex queries on large datasets:
- **Index filterable fields:** Add database indexes
- **Limit results:** Paginate to 50-100 items
- **Lazy loading:** Fetch filtered data on-demand

---

## Testing Checklist

### Client Portal
- [ ] Read-only access (no edit/delete buttons)
- [ ] Calendar view groups shifts by date
- [ ] List view sorts correctly
- [ ] Statistics calculate accurately
- [ ] Site filter works
- [ ] Date range filter works
- [ ] CSV export includes all data
- [ ] Mobile responsive

### Staff Intelligence
- [ ] Guard scores calculate correctly (0-100)
- [ ] Ranking considers all 6 factors
- [ ] Tier bonuses apply correctly
- [ ] Hour balance analysis accurate
- [ ] Emergency fill suggestions valid
- [ ] Performance trends detect correctly

### Advanced Conflicts
- [ ] All 18 rule types detect correctly
- [ ] Fatigue scoring cumulative (0-100)
- [ ] Risk levels assign correctly
- [ ] UK regulations referenced
- [ ] Severity levels appropriate
- [ ] Blocking conflicts prevent assignment

### RBAC
- [ ] All 7 roles have correct permissions
- [ ] Guards see only their data
- [ ] Clients see only their sites
- [ ] Admins see all data
- [ ] Dynamic navigation filters correctly
- [ ] Resource-level access enforced

### Bulk Operations
- [ ] Delete range works with filters
- [ ] Copy calculates offset correctly
- [ ] Recurring patterns generate correctly
- [ ] Auto-fill uses intelligent ranking
- [ ] Audit logs capture all operations
- [ ] Large datasets (1000+ shifts) perform well

### GPS Clock-In
- [ ] Location permissions requested
- [ ] Geofence verification accurate (±100m)
- [ ] Accuracy levels display correctly
- [ ] Clock-in/out timestamps correct
- [ ] Duration calculation accurate
- [ ] Break tracking works
- [ ] Outside geofence warnings show
- [ ] Works on mobile devices

### Advanced Filtering
- [ ] All 12 operators work correctly
- [ ] AND/OR logic applies correctly
- [ ] Saved filters persist
- [ ] Site groups filter correctly
- [ ] Quick filters work
- [ ] Export/import filters
- [ ] UI updates in real-time

---

## Next Steps

### Phase 4 Recommendations:
1. **Mobile App:** React Native app with native GPS tracking
2. **Real-time Notifications:** Push notifications for assignments, GPS alerts
3. **Advanced Analytics:** Performance dashboards, trend analysis
4. **Client Self-Service:** Client portal with incident reporting, invoice viewing
5. **AI Predictions:** Predict no-shows, suggest optimal staffing levels
6. **Integration APIs:** Payroll integration, third-party security systems
7. **Compliance Automation:** Auto-generate compliance reports, license renewal reminders
8. **Multi-language Support:** i18n for international operations

### Immediate UI Integration:
1. Add GPS clock-in button to My Schedule page
2. Add bulk operations modal to Scheduling page
3. Add advanced filter panel to all data tables
4. Add staff ranking display to Guards page
5. Show conflict warnings in assignment modals
6. Add RBAC permission checks to all actions
7. Add client portal link to navigation

---

## Support & Documentation

### Key Files:
- **Libraries:** `/src/lib/*.js` (6 files, 2,710 lines)
- **Components:** `/src/components/` (3 new components)
- **Pages:** `/src/pages/portal/ClientPortal.jsx`

### Demo Data:
- All libraries include `generateDemo*()` functions
- 4 demo users (admin, manager, guard, client)
- 6 demo guards with performance data
- 5 demo sites with GPS coordinates
- 12 demo shifts for client portal

### Audit Logging:
All operations are logged with:
- `AUDIT_ACTION.BULK_CREATE/UPDATE/DELETE`
- `AUDIT_ACTION.GPS_CLOCK_IN/OUT`
- `AUDIT_ACTION.ACCESS_DENIED`
- Full metadata and user context

### Error Handling:
All functions return structured responses:
```javascript
{
  success: true/false,
  data: {...},
  error: 'Error message',
  warning: 'Warning message'
}
```

---

## Conclusion

Phase 3 delivers enterprise-grade features:
- ✅ **Client Portal:** Read-only access for clients
- ✅ **Staff Intelligence:** 0-100 scoring with 6 factors
- ✅ **Advanced Conflicts:** 18 rules across 4 categories
- ✅ **RBAC:** 7 roles, 40+ permissions
- ✅ **Bulk Operations:** 8 mass operations
- ✅ **GPS Tracking:** Location-verified time tracking
- ✅ **Advanced Filtering:** Complex queries with saved filters

Transform FortisSecured into a comprehensive workforce management platform with intelligence, compliance, security, and efficiency.
