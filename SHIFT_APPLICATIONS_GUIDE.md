# Shift Application Workflow Guide

## Overview

The Shift Application Workflow system transforms the open shifts claiming process into a professional application and approval system. Guards can apply for available shifts, managers review applications with detailed eligibility assessments, and approve the best candidates.

## Key Features

### For Guards
- **Browse Open Shifts**: View all available shifts with eligibility scoring
- **Apply for Shifts**: Submit applications with automatic eligibility assessment
- **Track Applications**: Monitor application status (pending, approved, rejected)
- **Eligibility Insights**: See detailed breakdown of why you match (or don't match) each shift
- **Application History**: View all your past applications and their outcomes

### For Managers
- **Review Applications**: See all applications with eligibility scores
- **Detailed Assessments**: View comprehensive eligibility breakdown for each candidate
- **Approve/Reject**: Make informed decisions with one-click approval or rejection
- **Batch Processing**: Automatically reject other applicants when one is approved
- **Review Notes**: Add notes and reasons for decisions
- **Statistics Dashboard**: Track approval rates, average scores, and more

## System Architecture

### Collections Required

#### Applications Collection
Create in Appwrite with these attributes:

```
Collection ID: applications (or your custom ID)

Attributes:
- guardId (string, required) - ID of the guard applying
- guardName (string, required) - Name of the guard
- shiftId (string, required, indexed) - ID of the shift
- shiftDetails (json) - Cached shift info {siteName, date, startTime, endTime, hourlyRate}
- eligibilityScore (json) - Complete eligibility assessment
- message (string) - Optional message from guard
- status (string, required, indexed) - pending|approved|rejected|withdrawn|expired
- appliedAt (datetime, required) - When application was submitted
- reviewedAt (datetime) - When reviewed by manager
- reviewedBy (string) - Manager user ID
- reviewerName (string) - Manager name
- reviewNotes (string) - Manager's notes
- rejectionReason (string) - Reason code if rejected
- withdrawalReason (string) - Reason if withdrawn by guard

Indexes:
- guardId (ascending) - Find applications by guard
- shiftId (ascending) - Find applications for a shift
- status (ascending) - Filter by status
- appliedAt (descending) - Sort by application time

Permissions:
- Read: Users (role:users)
- Create: Users (role:users)
- Update: Users (role:users) - Guards can withdraw, managers can approve/reject
- Delete: Admins only
```

### Eligibility Scoring System

The system calculates a comprehensive eligibility score (0-100) based on multiple criteria:

#### Scoring Breakdown

1. **Valid SIA License** (20 points - MANDATORY)
   - 20 points: License valid for 30+ days
   - 10 points: License expiring within 30 days
   - 0 points: License expired (blocks application)

2. **Skills Match** (20 points)
   - Compares guard's skills against shift requirements
   - Points = (matched skills / required skills) × 20
   - Minimum 50% match recommended

3. **Experience Level** (15 points)
   - Compares guard's years of experience vs required
   - Bonus points for exceeding requirements
   - Partial credit if 70%+ of required experience

4. **Reliability Score** (15 points)
   - Based on historical performance
   - Points = (reliability % / 100) × 15
   - Minimum 70% reliability recommended

5. **Site Familiarity** (10 points)
   - 5 points for having worked at site before
   - +1 point per previous visit (max 10 total)

6. **Availability Check** (10 points - MANDATORY)
   - 10 points: No scheduling conflicts
   - 0 points: Conflicts with existing shifts (blocks application)

7. **Required Training** (10 points)
   - Must have completed all required training courses
   - Points = (completed / required) × 10

#### Recommendation Levels

Based on total score:
- **85-100**: Highly Recommended (ideal candidate)
- **70-84**: Recommended (good fit)
- **50-69**: Acceptable (meets minimum requirements)
- **0-49**: Not Recommended (below threshold)

## User Workflows

### Guard: Applying for a Shift

1. **Navigate to Open Shifts**
   - Click "Open Shifts" in the portal navigation
   - See all available shifts with real-time eligibility scoring

2. **View Shift Details**
   - Click on any shift card to see full details
   - Review eligibility breakdown showing:
     - Overall match percentage
     - Individual criterion scores
     - Reasons for any failures
     - Recommendation level

3. **Submit Application**
   - Click "Apply for This Shift" button
   - Application is automatically created with:
     - Your profile information
     - Complete eligibility assessment
     - Timestamp
     - Pending status

4. **Track Application Status**
   - Applications show status badge on shift cards:
     - **Pending Review**: Yellow - Manager hasn't reviewed yet
     - **Approved**: Green - You got the shift!
     - **Rejected**: Red - Application not successful
   - Filter view to "My Applications" to see only shifts you've applied to

5. **Receive Notifications** (future enhancement)
   - Get notified when application is reviewed
   - See approval or rejection with manager's notes

### Manager: Reviewing Applications

1. **Access Applications Dashboard**
   - Click "Shift Applications" in portal navigation
   - See overview statistics:
     - Total applications
     - Pending reviews
     - Approval/rejection counts
     - Overall approval rate

2. **Filter Applications**
   - **Pending**: Applications awaiting review (primary focus)
   - **Approved**: Successfully approved applications
   - **Rejected**: Declined applications
   - **All**: Complete history

3. **Review Application Details**
   - Click any application to see full details:
     - Guard information
     - Eligibility score and percentage
     - Detailed criteria breakdown
     - Shift details
     - Application timestamp

4. **Eligibility Assessment Review**
   - See visual score representation (0-100 scale)
   - Color-coded by score level:
     - Green (85+): Highly recommended
     - Blue (70-84): Recommended
     - Yellow (50-69): Acceptable
     - Red (0-49): Not recommended
   - Review individual criteria:
     - Each criterion shows pass/fail
     - Points earned vs maximum
     - Details explaining the score

5. **Approve Application**
   - Click "Approve Application" button
   - Add optional notes for the guard
   - Click "Confirm Approval"
   - System automatically:
     - Updates application status to approved
     - Assigns guard to the shift
     - Rejects all other pending applications for same shift
     - Sends notification to guard (future)

6. **Reject Application**
   - Click "Reject Application" button
   - Select rejection reason from dropdown:
     - Insufficient experience
     - Skills mismatch
     - Reliability concerns
     - Schedule conflict
     - License expired/expiring
     - Missing training
     - Better candidate selected
     - Shift already filled
     - Other (with notes)
   - Add optional notes with feedback
   - Click "Confirm Rejection"
   - Application status updated to rejected

## Application Status Flow

```
┌─────────────┐
│   Created   │ (Guard submits application)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   PENDING   │ (Awaiting manager review)
└──────┬──────┘
       │
       ├─────────────┐
       ▼             ▼
┌─────────────┐ ┌─────────────┐
│  APPROVED   │ │  REJECTED   │
└─────────────┘ └─────────────┘
       │
       ▼
   Shift Assigned
```

Alternative flows:
- Guard withdraws: PENDING → WITHDRAWN
- Application expires: PENDING → EXPIRED (after 24 hours)

## Best Practices

### For Guards

1. **Apply Early**: Applications are reviewed in order - don't wait
2. **Check Eligibility**: Review your match score before applying
3. **Improve Your Profile**: Higher scores come from:
   - Keeping SIA license current
   - Completing required training
   - Maintaining high reliability
   - Building diverse skills
4. **Apply Strategically**: Focus on shifts where you score 70+%
5. **Track Your Applications**: Use "My Applications" filter regularly

### For Managers

1. **Review Promptly**: Guards appreciate quick responses
2. **Trust the Scoring**: System provides objective assessment
3. **Use Notes Effectively**: Provide constructive feedback when rejecting
4. **Consider Multiple Factors**: Score isn't everything - review:
   - Site familiarity
   - Specific skill requirements
   - Client preferences
5. **Batch Process**: Review multiple applications together for efficiency
6. **Monitor Statistics**: Track approval rates to ensure fair process

## Configuration

### Environment Variables

Add to your `.env` file:

```env
VITE_APPWRITE_APPLICATIONS_COLLECTION_ID=your_collection_id
```

### Appwrite Permissions

Ensure proper permissions in Appwrite Console:

**Applications Collection:**
- Guards need: Read, Create, Update (own documents)
- Managers need: Read, Update (all documents)
- System needs: Create (for auto-rejection)

**Shifts Collection:**
- Managers need: Update (to assign guards)

## Eligibility Customization

To adjust eligibility criteria weights, edit `src/lib/shiftApplications.js`:

```javascript
// Example: Increase reliability importance
const reliabilityPoints = Math.round((reliabilityScore / 100) * 20); // Changed from 15 to 20

// Example: Adjust passing threshold
return {
  eligible: eligibilityPassed && totalScore >= 60, // Changed from 50 to 60
  // ...
};
```

## Troubleshooting

### Applications Not Saving

**Problem**: Error when submitting application

**Solutions**:
1. Check Applications collection exists in Appwrite
2. Verify collection ID in environment variables
3. Confirm user has Create permission
4. Check browser console for specific error

### Eligibility Score Shows 0

**Problem**: All applications show 0% eligibility

**Solutions**:
1. Verify guard profile has required fields:
   - `siaLicenseExpiry`
   - `yearsExperience`
   - `skills` array
   - `completedTraining` array
2. Check shift has requirements defined
3. Review `calculateEligibilityScore()` function logic

### Applications Not Appearing for Manager

**Problem**: Manager sees empty list

**Solutions**:
1. Check manager has Read permission on Applications collection
2. Verify applications exist in database
3. Check filter settings (try "All" filter)
4. Confirm collection ID matches in config

### Approval Fails

**Problem**: Error when approving application

**Solutions**:
1. Verify manager has Update permission on:
   - Applications collection
   - Shifts collection
2. Check shift hasn't been filled by another approval
3. Confirm guard is still eligible (license not expired)
4. Review browser console for specific error

## Integration Points

### With Existing Systems

**Scheduling System**:
- Approved applications update shift assignments
- Shift status changes to "assigned"
- Guard appears on schedule automatically

**Guard Profiles**:
- Eligibility calculation reads from guard collection
- Keep profiles updated for accurate scoring

**Notifications** (future):
- Hook into notification system for status updates
- Send emails/push notifications on approval/rejection

### API Endpoints

All operations use Appwrite SDK:

```javascript
// Create application
databases.createDocument(
  config.databaseId,
  config.applicationsCollectionId,
  ID.unique(),
  applicationData
);

// Update application status
databases.updateDocument(
  config.databaseId,
  config.applicationsCollectionId,
  applicationId,
  { status: 'approved', reviewedBy: managerId, ... }
);

// Query applications
databases.listDocuments(
  config.databaseId,
  config.applicationsCollectionId,
  [Query.equal('guardId', guardId), Query.orderDesc('appliedAt')]
);
```

## Future Enhancements

### Planned Features

1. **Bulk Actions**: Approve/reject multiple applications at once
2. **Application Withdrawal**: Guards can withdraw pending applications
3. **Priority Scoring**: Weight criteria differently per shift type
4. **Interview Scheduling**: Request interview before approval
5. **Automatic Expiry**: Auto-expire old pending applications
6. **Application Messages**: Two-way communication in application
7. **Smart Matching**: AI-powered guard recommendations
8. **Historical Analytics**: Track guard success rates over time

### Integration Ideas

- **SMS Notifications**: Text guards when application reviewed
- **Email Templates**: Customizable approval/rejection emails
- **Mobile App**: Native mobile experience for guards
- **Client Approval**: Let clients review high-value shift applicants
- **Performance Tracking**: Link application outcomes to job performance

## Support

### Common Questions

**Q: Can guards apply for multiple shifts?**
A: Yes, no limit on concurrent applications.

**Q: What happens if a guard's license expires after applying?**
A: Eligibility is checked at application time. Managers should verify current status before approval.

**Q: Can managers change an approved application to rejected?**
A: Currently no - once approved, guard is assigned. Future updates will add audit trail for changes.

**Q: Do rejected guards get notified?**
A: Currently shows in portal. Push/email notifications coming in future update.

**Q: Can eligibility criteria be customized per shift?**
A: Not yet - system uses same criteria for all shifts. Custom weighting coming soon.

### Getting Help

- Check browser console for error details
- Review Appwrite logs for backend issues
- Verify all required fields exist on guard profiles
- Test with demo data first before production use

## Version History

**v1.0.0** (Current)
- Initial release
- Guard application submission
- Manager approval workflow
- Comprehensive eligibility scoring
- Application tracking and history
- Statistics dashboard

---

For technical implementation details, see:
- `src/lib/shiftApplications.js` - Core application logic
- `src/pages/portal/OpenShifts.jsx` - Guard interface
- `src/pages/portal/ShiftApplications.jsx` - Manager interface
