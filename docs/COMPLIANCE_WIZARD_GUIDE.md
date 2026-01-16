# BS7858 Compliance Wizard - Setup & Usage Guide

## Overview

The BS7858 Compliance Wizard is a comprehensive multi-step form system that guides security staff through the BS7858 compliance process. It includes automatic progress tracking, draft saving, notifications, and admin review capabilities.

## Features

### For Staff Members
- **7-Step Guided Process**: Identity, Employment History, Evidence, References, Criminal Record, SIA Licence, Video
- **Auto-Save Drafts**: Each step is automatically saved as you progress
- **Progress Tracking**: Visual progress bar showing completion percentage
- **Real-Time Notifications**: Get notified when steps are saved, submitted, or reviewed
- **Missing Section Detection**: System validates completion before submission
- **Status Tracking**: See if your compliance is in progress, submitted, approved, or rejected

### For Admins/Managers
- **Review System**: Approve or reject staff compliance with detailed notes
- **Permission-Based Access**: Admins and managers can view all compliance records
- **Notification System**: Get notified when staff submit compliance for review
- **Validation Reports**: See which sections are complete or missing
- **Audit Trail**: All actions are logged with timestamps and user IDs

## Database Setup

### Step 1: Set up Appwrite Collections

Run the collection setup script:

```bash
node scripts/create_compliance_collections.mjs
```

This will create 3 collections:

1. **staff_compliance**: Main compliance records
   - Stores all 7 steps of BS7858 data
   - Tracks status, completion percentage, reviewer notes
   - Permissions: Staff can read/update own; Admins can read/update all

2. **compliance_wizard_drafts**: Auto-save drafts
   - Saves each step individually for recovery
   - Allows staff to resume where they left off
   - Permissions: Staff can CRUD own; Admins can read all

3. **compliance_notifications**: Notification system
   - Stores all compliance-related notifications
   - Tracks read/unread status
   - Permissions: Staff can read own; Admins can create/read all

### Step 2: Update Environment Variables

Add the following to your `.env` file (values provided by the setup script):

```env
VITE_APPWRITE_STAFF_COMPLIANCE_COLLECTION_ID=your_collection_id
VITE_APPWRITE_COMPLIANCE_WIZARD_COLLECTION_ID=your_drafts_collection_id
VITE_APPWRITE_COMPLIANCE_NOTIFICATIONS_COLLECTION_ID=your_notifications_collection_id
```

## Usage

### For Staff: Completing Compliance

1. **Navigate to Compliance Wizard**
   - Go to `/portal/compliance-wizard`
   - System will auto-create a compliance record if you don't have one

2. **Complete Each Step**
   - Step 1: Identity & Right to Work
     * Personal details
     * 5-year address history (must total 60+ months)
   
   - Step 2: Employment History
     * 5 years of employment
     * Gaps must be ≤31 days
   
   - Step 3: Evidence Uploads
     * HMRC PAYE documents
     * P45/P60, payslips, bank statements
   
   - Step 4: References
     * 1 employer reference
     * 1 character reference
   
   - Step 5: Criminal Record
     * Basic Disclosure upload
   
   - Step 6: SIA Licence
     * Licence number and expiry date
   
   - Step 7: Intro Video
     * Upload introduction video

3. **Submit for Review**
   - Once all 7 steps are complete (100%)
   - Click "Submit for Review"
   - Admins will be notified

4. **Track Status**
   - **In Progress**: Still completing steps
   - **Submitted**: Awaiting admin review
   - **Approved**: Cleared for work
   - **Rejected**: Review rejection reason and resubmit

### For Admins: Reviewing Compliance

1. **View Submitted Compliance**
   - Check notifications for review requests
   - Navigate to staff compliance records

2. **Review Each Step**
   - Check all 7 steps are complete
   - Validate documents and information
   - Verify 5-year coverage with no gaps >31 days

3. **Approve or Reject**
   ```javascript
   import { adminReviewCompliance } from './services/complianceService.js';
   
   // Approve
   await adminReviewCompliance(adminId, staffId, true);
   
   // Reject with reason
   await adminReviewCompliance(
     adminId,
     staffId,
     false,
     'Missing valid SIA licence. Please upload current licence.'
   );
   ```

4. **Staff Gets Notified**
   - Staff receive notification with decision
   - If rejected, they can see notes and resubmit

## API Reference

### Compliance Service Functions

```javascript
import {
  getComplianceProgress,
  initializeComplianceRecord,
  submitStep1Identity,
  submitStep2Employment,
  submitStep3Evidence,
  submitStep4References,
  submitStep5Criminal,
  submitStep6SIALicence,
  submitStep7Video,
  submitComplianceReview,
  adminReviewCompliance,
  canAccessCompliance,
  getMissingSections,
} from './services/complianceService.js';
```

