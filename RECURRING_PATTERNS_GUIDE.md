# Recurring Shift Patterns - User Guide

## Overview

The Recurring Shift Patterns feature allows you to create reusable templates for shifts that repeat on a regular schedule. Instead of manually creating individual shifts, you can define a pattern once and automatically generate multiple shifts across any date range.

## Key Features

### Pattern Creation
- **Multiple Frequencies**: Daily, Weekly, Biweekly, Monthly, or Custom intervals
- **Day Selection**: Choose specific days of the week for weekly/biweekly patterns
- **Time Settings**: Define shift start and end times
- **Location Assignment**: Link patterns to specific clients and sites
- **Staffing Requirements**: Specify number of guards needed per shift
- **End Conditions**: Set patterns to run forever, for a specific number of occurrences, or until a specific date

### Pattern Management
- **Active/Inactive Status**: Enable or disable patterns without deleting them
- **Edit Patterns**: Update pattern details at any time
- **Statistics Tracking**: View fill rates and assignment status for pattern-generated shifts
- **Pattern Library**: Organize and reuse patterns across different time periods

### Shift Generation
- **Preview Before Creating**: See exactly how many shifts will be generated
- **Flexible Date Ranges**: Apply patterns to any start and end date
- **Batch Creation**: Create hundreds of shifts in seconds
- **Pattern Attribution**: Track which shifts came from which pattern

## How to Use

### Creating a Pattern

1. **Navigate to Recurring Patterns**
   - From the portal sidebar, click "Recurring Patterns"
   - Click the "New Pattern" button

2. **Basic Information**
   - **Pattern Name**: Give your pattern a descriptive name (e.g., "Weekend Night Patrol")
   - **Description**: Optional details about the pattern's purpose

3. **Repeat Settings**
   - **Frequency**: Choose how often the pattern repeats
     - *Daily*: Every day or every N days
     - *Weekly*: Specific days each week
     - *Biweekly*: Specific days every 2 weeks
     - *Monthly*: Same day each month
   - **Repeat Every**: Set the interval (e.g., every 2 weeks)
   - **Days of Week**: For weekly/biweekly patterns, select which days

4. **Time Settings**
   - **Start Time**: When the shift begins
   - **End Time**: When the shift ends

5. **Location & Details**
   - **Client**: Select the client for these shifts
   - **Site**: Choose the specific site location
   - **Position Type**: Optional role description
   - **Required Guards**: Number of guards needed per shift
   - **Special Instructions**: Any specific requirements or notes

6. **End Condition**
   - **Never ends**: Pattern continues indefinitely
   - **After X occurrences**: Pattern stops after a set number of shifts
   - **On date**: Pattern stops on a specific date

7. **Preview**
   - Set preview dates to see how many shifts will be created
   - Verify the pattern description is correct

8. **Save Pattern**
   - Check "Active" to enable the pattern
   - Click "Create Pattern"

### Applying a Pattern

1. **Select Pattern**
   - Find the pattern you want to use
   - Click "Apply Pattern"

2. **Choose Date Range**
   - **Start Date**: First day to generate shifts
   - **End Date**: Last day to generate shifts
   - Preview shows exact number of shifts that will be created

3. **Review Preview**
   - See a list of all shifts that will be generated
   - Verify dates and times are correct

4. **Create Shifts**
   - Click "Create X Shifts" to generate all shifts
   - Shifts are created in batches (may take a few seconds for large numbers)

### Managing Patterns

#### Editing a Pattern
1. Click the edit icon on any pattern card
2. Make your changes
3. Click "Update Pattern"
4. **Note**: Changes don't affect already-created shifts

#### Activating/Deactivating
- Click the play/pause icon to toggle pattern status
- Inactive patterns cannot be applied but are preserved

#### Deleting a Pattern
- Click the delete icon on any pattern card
- Confirm deletion
- **Note**: Deleting a pattern doesn't delete shifts already created from it

## Pattern Examples

### Example 1: Weekend Security
- **Name**: "Weekend Coverage"
- **Frequency**: Weekly
- **Days**: Saturday, Sunday
- **Time**: 18:00 - 06:00 (next day)
- **Required Guards**: 2
- **End Condition**: Never ends

### Example 2: Weekday Day Shift
- **Name**: "Monday-Friday Days"
- **Frequency**: Weekly
- **Days**: Monday through Friday
- **Time**: 08:00 - 16:00
- **Required Guards**: 1
- **End Condition**: After 52 occurrences (1 year)

