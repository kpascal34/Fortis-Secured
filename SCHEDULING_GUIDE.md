# Scheduling Board User Guide

## Overview

The Scheduling Board is now fully enabled with all features operational. This guide will walk you through using the scheduling system.

## Prerequisites - Populating Sample Data

Before using the scheduling board, you need data in your Appwrite collections. We've created a convenient script to populate sample data.

### Step 1: Run the Sample Data Script

```bash
npm run seed:sample-data
```

This will create:
- **3 Clients**: TechCorp Solutions, Retail Chain UK, Prestige Events
- **4 Sites**: Headquarters, Data Center, Manchester Store, Birmingham Arena
- **5 Guards**: James Thompson, Sophie Anderson, Marcus Williams, Olivia Davis, Daniel Martinez
- **4 Sample Shifts**: Mix of scheduled and unfilled shifts for upcoming days

### Step 2: Verify Network Connection

If you get a "fetch failed" error:
1. Check your internet connection
2. Verify Appwrite endpoint is accessible
3. Ensure your API key has proper permissions
4. Try running the script again: `npm run seed:sample-data`

## Using the Scheduling Board

### 1. Viewing Open Shifts

**Location**: Navigate to the Scheduling page in the portal

**Open Shifts Section** displays:
- All upcoming shifts with status 'scheduled' or 'unfilled'
- Shows up to 6 shifts at once (with overflow indicator)
- Each shift card shows:
  - Client name
  - Site name
  - Date and time
  - Number of guards assigned vs required
  - "Assign Guards" button

**Example Open Shift Card:**
```
┌─────────────────────────────────┐
│ TechCorp Solutions              │
│ Headquarters Building           │
│ 📅 15/01/2026                   │
│ ⏰ 08:00 - 16:00                │
│ 👤 0/2 assigned                 │
│ [Assign Guards]                 │
└─────────────────────────────────┘
```

### 2. Creating a New Shift

**Step 1**: Click the "Add Shift" button (top right)

**Step 2**: Fill in the form:

#### Client & Location
- **Client** (required): Select from dropdown
- **Site** (required): Dropdown filters based on selected client
- **Post/Assignment** (optional): Select specific post if available

#### Shift Details
- **Date** (required): Must be today or future date
- **Start Time** (required): 24-hour format
- **End Time** (required): Must be after start time
- **Shift Type** (required): Options include:
  - Static Guarding
  - Manned Guarding
  - Mobile Patrol
  - Event Security
  - Door Supervision
  - CCTV / Control Room
  - Concierge / Reception Security

- **Guards Required** (required): Number of personnel needed (min 1)
- **Status**: Select from scheduled, in-progress, completed, cancelled, unfilled

#### Rates & Breaks
- **Pay Rate** (required): Hourly rate paid to guards (£)
- **Bill Rate** (required): Rate charged to client (£)
- **Break Minutes**: Total break time (default 0)
- **Paid Break**: Check if breaks are paid

#### Additional Details
- **Instructions**: Special instructions for guards
- **Uniform Requirement**: Dress code/uniform details
- **Vehicle Required**: Check if guard needs vehicle

#### Recurring Shifts (optional)
- **Make Recurring**: Check to create recurring shifts
- **Pattern**: daily, weekly, etc.
- **End Date**: When recurring pattern stops

**Step 3**: Click "Create Shift"

### 3. Assigning Guards to Shifts

**Method 1: From Open Shifts Section**
1. Click "Assign Guards" button on any shift card

**Method 2: From Shifts List**
1. Find the shift in the main list
2. Click the "Assign" button with user icon

