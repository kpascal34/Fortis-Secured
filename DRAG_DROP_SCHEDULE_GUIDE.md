# Drag-and-Drop Interactive Schedule UI

## Overview

A fully-featured interactive calendar system for scheduling shifts with drag-and-drop functionality. Features real-time updates, collision detection, automatic layout management for overlapping shifts, and both single-day and multi-day views.

**Key Capabilities:**
- 🖱️ **Drag to move** shifts to different times
- ↕️ **Drag to resize** shifts dynamically
- ➕ **Click to create** new shifts instantly
- 📅 **Multi-day views** with week navigation
- 🔄 **Automatic collision detection** and overlap handling
- 📊 **Schedule statistics** and analytics
- 📤 **Export to JSON** for integration
- ♿ **Responsive design** across all devices

---

## Architecture

### Core Files

#### 1. **`src/lib/dragDropSchedule.js`** (470+ lines)
Utility library with all scheduling logic and calculations.

**Key Utilities:**

```javascript
// Time conversions
timeStringToMinutes('14:30')  // → 870
minutesToTimeString(870)      // → "14:30"
getMinutesBetweenTimes('09:00', '17:00')  // → 480

// Grid positioning (30-min slots)
pixelsToMinutes(60)           // → 30 minutes
minutesToPixels(30)           // → 60 pixels
snapToGrid(57)                // → 60 (rounded to nearest slot)

// Collision detection
checkTimeOverlap(shift1, shift2)  // → true/false
getOverlappingShifts(shift, allShifts)  // → [overlapping]
canPlaceShift(shift, allShifts)   // → validation result

// Layout calculations
calculateShiftLayout(shiftsForDay)  // → layout with columns
getShiftPosition(shift)     // → {top, height}
getShiftFromPosition(top, height)  // → {startTime, endTime}

// Constraints and validation
validateShiftMove(shift, newStart, newEnd, allShifts)
getResizeConstraints(shift)  // → {minTop, maxTop, ...}
formatShiftDisplay(shift)    // → {timeRange, duration}
```

**Constants:**
```javascript
SLOT_HEIGHT = 30              // pixels per 30-min slot
SLOT_DURATION = 30            // minutes per slot
MIN_SHIFT_DURATION = 30       // 30 minutes minimum
MAX_SHIFT_DURATION = 720      // 12 hours maximum
BUSINESS_HOURS = {START: 480, END: 1020}  // 8 AM - 5 PM
```

---

#### 2. **`src/components/DragDropSchedule.jsx`** (400+ lines)
Single-day interactive calendar with full drag-and-drop.

**Props:**
```javascript
{
  shifts: Array,              // Array of shift objects
  onShiftsChange: Function,   // Callback on shift updates
  date: String,              // YYYY-MM-DD format
  dayStartHour: Number,      // 0-23, default 8
  dayEndHour: Number,        // 0-23, default 17
  readonly: Boolean,         // Disable interactions
  siteId: String,            // Associate with site
  staffId: String,           // Associate with staff
  allowOverlap: Boolean,     // Allow overlapping shifts
  onShiftClick: Function,    // Callback when shift clicked
  className: String,         // Custom CSS classes
}
```

**Features:**
- Real-time drag-and-drop with grid snapping
- Resize from bottom edge (30-min increments)
- Click calendar to create shift
- Automatic collision detection
- Multi-column layout for overlaps
- Selected shift details panel
- Delete confirmation

**Shift Object Format:**
```javascript
{
  $id: 'shift_123',
  date: '2024-12-20',
  startTime: '09:00',
  endTime: '12:00',
  title: 'Morning Security',
  description: 'Front entrance patrol',
  status: 'active',
  siteId: 'site_1',
  staffId: 'staff_1',
}
```

---

#### 3. **`src/components/MultiDaySchedule.jsx`** (300+ lines)
Week/multi-day view with navigation and statistics.

