# Appwrite Integration Guide - Drag-and-Drop Schedule

## Database Schema Setup

### 1. Create Shifts Collection

In your Appwrite Console:

```
Name: shifts
Database: your-database-id
Permissions: Read/Write for authenticated users
```

### 2. Create Collection Attributes

Add these attributes to your `shifts` collection:

| Attribute Name | Type | Required | Size | Notes |
|---|---|---|---|---|
| `date` | String | Yes | 10 | Format: YYYY-MM-DD |
| `startTime` | String | Yes | 5 | Format: HH:MM (24-hour) |
| `endTime` | String | Yes | 5 | Format: HH:MM (24-hour) |
| `title` | String | No | 100 | Shift name/type |
| `description` | String | No | 500 | Additional details |
| `status` | String | No | 20 | active, completed, cancelled |
| `siteId` | String | Yes | 50 | Reference to site |
| `staffId` | String | No | 50 | Reference to guard/staff |
| `notes` | String | No | 500 | Manager notes |

### 3. Create Indexes

For optimal performance, create these indexes:

```
Index 1: date (Ascending)
Index 2: date, siteId (Ascending, Ascending)
Index 3: staffId, date (Ascending, Ascending)
Index 4: status (Ascending)
```

---

## Implementation Steps

### Step 1: Update Environment Variables

**`.env.local`:**
```
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_APPWRITE_API_KEY=your-api-key
VITE_APPWRITE_DATABASE_ID=your-database-id
VITE_APPWRITE_SHIFTS_COLLECTION_ID=your-shifts-collection-id
```

### Step 2: Update `src/lib/appwrite.js`

```javascript
// Export shifts collection ID
export const SHIFTS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_SHIFTS_COLLECTION_ID;

// Create client
const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const db = new Databases(client);
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
```

### Step 3: Create Shift Service

**`src/lib/shiftService.js`:**

```javascript
import { db, DATABASE_ID, SHIFTS_COLLECTION_ID } from './appwrite';
import { Query } from 'appwrite';

// Fetch all shifts for a date
export const fetchShiftsForDate = async (date) => {
  try {
    const response = await db.listDocuments(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      [Query.equal('date', date)]
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return [];
  }
};

// Fetch shifts for date range
export const fetchShiftsForDateRange = async (startDate, endDate) => {
  try {
    const response = await db.listDocuments(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      [
        Query.greaterThanEqual('date', startDate),
        Query.lessThanEqual('date', endDate),
        Query.limit(1000)
      ]
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return [];
  }
};

// Fetch shifts for a staff member
export const fetchStaffShifts = async (staffId, startDate, endDate) => {
  try {
    const response = await db.listDocuments(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      [
        Query.equal('staffId', staffId),
        Query.greaterThanEqual('date', startDate),
        Query.lessThanEqual('date', endDate)
      ]
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching staff shifts:', error);
    return [];
  }
};

// Fetch shifts for a site
export const fetchSiteShifts = async (siteId, startDate, endDate) => {
  try {
    const response = await db.listDocuments(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      [
        Query.equal('siteId', siteId),
        Query.greaterThanEqual('date', startDate),
        Query.lessThanEqual('date', endDate)
      ]
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching site shifts:', error);
    return [];
  }
};

// Create a new shift
export const createShift = async (shiftData) => {
  try {
    const docId = `${shiftData.date}_${Date.now()}`;
    const response = await db.createDocument(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      docId,
      {
        date: shiftData.date,
        startTime: shiftData.startTime,
        endTime: shiftData.endTime,
        title: shiftData.title || 'Shift',
        description: shiftData.description || '',
        status: shiftData.status || 'active',
        siteId: shiftData.siteId,
        staffId: shiftData.staffId || null,
        notes: shiftData.notes || '',
      }
    );
    return response;
  } catch (error) {
    console.error('Error creating shift:', error);
    throw error;
  }
};

// Update an existing shift
export const updateShift = async (shiftId, updates) => {
  try {
    const response = await db.updateDocument(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      shiftId,
      updates
    );
    return response;
  } catch (error) {
    console.error('Error updating shift:', error);
    throw error;
  }
};

// Delete a shift
export const deleteShift = async (shiftId) => {
  try {
    await db.deleteDocument(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      shiftId
    );
  } catch (error) {
    console.error('Error deleting shift:', error);
    throw error;
  }
};

// Bulk update shifts
export const bulkUpdateShifts = async (shifts) => {
  try {
    const updates = shifts.map(shift =>
      updateShift(shift.$id, {
        startTime: shift.startTime,
        endTime: shift.endTime,
        // Add other fields that might have changed
      })
    );
    await Promise.all(updates);
  } catch (error) {
    console.error('Error bulk updating shifts:', error);
    throw error;
  }
};
```

