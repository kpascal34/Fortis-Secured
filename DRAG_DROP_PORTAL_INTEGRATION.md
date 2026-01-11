# Drag-and-Drop Schedule - Portal Integration Guide

## Overview

The drag-and-drop schedule system has been fully integrated into your Fortis-Secured portal with three key components:

1. **Backend Service** (`dragDropShiftService.js`) - Database operations
2. **Integration Component** (`DragDropScheduleIntegration.jsx`) - Reusable wrapper
3. **Portal Pages** - Scheduling and staff views

---

## New Files Created

### Backend Service
- **`src/lib/dragDropShiftService.js`** (400+ lines)
  - Database operations (create, read, update, delete)
  - Shift filtering and statistics
  - JSON import/export
  - Validation utilities

### Integration Component
- **`src/components/DragDropScheduleIntegration.jsx`** (300+ lines)
  - Combines DragDropSchedule and MultiDaySchedule
  - Handles Appwrite sync
  - Error handling and loading states
  - Statistics display

### Portal Pages
- **`src/pages/portal/SchedulingWithDragDrop.jsx`** (50 lines)
  - Manager/admin scheduling interface
  - Full create/update/delete capabilities

- **`src/pages/portal/StaffScheduleView.jsx`** (250+ lines)
  - Staff personal schedule view
  - Read-only display
  - Shift statistics and information

### Routes Added
```javascript
/portal/scheduling-drag-drop        // Manager scheduling
/portal/my-schedule-view            // Staff schedule view
```

---

## Quick Integration Guide

### 1. Basic Usage in Your Components

#### Simple Implementation
```jsx
import DragDropScheduleIntegration from '@/components/DragDropScheduleIntegration';

export default function MyPage() {
  const handleScheduleChange = (shifts) => {
    console.log('Schedule updated:', shifts);
  };

  return (
    <DragDropScheduleIntegration
      onScheduleChange={handleScheduleChange}
      showMultiDay={true}
      defaultView="single"
    />
  );
}
```

#### With Site Filtering
```jsx
<DragDropScheduleIntegration
  onScheduleChange={handleScheduleChange}
  siteId="site_123"  // Only shows shifts for this site
  showMultiDay={true}
  defaultView="multi"
/>
```

### 2. Using the Backend Service

#### Import the Service
```javascript
import {
  fetchShiftsForDate,
  createShift,
  updateShift,
  deleteShift,
  saveShiftChanges,
  getShiftStats,
} from '@/lib/dragDropShiftService';
```

#### Fetch Shifts
```javascript
// Single date
const shifts = await fetchShiftsForDate('2024-12-20');

// Date range
const shifts = await fetchShiftsForDateRange('2024-12-01', '2024-12-31');

// For specific site
const shifts = await fetchSiteShifts('site_1', '2024-12-01', '2024-12-31');

// For specific staff
const shifts = await fetchStaffShifts('staff_1', '2024-12-01', '2024-12-31');
```

#### Create Shift
```javascript
const newShift = await createShift({
  date: '2024-12-20',
  startTime: '09:00',
  endTime: '12:00',
  title: 'Morning Security',
  siteId: 'site_1',
  staffId: 'staff_1',
});
```

#### Save All Changes
```javascript
const result = await saveShiftChanges(originalShifts, updatedShifts, date);
// Returns: { success, created, updated, deleted, successful, failed }
```

#### Get Statistics
```javascript
const stats = await getShiftStats('2024-12-01', '2024-12-31', 'site_1');
// Returns: { total, byStatus, byDate, totalHours, staffCoverage }
```

### 3. Validation

#### Validate Before Saving
```javascript
import { validateShiftForSave } from '@/lib/dragDropShiftService';

const shift = {
  date: '2024-12-20',
  startTime: '09:00',
  endTime: '12:00',
  siteId: 'site_1',
};

const validation = validateShiftForSave(shift);
if (validation.valid) {
  await createShift(shift);
} else {
  console.log('Errors:', validation.errors);
}
```

---

## Portal Integration Points

### Manager/Admin - Scheduling Page

**Route:** `/portal/scheduling-drag-drop`

Features:
- ✅ Create shifts by clicking calendar
- ✅ Drag to move shifts
- ✅ Drag bottom edge to resize
- ✅ Delete shifts
- ✅ Switch between day/week view
- ✅ Export to JSON
- ✅ Real-time validation
- ✅ Error handling

```jsx
// In PortalNav or header, add link:
<Link to="/portal/scheduling-drag-drop">
  <Calendar size={18} />
  Drag-Drop Schedule
</Link>
```

### Staff Member - My Schedule View

**Route:** `/portal/my-schedule-view`