**Props:**
```javascript
{
  shifts: Array,              // All shifts
  onShiftsChange: Function,   // Callback
  startDate: Date,           // Start of period
  numDays: Number,           // 7, 14, 30, etc.
  dayStartHour: Number,      // Default 8
  dayEndHour: Number,        // Default 17
  readonly: Boolean,         // Disable edits
  onShiftClick: Function,    // Selection callback
  className: String,         // CSS classes
  groupByStaff: Boolean,     // Group by staff member
  staffList: Array,          // Staff objects for display
}
```

**Features:**
- Week/month navigation (prev/next/today)
- Column-based multi-day layout
- Smart staff grouping
- Day highlighting (today in blue)
- 4-panel statistics (total, period, hours, days)
- Responsive horizontal scrolling
- Click shift for details

---

#### 4. **`src/pages/ScheduleDemo.jsx`** (250+ lines)
Full-featured demo page showcasing all capabilities.

**Routes:**
- `/schedule-demo` - Main demo page
- Single-day tab
- Week view tab
- Export functionality
- Statistics dashboard
- Raw JSON output

---

## Usage Examples

### Basic Single-Day Schedule

```jsx
import DragDropSchedule from '@/components/DragDropSchedule';

export default function MySchedule() {
  const [shifts, setShifts] = useState([
    {
      $id: 'shift_1',
      date: '2024-12-20',
      startTime: '09:00',
      endTime: '12:00',
      title: 'Morning',
      siteId: 'site_1',
      staffId: 'staff_1',
    }
  ]);

  return (
    <DragDropSchedule
      shifts={shifts}
      onShiftsChange={setShifts}
      date="2024-12-20"
      dayStartHour={8}
      dayEndHour={22}
      siteId="site_1"
    />
  );
}
```

### Week View with Staff Grouping

```jsx
import MultiDaySchedule from '@/components/MultiDaySchedule';

export default function WeekSchedule() {
  const [shifts, setShifts] = useState([...]);
  const staff = [
    { $id: 'staff_1', name: 'John' },
    { $id: 'staff_2', name: 'Jane' },
  ];

  return (
    <MultiDaySchedule
      shifts={shifts}
      onShiftsChange={setShifts}
      startDate={new Date()}
      numDays={7}
      groupByStaff={true}
      staffList={staff}
    />
  );
}
```

### Programmatic Shift Creation

```jsx
import {
  validateShiftMove,
  snapTimeToGrid,
  getMinutesBetweenTimes,
} from '@/lib/dragDropSchedule';

// Validate before creating
const newShift = {
  startTime: '14:00',
  endTime: '16:00',
  title: 'Afternoon',
};

const validation = validateShiftMove(
  newShift,
  newShift.startTime,
  newShift.endTime,
  existingShifts
);

if (validation.valid) {
  setShifts([...shifts, newShift]);
} else {
  console.log('Validation failed:', validation.reason);
}
```

### Advanced Layout Calculation

```jsx
import { calculateShiftLayout, checkTimeOverlap } from '@/lib/dragDropSchedule';

// Get optimized layout with columns for overlaps
const dayShifts = shifts.filter(s => s.date === '2024-12-20');
const layout = calculateShiftLayout(dayShifts);

// layout[0] = {
//   ...shift,
//   column: 0,
//   totalColumns: 2
// }
// layout[1] = {
//   ...shift,
//   column: 1,
//   totalColumns: 2
// }
```

---

## Integration with Appwrite

### Setup Application Collection

```javascript
// Create Applications collection in Appwrite
const attributes = [
  { name: 'date', type: 'string' },
  { name: 'startTime', type: 'string' },
  { name: 'endTime', type: 'string' },
  { name: 'title', type: 'string' },
  { name: 'description', type: 'string' },
  { name: 'status', type: 'string' }, // active, completed, cancelled
  { name: 'siteId', type: 'string' },
  { name: 'staffId', type: 'string' },
];
```

### Save to Database

```javascript
import { db } from '@/lib/appwrite';

async function saveShifts(shifts) {
  for (const shift of shifts) {
    await db.createDocument(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      'unique()',
      shift
    );
  }
}

async function updateShift(shiftId, updates) {
  await db.updateDocument(
    DATABASE_ID,
    SHIFTS_COLLECTION_ID,
    shiftId,
    updates
  );
}
```