**Assignment Modal Features:**
- View shift details (date, time, site)
- See current assignments (who's already assigned)
- List of available guards filtered by:
  - SIA license validity
  - Availability (no conflicts)
  - Location/distance
- Assign multiple guards if required headcount > 1
- Remove assignments
- Change assignment status (confirmed, cancelled, etc.)

**Assignment Process:**
1. Modal opens showing shift details
2. Available guards list appears
3. Click guard name or "Assign" button
4. Repeat for additional guards if needed
5. Click "Close" or "Done" to save

### 4. Viewing and Filtering Shifts

**View Modes:**
- **List View**: Detailed list of all shifts
- **Calendar View**: Visual calendar with week/month/day views

**Filters:**
- **Search**: Search by client name, site name, or shift type
- **Client Filter**: Show shifts for specific client
- **Status Filter**: Filter by shift status
- **Date Filter**: Show shifts for specific date
- **Unfilled Only**: Show only shifts needing guards

**Statistics Dashboard:**
The top of the page shows:
- Total Shifts
- Scheduled/In Progress counts
- Coverage Rate (% of positions filled)
- Unfilled Shifts count
- Overtime Hours
- Total Hours scheduled

### 5. Editing and Managing Shifts

**Edit a Shift:**
1. Click the pencil/edit icon on shift card
2. Modify any field
3. Click "Update Shift"

**Duplicate a Shift:**
1. Click the copy icon on shift card
2. Form opens with all details pre-filled
3. Change date/time as needed
4. Click "Create Shift"

**Delete a Shift:**
1. Click the trash/delete icon
2. Confirm deletion
3. Shift is removed (cannot be undone)

## Workflow Examples

### Example 1: Creating a Basic Shift

```
1. Click "Add Shift"
2. Select "TechCorp Solutions" as client
3. Select "Headquarters Building" as site
4. Set date to tomorrow
5. Set time: 08:00 - 16:00
6. Select "Static Guarding" type
7. Set guards required: 1
8. Set pay rate: £12.50
9. Set bill rate: £18.00
10. Status: Scheduled
11. Click "Create Shift"
```

### Example 2: Assigning Guards to Unfilled Shift

```
1. View "Open Shifts" section
2. Find shift showing "2 needed"
3. Click "Assign Guards"
4. Modal shows available guards
5. Click "James Thompson" - assigned (1/2)
6. Click "Sophie Anderson" - assigned (2/2)
7. Shift now fully staffed
8. Badge changes from yellow to green
```

### Example 3: Managing Last-Minute Changes

```
Scenario: Guard calls in sick 2 hours before shift

1. Go to scheduling board
2. Find the shift (filter by today's date)
3. Click "Assign" button
4. See current assignment
5. Click "Remove" on sick guard
6. Select replacement from available list
7. Click new guard to assign
8. Confirmation message appears
9. New guard receives notification
```

## Tips and Best Practices

### For Shift Creation
- ✅ Create shifts at least 24-48 hours in advance
- ✅ Set realistic break times (30-60 minutes for 8+ hour shifts)
- ✅ Include clear instructions for guards
- ✅ Mark unfilled status if guard assignment is pending
- ✅ Use recurring shifts for regular contracts

### For Guard Assignment
- ✅ Check guard qualifications match shift requirements
- ✅ Verify SIA license is valid for shift date
- ✅ Avoid double-booking (system will warn)
- ✅ Consider travel time between shifts
- ✅ Assign guards familiar with the site when possible

### For Monitoring
- 📊 Check coverage rate daily (aim for 95%+)
- 📊 Review unfilled shifts each morning
- 📊 Monitor overtime hours to manage costs
- 📊 Use calendar view for weekly planning

## Troubleshooting

### "No clients available"
**Solution**: Run `npm run seed:sample-data` or manually create clients in the Clients page

### "No sites linked to this client"
**Solution**: Create sites for the client in the Sites page, ensuring you link them to the correct client

### "Site dropdown is disabled"
**Solution**: You must select a client first before the site dropdown becomes available

### Shift doesn't appear in Open Shifts
**Check**:
- Status is 'scheduled' or 'unfilled'
- Date is today or in the future
- Shift was saved successfully

### Can't assign guard
**Possible reasons**:
- Guard already assigned to another shift at same time
- Guard's SIA license has expired
- Guard status is not 'active'

### Changes not saving
**Solutions**:
- Check browser console for errors
- Verify internet connection
- Confirm Appwrite permissions are correct
- Try refreshing the page

## Next Steps

After setting up your scheduling board:

1. **Add Real Clients**: Replace sample clients with your actual clients
2. **Add Real Sites**: Create site profiles with accurate details
3. **Onboard Guards**: Add your security personnel with valid licenses
4. **Create Regular Shifts**: Set up recurring shifts for long-term contracts
5. **Configure Notifications**: Enable guard notifications for assignments
6. **Set Up Reports**: Use the scheduling data for billing and analytics

## Support

For technical issues:
- Check the browser console for error messages
- Verify all environment variables are set correctly
- Ensure Appwrite collections have proper permissions
- Review the sample data script logs for clues

The scheduling board is now fully operational and ready for production use!