### Example 3: Rotating Night Schedule
- **Name**: "Rotating Nights"
- **Frequency**: Biweekly
- **Days**: Monday, Wednesday, Friday
- **Time**: 22:00 - 06:00 (next day)
- **Required Guards**: 1
- **End Condition**: On date (end of quarter)

### Example 4: Daily Patrol
- **Name**: "Daily Security Rounds"
- **Frequency**: Daily
- **Interval**: Every 1 day
- **Time**: 09:00 - 17:00
- **Required Guards**: 1
- **End Condition**: On date (end of month)

## Best Practices

### Pattern Naming
- Use clear, descriptive names that indicate:
  - When the pattern runs (e.g., "Weekend Nights")
  - What type of shift (e.g., "Patrol", "Static Guard")
  - Location if specific (e.g., "Warehouse Evening")

### Date Range Selection
- Generate shifts 4-8 weeks in advance for proper planning
- Avoid overlapping applications of the same pattern
- Consider staff availability when selecting dates

### Pattern Organization
- Create separate patterns for different shift types
- Use descriptions to note special requirements
- Keep active patterns list focused (deactivate unused patterns)

### Staffing Strategy
- Set realistic "Required Guards" numbers
- Account for common leave patterns
- Create backup patterns for holiday coverage

## Troubleshooting

### No Shifts Generated
**Problem**: Preview shows 0 shifts
**Solutions**:
- Check date range is in the future
- Verify days of week are selected (weekly/biweekly)
- Ensure end date is after start date
- Check end condition settings

### Wrong Number of Shifts
**Problem**: More or fewer shifts than expected
**Solutions**:
- Review pattern frequency and interval
- Check days of week selection
- Verify end condition settings
- Consider month lengths for monthly patterns

### Shifts at Wrong Times
**Problem**: Generated shifts have incorrect start/end times
**Solutions**:
- Edit the pattern and update times
- Delete incorrect shifts and reapply pattern
- Verify time format (24-hour clock)

### Pattern Won't Apply
**Problem**: "Create Shifts" button is disabled
**Solutions**:
- Ensure pattern is Active
- Verify date range is selected
- Check preview shows at least 1 shift
- Confirm client and site are selected

## Technical Notes

### Database Collection
- Patterns are stored in the `recurring_patterns` collection
- Each pattern has a unique ID
- Shifts created from patterns include `patternId` and `patternName` fields

### Performance
- Large batch creations (100+ shifts) process in groups of 10
- Generation is asynchronous - may take a few seconds
- Preview calculations are instant

### Limitations
- Maximum 52 weeks interval for weekly patterns
- Maximum 50 guards per shift
- Patterns can't span multiple sites
- Once created, shifts are independent of patterns

## Integration with Scheduling

### Shift Status Flow
1. Pattern generates shifts with status "published"
2. Shifts can be assigned through normal scheduling
3. Pattern statistics track assignment rates
4. Changes to shifts don't affect the pattern

### Guard Assignment
- Generated shifts start unassigned
- Use normal scheduling tools to assign guards
- Auto-assignment rules apply to pattern shifts
- Conflict detection works with pattern shifts

### Reporting
- Pattern shifts included in all standard reports
- Filter shifts by pattern ID or name
- Track pattern effectiveness via fill rates
- Analytics show pattern utilization

## FAQ

**Q: Can I change a pattern after creating shifts?**
A: Yes, but changes only apply to future shifts generated from that pattern. Existing shifts remain unchanged.

**Q: What happens if I delete a pattern?**
A: The pattern is removed, but shifts already created from it remain in the system.

**Q: Can patterns handle overnight shifts?**
A: Yes, set end time later than start time. The shift is associated with the start date.

**Q: How do I create a rotating 2-week schedule?**
A: Use Biweekly frequency and select the days that repeat every 2 weeks.

**Q: Can I have multiple patterns for the same client/site?**
A: Yes, create separate patterns for different shift types or times.

**Q: Is there a limit to how many shifts I can create at once?**
A: No hard limit, but large batches (500+) may take longer to process.

**Q: Can patterns handle holidays automatically?**
A: No, you'll need to manually adjust or delete shifts for holidays.

**Q: How do I create a pattern that runs indefinitely?**
A: Set end condition to "Never ends" and the pattern will generate shifts whenever applied.