### Fetch from Database

```javascript
async function fetchShifts(date) {
  const response = await db.listDocuments(
    DATABASE_ID,
    SHIFTS_COLLECTION_ID,
    [Query.equal('date', date)]
  );
  return response.documents;
}
```

---

## Advanced Features

### Collision Detection

```javascript
import { getOverlappingShifts, checkTimeOverlap } from '@/lib/dragDropSchedule';

// Check for conflicts before moving
const conflicts = getOverlappingShifts(shift, allShifts);
if (conflicts.length > 0) {
  console.log('Cannot move - overlaps with:', conflicts);
}

// Manual overlap check
if (checkTimeOverlap(shift1, shift2)) {
  console.log('These shifts overlap in time');
}
```

### Multi-Column Layout for Overlaps

```javascript
import { calculateShiftLayout } from '@/lib/dragDropSchedule';

const layout = calculateShiftLayout(shiftsForDay);
// Automatically arranges overlapping shifts in columns
// Each shift gets: column index and totalColumns count

layout.forEach(shift => {
  const columnWidth = 100 / shift.totalColumns;
  const columnLeft = shift.column * columnWidth;
  // Use for CSS positioning
});
```

### Time Snapping

```javascript
import { snapTimeToGrid, snapToGrid } from '@/lib/dragDropSchedule';

// Snap time string to nearest 30-min slot
const snapped = snapTimeToGrid('14:37'); // → '14:30'

// Snap pixel position to grid
const snappedPixels = snapToGrid(67); // → 60 (SLOT_HEIGHT = 30)
```

### Resize Constraints

```javascript
import { getResizeConstraints, MIN_SHIFT_DURATION, MAX_SHIFT_DURATION } from '@/lib/dragDropSchedule';

const constraints = getResizeConstraints(shift);
// Returns:
// {
//   minTop: 240,      // Can't drag above this
//   maxTop: 900,      // Can't drag below this
//   minHeight: 30,    // 30-minute minimum
//   maxHeight: 720,   // 12-hour maximum
// }
```

---

## Performance Optimization

### Large Schedule Rendering

For schedules with 100+ shifts:

```javascript
// 1. Use React.memo to prevent re-renders
const ShiftComponent = React.memo(({ shift, ...props }) => {
  return <div>{shift.title}</div>;
});

// 2. Virtualize long lists
import { FixedSizeList } from 'react-window';

// 3. Debounce drag updates
import { debounce } from 'lodash';
const debouncedUpdate = debounce(updateShift, 100);

// 4. Filter shifts by date to reduce DOM nodes
const visibleShifts = shifts.filter(s => s.date === currentDate);
```

### CSS Animations

```css
/* Smooth transitions for drag operations */
.shift {
  transition: all 0.1s ease-out;
}

/* Disable animation during drag */
.shift.dragging {
  transition: none;
  opacity: 0.7;
}

/* GPU acceleration for better performance */
.schedule-container {
  will-change: transform;
  transform: translateZ(0);
}
```

---

## Accessibility Features

### Keyboard Navigation

```jsx
// Add keyboard support
const handleKeyDown = (e) => {
  if (e.key === 'Delete' && selectedShift) {
    deleteShift(selectedShift.$id);
  }
  if (e.key === 'Escape') {
    setSelectedShift(null);
  }
  // Arrow keys for moving shifts
  if (e.key === 'ArrowUp' && selectedShift) {
    moveShiftUp(selectedShift);
  }
};
```

### ARIA Labels

```jsx
<div
  role="button"
  aria-label={`${shift.title} from ${shift.startTime} to ${shift.endTime}`}
  aria-selected={isSelected}
  draggable={!readonly}
>
  {shift.title}
</div>
```

---

## API Reference

### Time Utilities