### Step 4: Use in Components

**`src/pages/portal/Scheduling.jsx`:**

```javascript
import React, { useState, useEffect } from 'react';
import DragDropSchedule from '@/components/DragDropSchedule';
import {
  fetchShiftsForDate,
  createShift,
  updateShift,
  deleteShift,
} from '@/lib/shiftService';

export default function Scheduling() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load shifts for selected date
  useEffect(() => {
    const loadShifts = async () => {
      setLoading(true);
      try {
        const data = await fetchShiftsForDate(date);
        setShifts(data);
        setError(null);
      } catch (err) {
        setError('Failed to load shifts');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadShifts();
  }, [date]);

  // Handle shift changes
  const handleShiftsChange = async (newShifts) => {
    setShifts(newShifts);

    // Sync with database
    for (const shift of newShifts) {
      try {
        if (shift.$id?.startsWith('shift_')) {
          // New shift - create in database
          await createShift(shift);
        } else {
          // Existing shift - update in database
          await updateShift(shift.$id, {
            startTime: shift.startTime,
            endTime: shift.endTime,
            title: shift.title,
            description: shift.description,
          });
        }
      } catch (err) {
        setError('Failed to save shift');
        console.error(err);
      }
    }
  };

  if (loading) {
    return <div className="p-4">Loading schedule...</div>;
  }

  return (
    <div className="p-6">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mb-4 px-4 py-2 border rounded"
      />

      <DragDropSchedule
        shifts={shifts}
        onShiftsChange={handleShiftsChange}
        date={date}
        dayStartHour={8}
        dayEndHour={22}
        siteId="site_1"
      />
    </div>
  );
}
```

### Step 5: Batch Operations

For updating multiple shifts at once:

```javascript
// Helper to batch save shifts
async function saveScheduleChanges(originalShifts, updatedShifts) {
  const toCreate = updatedShifts.filter(s => !s.$id);
  const toUpdate = updatedShifts.filter(
    s => s.$id && originalShifts.find(o => o.$id === s.$id)
  );
  const toDelete = originalShifts.filter(
    s => !updatedShifts.find(u => u.$id === s.$id)
  );

  // Create new shifts
  for (const shift of toCreate) {
    await createShift(shift);
  }

  // Update modified shifts
  for (const shift of toUpdate) {
    const original = originalShifts.find(o => o.$id === shift.$id);
    const changes = {};
    
    if (original.startTime !== shift.startTime) changes.startTime = shift.startTime;
    if (original.endTime !== shift.endTime) changes.endTime = shift.endTime;
    if (original.title !== shift.title) changes.title = shift.title;
    
    if (Object.keys(changes).length > 0) {
      await updateShift(shift.$id, changes);
    }
  }

  // Delete removed shifts
  for (const shift of toDelete) {
    await deleteShift(shift.$id);
  }
}
```

---

## Real-Time Updates (Optional)

For real-time collaboration:

```javascript
import { Realtime } from 'appwrite';

const realtime = new Realtime(client);

// Subscribe to shift changes
const unsubscribe = realtime.subscribe(
  `databases.${DATABASE_ID}.collections.${SHIFTS_COLLECTION_ID}.documents`,
  (response) => {
    console.log('Shift updated:', response);
    // Refresh shifts or update local state
  }
);

// Unsubscribe when component unmounts
useEffect(() => {
  return () => unsubscribe();
}, []);
```

---

## Error Handling

```javascript
// Handle common errors
const handleShiftError = (error) => {
  if (error.type === 'general_invalid_attribute') {
    console.error('Invalid shift data:', error.message);
  } else if (error.type === 'general_document_not_found') {
    console.error('Shift not found in database');
  } else if (error.type === 'authorization_failed') {
    console.error('Permission denied');
  } else {
    console.error('Unknown error:', error);
  }
};
```

---

## Performance Tips

### 1. Limit Query Results
```javascript
// Only fetch 30 days of shifts
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);

const shifts = await fetchShiftsForDateRange(
  startDate.toISOString().split('T')[0],
  endDate.toISOString().split('T')[0]
);
```

### 2. Use Pagination
```javascript
export const fetchShiftsPaginated = async (pageSize = 50, offset = 0) => {
  try {
    const response = await db.listDocuments(
      DATABASE_ID,
      SHIFTS_COLLECTION_ID,
      [
        Query.limit(pageSize),
        Query.offset(offset)
      ]
    );
    return response;
  } catch (error) {
    console.error('Error fetching paginated shifts:', error);
    return { documents: [] };
  }
};
```

### 3. Cache Results
```javascript
const shiftCache = new Map();

export const getCachedShifts = (date) => {
  if (shiftCache.has(date)) {
    return shiftCache.get(date);
  }
  
  return fetchShiftsForDate(date).then(shifts => {
    shiftCache.set(date, shifts);
    return shifts;
  });
};
```

---

## Testing

### Test Data Generation

```javascript
// Generate test shifts
function generateTestShifts(startDate, numDays = 7) {
  const shifts = [];
  const siteIds = ['site_1', 'site_2', 'site_3'];
  const staffIds = ['staff_1', 'staff_2', 'staff_3', 'staff_4'];
  const titles = ['Morning', 'Afternoon', 'Evening', 'Night'];
  
  for (let d = 0; d < numDays; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];
    
    for (let i = 0; i < 3; i++) {
      const hour = 8 + (i * 8);
      shifts.push({
        date: dateStr,
        startTime: `${String(hour).padStart(2, '0')}:00`,
        endTime: `${String(hour + 4).padStart(2, '0')}:00`,
        title: titles[i],
        status: 'active',
        siteId: siteIds[i % siteIds.length],
        staffId: staffIds[i % staffIds.length],
      });
    }
  }
  
  return shifts;
}

// Seed database with test data
async function seedTestData() {
  const testShifts = generateTestShifts(new Date(), 30);
  for (const shift of testShifts) {
    await createShift(shift);
  }
}
```

---

## Troubleshooting

### Issue: Permission Denied Errors
**Solution:** Check Appwrite collection permissions. Set to:
- `read`: Role:authenticated
- `write`: Role:authenticated (or more restrictive)

### Issue: Date Format Errors
**Solution:** Always use `YYYY-MM-DD` format for dates

### Issue: Slow Performance
**Solution:** 
- Add indexes to frequently queried fields
- Limit date range queries
- Use pagination for large result sets

### Issue: Real-time Updates Not Working
**Solution:** Ensure Realtime is enabled in Appwrite Console

---

## Environment Checklist

- [ ] Appwrite collection created with all attributes
- [ ] Indexes created for common queries
- [ ] Environment variables set correctly
- [ ] `shiftService.js` created and integrated
- [ ] Components updated to use shift service
- [ ] Error handling implemented
- [ ] Testing completed with test data
- [ ] Permissions verified
