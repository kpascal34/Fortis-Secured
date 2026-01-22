# Leave Management, Training & Documents Setup Guide

This guide helps you set up the Leave Management, Training Scheduler, and Document Upload features in Appwrite.

## Collections Already in Use

The system integrates with existing collections:

1. **staff_leave** - Leave requests collection
2. **staff_training** - Training sessions collection  
3. **compliance_uploads** or **documents** - Document metadata collection

## Storage Bucket Setup

### 1. Create Documents Bucket

In your Appwrite Console:

1. Go to **Storage** > **Create Bucket**
2. Name: `documents`
3. ID: `documents` (or set `VITE_APPWRITE_DOCUMENTS_BUCKET_ID` in .env)
4. Set permissions:
   - **Create**: `users` (any authenticated user can upload)
   - **Read**: `users` (any authenticated user can view)
   - **Update**: `users` (file owner can update)
   - **Delete**: `users` (file owner can delete)
5. File size limit: **10MB** (adjust as needed)
6. Allowed file extensions: `.pdf`, `.doc`, `.docx`, `.jpg`, `.jpeg`, `.png`

### 2. Update Environment Variables

Add to your `.env` file:

```env
# Documents Storage
VITE_APPWRITE_DOCUMENTS_BUCKET_ID=documents
```

## Collection Schemas

### staff_leave Collection

If not already created, create with these attributes:

```javascript
{
  staffId: 'string',           // Staff member ID (required)
  staffName: 'string',         // Staff member name (required)
  leaveType: 'string',         // Type of leave (required)
  startDate: 'datetime',       // Leave start date (required)
  endDate: 'datetime',         // Leave end date (required)
  reason: 'string',            // Reason for leave (required)
  status: 'string',            // pending/approved/rejected (required)
  requestedAt: 'datetime',     // When request was made (required)
  approvedAt: 'datetime',      // When approved (optional)
  approvedBy: 'string',        // Admin who approved (optional)
}
```

Permissions:
- **Create**: `users` (staff can create their own requests)
- **Read**: `users` (all staff can read)
- **Update**: `role:admin`, `role:manager` (only admins/managers can approve)
- **Delete**: `role:admin`

### staff_training Collection

If not already created, create with these attributes:

```javascript
{
  trainingName: 'string',      // Training title (required)
  description: 'string',       // Training description
  startDate: 'datetime',       // Training start date (required)
  endDate: 'datetime',         // Training end date (required)
  duration: 'string',          // Duration (e.g., "3 days")
  location: 'string',          // Training location
  trainer: 'string',           // Trainer name
  category: 'string',          // Training category (required)
  status: 'string',            // scheduled/in_progress/completed/cancelled (required)
  maxParticipants: 'integer',  // Max number of participants
  participants: 'string',      // JSON array of participants with completion status
  participantCount: 'integer', // Number of participants
}
```

Permissions:
- **Create**: `role:admin`, `role:manager`
- **Read**: `users` (all staff can read)
- **Update**: `role:admin`, `role:manager`, participants can update completion
- **Delete**: `role:admin`

### documents Collection (or compliance_uploads)

Create with these attributes:

```javascript
{
  documentName: 'string',      // Document name (required)
  documentType: 'string',      // Type of document (required)
  description: 'string',       // Document description
  fileId: 'string',            // Appwrite Storage file ID (required)
  fileName: 'string',          // Original filename (required)
  fileSize: 'integer',         // File size in bytes (required)
  fileType: 'string',          // MIME type (required)
  fileUrl: 'string',           // File URL (required)
  uploadedBy: 'string',        // User ID who uploaded (required)
  uploadedByName: 'string',    // Uploader name (required)
  relatedStaffId: 'string',    // Related staff member (optional)
  uploadedAt: 'datetime',      // Upload timestamp (required)
}
```

Permissions:
- **Create**: `users` (authenticated users can upload)
- **Read**: `users` (all staff can read)
- **Update**: `role:admin` (only admins can update)
- **Delete**: `role:admin`, document owner

## Features Overview

### 1. Leave Management

**Location**: HR & Compliance > Leave Management tab

**Features**:
- ✅ Submit new leave requests (staff)
- ✅ View all pending leave requests
- ✅ Approve/reject leave requests (managers/admins)
- ✅ View recent decisions
- ✅ Multiple leave types: Annual, Sick, Personal, Maternity, Paternity, Unpaid, Emergency
- ✅ Date validation (end date must be after start date)
- ✅ Reason required for all requests

**Workflow**:
1. Staff clicks "New Request"
2. Selects leave type, dates, and provides reason
3. Request appears in pending list
4. Manager/admin approves or rejects
5. Status updates and staff is notified