| Function | Input | Output | Example |
|----------|-------|--------|---------|
| `timeStringToMinutes` | "14:30" | number | 870 |
| `minutesToTimeString` | 870 | string | "14:30" |
| `getMinutesBetweenTimes` | "09:00", "17:00" | number | 480 |
| `addMinutesToTime` | "14:00", 60 | string | "15:00" |
| `snapTimeToGrid` | "14:37" | string | "14:30" |

### Grid Utilities

| Function | Input | Output |
|----------|-------|--------|
| `pixelsToMinutes` | 60 | 30 |
| `minutesToPixels` | 30 | 60 |
| `timeToPixels` | "09:00", 480 | 0 |
| `pixelsToTime` | 240, 480 | "12:00" |
| `snapToGrid` | 67 | 60 |

### Layout & Validation

| Function | Returns | Purpose |
|----------|---------|---------|
| `calculateShiftLayout` | Array | Multi-column layout for overlaps |
| `getShiftPosition` | {top, height} | Pixel position of shift |
| `checkTimeOverlap` | Boolean | Do two shifts overlap? |
| `validateShiftMove` | {valid, reason} | Can shift be moved? |
| `getResizeConstraints` | Object | Min/max boundaries |
| `formatShiftDisplay` | Object | Human-readable format |

---

## Styling & Customization

### CSS Variables

```css
/* Customize colors */
:root {
  --shift-bg: linear-gradient(to right, #3b82f6, #1d4ed8);
  --shift-border: #1e40af;
  --shift-hover: #1e3a8a;
  --grid-bg: #f3f4f6;
  --grid-line: #e5e7eb;
}
```

### Component Classes

```jsx
// Main container
<div className="draggable-schedule">
  
  // Header section
  <div className="schedule-header">
    <h3 className="schedule-title">Schedule</h3>
    <button className="schedule-btn-new">New Shift</button>
  </div>

  // Calendar grid
  <div className="schedule-grid">
    
    // Time column
    <div className="schedule-time-column">
      <div className="schedule-time-label">08:00</div>
    </div>

    // Shifts container
    <div className="schedule-shifts">
      <div className="schedule-shift">
        <p className="shift-title">Morning</p>
        <p className="shift-time">09:00 - 12:00</p>
      </div>
    </div>
  </div>

  // Details panel
  <div className="shift-details">
    <h4 className="shift-details-title">Morning</h4>
    <p className="shift-details-time">09:00 - 12:00</p>
  </div>
}
```

---

## Demo Page

Visit `/schedule-demo` to explore:

1. **Single-Day View**
   - Create shifts by clicking calendar
   - Drag to move
   - Drag bottom edge to resize
   - Select shift for details
   - Delete selected shift
   - Date picker for testing

2. **Week View**
   - Navigate weeks (prev/next/today)
   - Multi-day visualization
   - Staff grouping
   - Statistics dashboard
   - 4-metric overview

3. **Export**
   - Download schedule as JSON
   - Import/restore functionality
   - Format suitable for database

4. **Features Showcase**
   - Feature cards with descriptions
   - JSON output preview
   - Statistics tracking

---

## Troubleshooting

### Issue: Shifts won't move
**Solution:** Check `readonly` prop is not true, ensure touch events are enabled

### Issue: Overlapping shifts not showing in columns
**Solution:** Verify `calculateShiftLayout` is called, check CSS `width` percentage

### Issue: Performance degradation with many shifts
**Solution:** Filter shifts by date, use `React.memo`, implement virtualization

### Issue: Time calculations incorrect
**Solution:** Verify time format is 24-hour "HH:MM", dates are "YYYY-MM-DD"

### Issue: Drag not responsive
**Solution:** Check `onMouseMove` listeners are attached, verify `ref` is set

---

## Browser Support

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+
✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Future Enhancements

- [ ] Recurring shift templates
- [ ] Batch edit operations
- [ ] Shift swaps between staff
- [ ] Notifications and alerts
- [ ] Custom color coding by type
- [ ] Export to iCal/Outlook
- [ ] Mobile optimized touch gestures
- [ ] Time zone support
- [ ] Conflict resolution AI
- [ ] Schedule templates