#### Initialize Compliance Record
```javascript
const record = await initializeComplianceRecord(
  staffId,
  'staff@example.com',
  'John Doe'
);
```

#### Check Access Permission
```javascript
const canAccess = await canAccessCompliance(
  userId,
  complianceId,
  userRole // 'staff', 'admin', or 'manager'
);
```

#### Get Missing Sections
```javascript
const missing = await getMissingSections(staffId);
// Returns array like: ['Identity & Right to Work', 'SIA Licence']
```

### Notification Service Functions

```javascript
import {
  notifyStepSaved,
  notifyComplianceSubmitted,
  notifyComplianceApproved,
  notifyComplianceRejected,
  notifyMissingSections,
} from './services/notificationService.js';
```

#### Send Custom Notification
```javascript
await notifyMissingSections(
  staffId,
  complianceId,
  ['Employment History', 'References']
);
```

## Validation Rules

### Step 1: Identity & Right to Work
- First name, last name, DOB, NI number required
- Address history must cover 60+ months (5 years)
- Each address needs line1, postcode, and months lived there

### Step 2: Employment History
- Must cover 5 years
- Gaps between jobs must be ≤31 days
- Each job needs employer, title, from/to dates

### Step 3: Evidence
- At least 1 evidence document required
- Accepts: PDF, images
- Automatically synced to Google Drive

### Step 4: References
- Exactly 2 references required
- 1 must be type 'employer'
- 1 must be type 'character'
- Each needs name, email, phone, position

### Step 5: Criminal Record
- Basic Disclosure document required
- Must be valid PDF or image

### Step 6: SIA Licence
- Valid licence number required
- Expiry date must be in the future
- Updates staff profile automatically

### Step 7: Intro Video
- Video file required
- Accepts common video formats

## Notification Types

| Type | Sent To | Trigger |
|------|---------|---------|
| `step_saved` | Staff | After each step save |
| `submitted` | Staff | When compliance submitted |
| `review_required` | Admins | When compliance submitted |
| `approved` | Staff | When admin approves |
| `rejected` | Staff | When admin rejects |
| `missing_info` | Staff | When trying to submit incomplete |

## Progress Tracking

The system tracks completion percentage automatically:
- Each step contributes ~14.3% (100% / 7 steps)
- Progress bar updates after each step save
- 100% completion required before submission

## Security & Permissions

### Document-Level Security (Appwrite)
- Staff can only read/update their own compliance records
- Admins and managers can read all records
- Only admins can approve/reject

### Function-Level Security
```javascript
// Check before allowing access
if (!canAccessCompliance(userId, complianceId, userRole)) {
  throw new Error('Access denied');
}
```

### Audit Trail
All compliance actions are logged:
- Step saves
- Submissions
- Approvals/rejections
- Includes actor ID, timestamp, and changes made

## Troubleshooting

### Collection Not Configured Error
**Problem**: "Compliance wizard collection not configured"

**Solution**: 
1. Run `node scripts/create_compliance_collections.mjs`
2. Add collection IDs to `.env`
3. Restart dev server

### Can't Access Compliance Record
**Problem**: "Access denied" or 404 errors

**Solution**:
- Verify user role in database
- Check document permissions in Appwrite
- Ensure compliance record exists for staff member

### Validation Errors
**Problem**: "Gap of X days detected" or "Coverage insufficient"

**Solution**:
- Review employment dates for gaps
- Ensure address history covers full 60 months
- Check all required fields are filled

### Notifications Not Sending
**Problem**: Notifications don't appear

**Solution**:
- Verify `VITE_APPWRITE_COMPLIANCE_NOTIFICATIONS_COLLECTION_ID` is set
- Check Appwrite permissions on notifications collection
- Look for console errors in browser/server logs

## Best Practices

1. **Save Frequently**: Use auto-save by clicking "Save Step" after entering data
2. **Validate Early**: Address validation errors as you go, don't wait until submission
3. **Upload Documents**: Keep evidence files under 10MB for faster uploads
4. **Clear Communications**: Admins should provide specific rejection reasons
5. **Monitor Progress**: Check progress bar to ensure 100% completion
6. **Regular Reviews**: Admins should review submitted compliance within 48 hours

## Future Enhancements

- Email notifications integration
- Automated reference request system
- DBS check integration
- SIA licence validation via API
- Bulk compliance management for admins
- Compliance expiry reminders
- Document OCR for automatic data extraction

## Support

For issues or questions:
1. Check this documentation
2. Review console logs for error messages
3. Verify environment variables are set
4. Check Appwrite collection permissions
5. Contact system administrator

---

**Version**: 1.0.0  
**Last Updated**: January 16, 2026  
**Compliance Standard**: BS7858:2019