### 2. Training Scheduler

**Location**: HR & Compliance > Training tab

**Features**:
- ✅ Schedule new training sessions
- ✅ Assign multiple staff members as participants
- ✅ Track training categories (Security, Compliance, First Aid, etc.)
- ✅ Monitor completion progress
- ✅ Training status tracking (Scheduled, In Progress, Completed, Cancelled)
- ✅ Edit existing training sessions
- ✅ Search staff by name or email
- ✅ Visual progress bar for completion rates

**Workflow**:
1. Admin clicks "Schedule Training"
2. Fills in training details (name, dates, location, trainer)
3. Searches and selects participants from staff list
4. Training appears in schedule
5. Progress tracked as participants mark completion
6. View/edit training details anytime

### 3. Document Upload

**Location**: HR & Compliance > Documents tab

**Features**:
- ✅ Upload documents via drag-and-drop or file picker
- ✅ Document types: Compliance, Certificate, License, Policy, Contract, Training, ID, Other
- ✅ Link documents to specific staff members
- ✅ Add descriptions and metadata
- ✅ Download documents
- ✅ Delete documents (admins)
- ✅ File size validation (10MB max)
- ✅ Supported formats: PDF, DOC, DOCX, JPG, PNG
- ✅ Upload progress indicator

**Workflow**:
1. User clicks "Upload Document"
2. Selects file from computer
3. Enters document details (name, type, description)
4. Optionally links to a staff member
5. Uploads to Appwrite Storage
6. Metadata saved to database
7. Document appears in list with download option

## Testing the Features

### Test Leave Management
1. Login as a staff member
2. Go to HR & Compliance > Leave Management
3. Click "New Request"
4. Fill in leave details and submit
5. Login as admin/manager
6. Approve or reject the request

### Test Training Scheduler
1. Login as admin/manager
2. Go to HR & Compliance > Training
3. Click "Schedule Training"
4. Fill in training details
5. Select participants from staff list
6. Submit and verify training appears in list

### Test Document Upload
1. Go to HR & Compliance > Documents
2. Click "Upload Document"
3. Select a PDF or image file
4. Fill in document details
5. Submit and verify document appears in list
6. Click download icon to test download

## Environment Variables Summary

Add these to your `.env` file if not already present:

```env
# Collections (usually already configured)
VITE_APPWRITE_STAFF_LEAVE_COLLECTION_ID=staff_leave
VITE_APPWRITE_STAFF_TRAINING_COLLECTION_ID=staff_training
VITE_APPWRITE_COMPLIANCE_UPLOADS_COLLECTION_ID=compliance_uploads

# Storage Bucket (NEW - must be created)
VITE_APPWRITE_DOCUMENTS_BUCKET_ID=documents
```

## Next Steps

1. ✅ Create the `documents` storage bucket in Appwrite
2. ✅ Verify collections exist (staff_leave, staff_training, documents/compliance_uploads)
3. ✅ Set proper permissions on all collections and storage
4. ✅ Test each feature with different user roles
5. ✅ Customize leave types, training categories, document types as needed
6. ✅ Set up email notifications for leave approvals (optional)
7. ✅ Configure automatic reminders for training sessions (optional)

## Troubleshooting

**Leave requests not appearing**:
- Check `staffId` field matches logged-in user ID
- Verify `staff_leave` collection permissions allow user to read

**Cannot upload documents**:
- Verify storage bucket exists and has correct ID
- Check bucket permissions allow users to create files
- Ensure file size is under 10MB limit
- Check allowed file extensions in bucket settings

**Training participants not saving**:
- Participants are stored as JSON string
- Check `participants` attribute is type `string`, not array
- Verify staff profiles collection is accessible

**Documents not downloading**:
- Check storage bucket permissions allow users to read files
- Verify `fileId` is correctly stored in document metadata
- Ensure file still exists in storage (not deleted)

## Security Considerations

1. **File uploads**: 
   - Limit file sizes to prevent storage abuse
   - Restrict file types to prevent malicious uploads
   - Scan uploaded files for viruses (implement separately)

2. **Leave requests**:
   - Only allow staff to create requests for themselves
   - Only allow managers/admins to approve/reject
   - Log all approval actions for audit trail

3. **Training data**:
   - Restrict creation/editing to managers/admins
   - Allow all staff to view training schedule
   - Participants can mark own completion status

4. **Document access**:
   - Consider role-based access for sensitive documents
   - Link documents to specific staff when appropriate
   - Implement document expiry/archival if needed

## Support

For issues or questions:
- Check Appwrite console for error logs
- Verify all environment variables are set correctly
- Review collection permissions
- Check browser console for frontend errors