Features:
- ✅ View assigned shifts (read-only)
- ✅ Day and week views
- ✅ Shift statistics
- ✅ Click shift for details
- ✅ View duration and timing
- ✅ Upcoming shifts highlighted

```jsx
// In PortalNav or header, add link:
<Link to="/portal/my-schedule-view">
  <Calendar size={18} />
  My Schedule
</Link>
```

---

## API Reference

### Service Functions

#### Read Operations

```javascript
// Fetch by date
fetchShiftsForDate(date: string) -> Promise<Shift[]>

// Fetch by date range
fetchShiftsForDateRange(startDate: string, endDate: string) -> Promise<Shift[]>

// Fetch by site
fetchSiteShifts(siteId: string, startDate: string, endDate: string) -> Promise<Shift[]>

// Fetch by staff
fetchStaffShifts(staffId: string, startDate: string, endDate: string) -> Promise<Shift[]>

// Get statistics
getShiftStats(startDate: string, endDate: string, siteId?: string) -> Promise<Stats>
```

#### Write Operations

```javascript
// Create shift
createShift(shiftData: object) -> Promise<Shift>

// Update shift
updateShift(shiftId: string, updates: object) -> Promise<Shift>

// Delete shift
deleteShift(shiftId: string) -> Promise<void>

// Bulk save
saveShiftChanges(original: Shift[], updated: Shift[], date: string) -> Promise<Result>

// Bulk update
bulkUpdateShifts(shifts: Shift[]) -> Promise<number>
```

#### Utility Functions

```javascript
// Transform Appwrite format to drag-drop format
transformShiftsForDragDrop(shifts: AppwriteShift[]) -> Shift[]

// Validate shift data
validateShiftForSave(shift: object) -> { valid: boolean, errors: string[] }

// Export as JSON
exportShiftsToJSON(shifts: Shift[]) -> void

// Import from JSON
importShiftsFromJSON(file: File) -> Promise<Shift[]>
```

### Component Props

#### DragDropScheduleIntegration

```javascript
{
  onScheduleChange?: (shifts: Shift[]) => void,  // Callback on changes
  showMultiDay?: boolean,                        // Show week view toggle
  defaultView?: 'single' | 'multi',              // Starting view
  siteId?: string,                               // Filter by site
}
```

---

## Data Flow Diagram

```
User Interaction
    ↓
DragDropSchedule Component
    ↓
DragDropScheduleIntegration
    ↓
dragDropShiftService
    ↓
Appwrite Database
    ↓
Response
    ↓
UI Update
```

---

## Shift Object Format

When working with shifts in the drag-drop system:

```javascript
{
  // Appwrite fields
  $id: 'shift_unique_id',
  $createdAt: '2024-12-20T10:00:00.000Z',
  $updatedAt: '2024-12-20T10:00:00.000Z',

  // Required fields
  date: '2024-12-20',               // YYYY-MM-DD
  startTime: '09:00',               // HH:MM (24-hour)
  endTime: '12:00',                 // HH:MM (24-hour)
  siteId: 'site_1',                 // Reference to site

  // Optional fields
  title: 'Morning Security',        // Display name
  description: 'Front entrance',    // Details
  status: 'active',                 // active, completed, cancelled
  staffId: 'staff_1',              // Assigned staff
  notes: 'Manager notes',           // Internal notes

  // Custom fields (preserved)
  ...otherFields
}
```

---

## Error Handling

### Common Errors and Solutions

#### "Date is required"
```javascript
// Make sure date is in YYYY-MM-DD format
const shift = { date: '2024-12-20' }; // ✓
const shift = { date: '12/20/2024' }; // ✗
```

#### "Invalid time format (use HH:MM)"
```javascript
const shift = { startTime: '09:00' }; // ✓
const shift = { startTime: '9:00' };  // ✗
```

#### "End time must be after start time"
```javascript
const shift = {
  startTime: '09:00',
  endTime: '12:00'  // ✓ 12:00 is after 09:00
};
```

#### "Site is required"
```javascript
const shift = { siteId: 'site_1' }; // ✓ Must have site ID
```

### Try-Catch Pattern

```javascript
try {
  const shifts = await fetchShiftsForDate('2024-12-20');
  setShifts(shifts);
} catch (error) {
  console.error('Error loading shifts:', error);
  setError('Failed to load shifts: ' + error.message);
}
```

---

## Performance Optimization

### Fetching Strategies

```javascript
// ✓ GOOD: Fetch specific date range
const shifts = await fetchShiftsForDateRange('2024-12-01', '2024-12-31');

// ✗ AVOID: Fetching all shifts ever
const shifts = await fetchShiftsForDate('2024-12-20');
// Then manually filter...
```

