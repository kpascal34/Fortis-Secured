# Drag-and-Drop Schedule - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: View the Demo
Open your browser and navigate to:
```
http://localhost:5173/schedule-demo
```

You'll see an interactive calendar with sample shifts ready to drag around!

### Step 2: Try the Features
In the demo page:
- **Click and drag** a shift to move it to a different time
- **Drag the bottom edge** of a shift to make it longer or shorter
- **Click on the calendar** background to create a new shift
- **Click a shift** to select it and see details
- **Delete button** appears when a shift is selected
- **Toggle tabs** between single-day and week view
- **Export** the schedule as JSON

### Step 3: Use in Your Code

#### Option A: Single-Day Calendar
```jsx
import DragDropSchedule from '@/components/DragDropSchedule';

export default function MyPage() {
  const [shifts, setShifts] = useState([]);

  return (
    <DragDropSchedule
      shifts={shifts}
      onShiftsChange={setShifts}
      date="2024-12-20"
      dayStartHour={8}
      dayEndHour={22}
    />
  );
}
```

#### Option B: Week View
```jsx
import MultiDaySchedule from '@/components/MultiDaySchedule';

export default function MyPage() {
  const [shifts, setShifts] = useState([]);
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

### Step 4: Create Sample Shifts

Add some test data to start:
```javascript
const [shifts, setShifts] = useState([
  {
    $id: 'shift_1',
    date: '2024-12-20',
    startTime: '09:00',
    endTime: '12:00',
    title: 'Morning Shift',
    status: 'active',
    siteId: 'site_1',
    staffId: 'staff_1',
  },
  {
    $id: 'shift_2',
    date: '2024-12-20',
    startTime: '14:00',
    endTime: '18:00',
    title: 'Afternoon Shift',
    status: 'active',
    siteId: 'site_1',
    staffId: 'staff_2',
  },
]);
```

### Step 5: Connect to Database (Optional)

To persist shifts to Appwrite:

```javascript
const handleShiftsChange = async (newShifts) => {
  setShifts(newShifts);
  
  // Save to Appwrite
  for (const shift of newShifts) {
    if (shift.$id?.startsWith('shift_')) {
      // New shift - create
      await createShift(shift);
    } else {
      // Existing shift - update
      await updateShift(shift.$id, shift);
    }
  }
};
```

---

## 📋 Shift Object Format

Every shift needs these properties:

```javascript
{
  $id: 'shift_unique_id',           // Unique identifier
  date: '2024-12-20',               // YYYY-MM-DD format
  startTime: '09:00',               // HH:MM 24-hour format
  endTime: '12:00',                 // HH:MM 24-hour format
  title: 'Morning Security',        // Display name
  description: 'Front entrance',    // Optional details
  status: 'active',                 // active, completed, cancelled
  siteId: 'site_1',                 // Which site
  staffId: 'staff_1',               // Which staff member
  notes: 'Manager notes',           // Optional notes
}
```

---

## 🎮 User Actions & Results

| User Action | What Happens |
|---|---|
| **Drag shift** | Moves to new time, snaps to 30-min grid |
| **Drag shift bottom** | Resizes shift duration |
| **Click calendar** | Creates new 1-hour shift with confirmation |
| **Click shift** | Selects and shows details panel |
| **Click delete** | Removes selected shift (in details panel) |
| **Change date** | Shows different date's schedule |
| **Click prev/next** | Navigates to previous/next week (week view) |
| **Click today** | Jumps to current date (week view) |
| **Export** | Downloads schedule as JSON file |

---

## 🎨 Customize the Schedule

### Change Display Hours
```jsx
<DragDropSchedule
  dayStartHour={6}   // Start at 6 AM
  dayEndHour={20}    // End at 8 PM
/>
```

### Allow Overlapping Shifts
```jsx
<DragDropSchedule
  allowOverlap={true}  // Multiple guards can have same time
/>
```

### Readonly Mode (View-Only)
```jsx
<DragDropSchedule
  readonly={true}  // No dragging or editing allowed
/>
```

### Custom Styling
```jsx
<DragDropSchedule
  className="custom-schedule-class"  // Add custom CSS
/>
```

---

## 🔧 Common Configurations

### Show Business Hours Only
```jsx
<DragDropSchedule
  dayStartHour={8}   // 8 AM
  dayEndHour={17}    // 5 PM
