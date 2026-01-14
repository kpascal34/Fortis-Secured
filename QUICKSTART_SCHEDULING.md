# Quick Start: Scheduling Board

## Setup (One Time)

### 1. Install Dependencies
```bash
npm install
```

### 2. Populate Sample Data
```bash
npm run seed:sample-data
```

This creates:
- ✅ 3 Clients
- ✅ 4 Sites  
- ✅ 5 Guards
- ✅ 4 Sample Shifts

**Note**: If you get "fetch failed" error, check your network connection and try again.

## Using the Scheduling Board

### Access
Navigate to: **Portal → Scheduling**

### Key Features

#### 1. View Open Shifts
- Located at top of scheduling page
- Shows upcoming unfilled/scheduled shifts
- Click "Assign Guards" to staff the shift

#### 2. Create New Shift
1. Click "**+ Add Shift**" button
2. Select **Client** (required)
3. Select **Site** (required - filters by client)
4. Set **Date & Time** (required)
5. Choose **Shift Type**
6. Set **Guards Required**
7. Enter **Pay & Bill Rates**
8. Add **Instructions** (optional)
9. Click "**Create Shift**"

#### 3. Assign Guards
**Option A**: From Open Shifts section
- Click "Assign Guards" button on shift card

**Option B**: From main list
- Click user icon "Assign" button on any shift

Then:
1. Modal opens with available guards
2. Click guard name to assign
3. Repeat for multiple guards if needed
4. Close modal to save

#### 4. Filter & Search
- **Search bar**: Find by client, site, or shift type
- **Client dropdown**: Filter by specific client
- **Status dropdown**: Filter by shift status  
- **Date picker**: Show shifts for specific date
- **Unfilled Only**: Toggle to show only unfilled shifts

#### 5. View Modes
- **List View**: Detailed list with filters
- **Calendar View**: Visual calendar (day/week/month)

#### 6. Edit/Manage
- ✏️ **Edit**: Click pencil icon → Modify → Save
- 📋 **Duplicate**: Click copy icon → Change date → Create
- 🗑️ **Delete**: Click trash icon → Confirm

## Quick Checks

### Before Creating Shifts
- [ ] Clients exist in system
- [ ] Sites linked to clients
- [ ] Guards have valid SIA licenses

### After Creating Shifts
- [ ] Shift appears in list
- [ ] Shows in Open Shifts if unfilled
- [ ] Date and time are correct
- [ ] Guards can be assigned

## Common Tasks

### Task: Schedule Regular Weekly Shift
```
1. Create shift for next week
2. Fill all details
3. Check "Make Recurring"
4. Select "Weekly" pattern
5. Set end date (e.g., 3 months)
6. Create → Generates all instances
```

### Task: Handle Emergency Staffing
```
1. Go to Open Shifts
2. Find urgent shift (marked unfilled)
3. Click "Assign Guards"  
4. Check available guards (no conflicts)
5. Assign best match
6. Guard receives notification
```

### Task: Weekly Planning
```
1. Switch to Calendar View
2. Select "Week" mode
3. Review coverage gaps
4. Create missing shifts
5. Assign guards to unfilled shifts
6. Export/print for distribution
```

## Troubleshooting Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| No clients in dropdown | Run `npm run seed:sample-data` |
| Site dropdown disabled | Select a client first |
| Can't assign guard | Check for time conflicts |
| Shift not saving | Check required fields are filled |
| Open shifts not showing | Verify status is 'scheduled' or 'unfilled' |

## Key Metrics

Monitor these on the dashboard:
- 📊 **Coverage Rate**: Target 95%+
- 🎯 **Unfilled Shifts**: Keep at 0
- ⏰ **Overtime Hours**: Manage costs
- 📈 **Total Hours**: Track workload

## Support Files

- Full guide: `SCHEDULING_GUIDE.md`
- Sample data docs: `scripts/README_SAMPLE_DATA.md`
- Environment setup: `.env`

---

**Pro Tip**: Create template shifts for common assignments, then use "Duplicate" to quickly create similar shifts with different dates!