### State Management

```javascript
// ✓ GOOD: Only fetch when view changes
useEffect(() => {
  if (view === 'multi') {
    loadWeekShifts();
  }
}, [view]);

// ✗ AVOID: Fetching on every render
const shifts = await fetchShiftsForDate(selectedDate);
```

### Caching Pattern

```javascript
const [shiftCache, setShiftCache] = useState({});

const getCachedShifts = async (date) => {
  if (shiftCache[date]) {
    return shiftCache[date];
  }
  
  const shifts = await fetchShiftsForDate(date);
  setShiftCache({ ...shiftCache, [date]: shifts });
  return shifts;
};
```

---

## Advanced Usage

### Custom Callbacks

```javascript
const handleShiftClick = (shift) => {
  console.log('Shift clicked:', shift);
  // Could open modal, show QR code, log attendance, etc.
};

<DragDropSchedule
  shifts={shifts}
  onShiftClick={handleShiftClick}
/>
```

### Custom Filtering

```javascript
// Filter shifts by status
const activeShifts = shifts.filter(s => s.status === 'active');

// Filter by site
const siteShifts = shifts.filter(s => s.siteId === 'site_1');

// Filter by staff
const staffShifts = shifts.filter(s => s.staffId === 'staff_1');
```

### Batch Operations

```javascript
// Update multiple shifts at once
const updatedShifts = shifts.map(shift => ({
  ...shift,
  status: 'completed',
}));

const result = await saveShiftChanges(shifts, updatedShifts, date);
```

---

## Testing

### Manual Testing Checklist

- [ ] Create a new shift by clicking calendar
- [ ] Drag shift to different time
- [ ] Resize shift by dragging bottom edge
- [ ] Delete shift using details panel
- [ ] Switch between day and week view
- [ ] Export shifts to JSON
- [ ] View shifts in staff personal schedule
- [ ] Check statistics are calculated correctly
- [ ] Test with different dates
- [ ] Verify error messages appear

### Test Data

```javascript
const testShifts = [
  {
    date: '2024-12-20',
    startTime: '08:00',
    endTime: '12:00',
    title: 'Morning',
    siteId: 'site_1',
    staffId: 'staff_1',
  },
  {
    date: '2024-12-20',
    startTime: '13:00',
    endTime: '17:00',
    title: 'Afternoon',
    siteId: 'site_1',
    staffId: 'staff_2',
  },
];
```

---

## Troubleshooting

### Issue: Shifts not showing
**Solution:** 
1. Check date format is `YYYY-MM-DD`
2. Verify shifts exist in database
3. Check siteId filter if applied

### Issue: Can't create shift
**Solution:**
1. Ensure all required fields are set
2. Check date is not in past
3. Verify site is selected

### Issue: Changes not saving
**Solution:**
1. Check internet connection
2. Review error messages
3. Verify Appwrite permissions
4. Check browser console for details

### Issue: Performance degradation
**Solution:**
1. Fetch specific date ranges only
2. Implement pagination for large datasets
3. Use React.memo for shift components
4. Consider virtual scrolling for 100+ shifts

---

## Migration from Old System

If migrating from existing scheduling system:

```javascript
// 1. Export from old system
const oldShifts = getShiftsFromOldSystem();

// 2. Transform to new format
const newShifts = transformShiftsForDragDrop(oldShifts);

// 3. Import into new system
for (const shift of newShifts) {
  await createShift(shift);
}
```

---

## Deployment Checklist

- [ ] Backend service integrated (`dragDropShiftService.js`)
- [ ] Integration component added (`DragDropScheduleIntegration.jsx`)
- [ ] Portal pages created (both scheduling pages)
- [ ] Routes added to App.jsx
- [ ] Navigation updated with new links
- [ ] Environment variables configured
- [ ] Appwrite collections verified
- [ ] Test data created
- [ ] Error handling tested
- [ ] Performance validated
- [ ] Deployed to Vercel

---

## Next Steps

1. **View the demo** → Navigate to `/schedule-demo`
2. **Test scheduling** → Go to `/portal/scheduling-drag-drop`
3. **Check staff view** → Go to `/portal/my-schedule-view`
4. **Review code** → Check integration component and service
5. **Customize** → Adjust colors, timing, permissions as needed
6. **Deploy** → Push to production when ready

---

## Support Resources

- Main guide: `DRAG_DROP_SCHEDULE_GUIDE.md`
- Quick start: `DRAG_DROP_SCHEDULE_QUICKSTART.md`
- API reference: See `dragDropShiftService.js` comments
- Examples: Throughout this document and component files

**Status:** ✅ Ready for production use