/>
```

### Show Full Day
```jsx
<DragDropSchedule
  dayStartHour={0}   // 12 AM
  dayEndHour={24}    // 12 AM (next day)
/>
```

### Two-Week View
```jsx
<MultiDaySchedule
  numDays={14}  // Show 2 weeks
/>
```

### Group by Staff Member
```jsx
<MultiDaySchedule
  groupByStaff={true}
  staffList={[
    { $id: 'staff_1', name: 'John Smith' },
    { $id: 'staff_2', name: 'Jane Doe' },
  ]}
/>
```

---

## 🔍 Access Utility Functions

Use these functions from the utilities library:

```javascript
import {
  // Time conversion
  timeStringToMinutes,
  minutesToTimeString,
  getMinutesBetweenTimes,
  addMinutesToTime,
  
  // Grid snapping
  snapToGrid,
  snapTimeToGrid,
  pixelsToMinutes,
  minutesToPixels,
  
  // Collision detection
  checkTimeOverlap,
  getOverlappingShifts,
  canPlaceShift,
  
  // Layout
  calculateShiftLayout,
  formatShiftDisplay,
  
  // Validation
  validateShiftMove,
} from '@/lib/dragDropSchedule';

// Example: Format shift for display
const shift = { startTime: '09:00', endTime: '12:00' };
const display = formatShiftDisplay(shift);
console.log(display); // { timeRange: '09:00 - 12:00', duration: '3h' }

// Example: Check for overlaps
const hasConflict = getOverlappingShifts(newShift, allShifts).length > 0;
```

---

## 🐛 Quick Troubleshooting

### Shifts won't move
**Check:** `readonly={false}` prop is set (default is false)

### Can't see the schedule
**Check:** CSS is loaded, Tailwind is working, parent has height

### Time shows wrong
**Check:** Using 24-hour format "HH:MM", e.g., "14:30" not "2:30 PM"

### Shifts overlap incorrectly
**Check:** `allowOverlap={true}` if you want overlaps to be allowed

### Performance is slow
**Filter shifts by date:** `shifts.filter(s => s.date === currentDate)`

---

## 📚 Full Documentation

For more details, see:
- **DRAG_DROP_SCHEDULE_GUIDE.md** - Complete reference (400+ lines)
- **DRAG_DROP_APPWRITE_INTEGRATION.md** - Database setup
- **DRAG_DROP_SCHEDULE_CHECKLIST.md** - Implementation checklist

---

## 🎯 Next Steps

1. ✅ View demo at `/schedule-demo`
2. ✅ Try dragging and resizing shifts
3. ✅ Copy component code to your page
4. ✅ Add sample shift data
5. ✅ Connect to Appwrite (see integration guide)
6. ✅ Customize colors and styling
7. ✅ Test with real data

---

## 💡 Pro Tips

### Tip 1: Grid Snapping
Shifts always snap to 30-minute intervals automatically. This makes schedules clean and organized.

### Tip 2: Collision Detection
The system automatically prevents overlapping shifts unless you allow it with `allowOverlap={true}`.

### Tip 3: Multi-Column Layout
When shifts overlap, they render side-by-side automatically. No configuration needed!

### Tip 4: Export & Import
Use JSON export to backup schedules or transfer between systems.

### Tip 5: Staff Grouping
Group shifts by staff member in week view to see individual availability.

---

## 🎓 Examples in Demo

The demo page at `/schedule-demo` includes:

1. **Single-Day Calendar**
   - Create shifts by clicking
   - Drag to move (30-min grid)
   - Drag edge to resize
   - Click for details
   - Delete functionality

2. **Week Calendar**
   - 7-day view with navigation
   - Today highlighted in blue
   - Shift statistics
   - Optional staff grouping

3. **Export Feature**
   - Download as JSON
   - Database-ready format
   - Import/restore capability

4. **Statistics**
   - Total shifts
   - Total hours
   - Coverage count
   - Period days

---

## 🚀 You're Ready!

The drag-and-drop schedule is ready to use. Start with:
1. Open `/schedule-demo`
2. Try the features
3. Copy code to your page
4. Customize for your needs

**Questions?** See the full guides or check the demo page code! 🎉
