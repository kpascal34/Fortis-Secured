# Drive Sync Status System Implementation Guide

## Overview
The Drive Sync Status system provides administrators and managers with real-time monitoring and management of Google Drive syncs for compliance document uploads. It tracks failed, pending, and successful sync attempts with detailed error reporting and retry capabilities.

## Architecture

### Collection: `complianceUploads`
Stores all Google Drive sync attempts with detailed metadata for audit and troubleshooting.

**Schema Fields:**
```javascript
{
  // File Information
  file_name: string,              // Original file name
  file_type: string,              // Type (e.g., 'id_document', 'proof_of_address')
  staff_id: string,               // Staff member associated with file
  
  // Appwrite Storage
  appwrite_file_id: string,       // ID of file in Appwrite storage
  
  // Google Drive
  google_drive_file_id: string,   // ID after successful sync to Google Drive
  
  // Sync Status
  drive_sync_status: enum,        // 'success' | 'failed' | 'pending'
  last_sync_attempt: timestamp,   // When last sync was attempted
  sync_error: string,             // Error message if failed
  
  // Metadata
  created_at: timestamp,
  updated_at: timestamp,
  
  // Indexes
  staff_id (key)
  appwrite_file_id (unique)
  drive_sync_status (key)
}
```

## Service Layer: `driveSyncService.js`

### Core Functions

#### `getSyncStatusRecords(filters = {})`
Fetch sync records with optional filtering.

```javascript
// Get all failed syncs
const failed = await getSyncStatusRecords({ status: 'failed' });

// Get syncs for specific staff
const staffSyncs = await getSyncStatusRecords({ staffId: 'user123' });

// Get syncs by file type
const documents = await getSyncStatusRecords({ fileType: 'id_document' });
```

**Parameters:**
- `filters.status`: Filter by sync status ('success', 'failed', 'pending')
- `filters.staffId`: Filter by staff member ID
- `filters.fileType`: Filter by file type

**Returns:** Array of sync records

---

#### `getFailedSyncs()` / `getPendingSyncs()` / `getSuccessfulSyncs()`
Convenience functions for common queries.

```javascript
const failedSyncs = await getFailedSyncs();      // Failed syncs only
const pendingSyncs = await getPendingSyncs();    // Pending syncs only
const successfulSyncs = await getSuccessfulSyncs(); // Successful syncs only
```

---

#### `getSyncSummary()`
Get statistical summary of all syncs.

```javascript
const summary = await getSyncSummary();
// Returns:
{
  total: 150,           // Total sync records
  failed: 5,            // Failed syncs
  pending: 3,           // Pending syncs
  successful: 142,      // Successful syncs
  failureRate: "3.4"    // Percentage of failures
}
```

---

#### `getStaffSyncStatus(staffId)`
Get comprehensive sync status for a specific staff member.

```javascript
const status = await getStaffSyncStatus('staff-id-123');
// Returns:
{
  staffId: 'staff-id-123',
  total: 12,
  failed: 1,
  pending: 0,
  successful: 11,
  latestAttempt: '2024-01-15T10:30:00Z',
  latestStatus: 'success',
  failedRecords: [...],      // Array of failed sync details
  pendingRecords: [...],     // Array of pending sync details
  successfulRecords: [...]   // Array of successful sync details
}
```

---

#### `logSyncAttempt(staffId, fileName, fileType, status, appwriteFileId, driveFileId, syncError)`
Log a new sync attempt (called by Google Drive upload service).

```javascript
await logSyncAttempt(
  'staff-123',
  'john_doe_passport.pdf',
  'id_document',
  'success',
  'appwrite-file-id-xyz',
  'google-drive-file-id-abc'  // Null if failed
);

// For failed syncs:
await logSyncAttempt(
  'staff-456',
  'address_proof.pdf',
  'proof_of_address',
  'failed',
  'appwrite-file-id-def',
  null,
  'Failed to authenticate with Google Drive: Invalid credentials'
);
```

---

#### `updateSyncStatus(recordId, status, updates = {})`
Update sync status after retry or manual intervention.

```javascript
// Mark as successful after retry
await updateSyncStatus(
  'doc-id-123',
  'success',
  {
    google_drive_file_id: 'new-drive-id',
    sync_error: null
  }
);

// Mark as pending for retry
await updateSyncStatus(
  'doc-id-456',
  'pending',
  { sync_error: null }
);
```

---

#### `generateSyncReport()`
Generate comprehensive sync analytics and statistics.

```javascript
const report = await generateSyncReport();
// Returns:
{
  totalRecords: 150,
  byStatus: {
    'success': 142,
    'failed': 5,
    'pending': 3
  },
  byFileType: {
    'id_document': 80,
    'proof_of_address': 50,
    'employment_verification': 20
  },
  byStaff: {
    'staff-id-1': { total: 12, failed: 1, pending: 0, success: 11 },
    'staff-id-2': { total: 8, failed: 0, pending: 2, success: 6 },
    // ... more staff records
  },
  generatedAt: '2024-01-15T10:30:00Z'
}
```

---

#### `clearOldSuccessfulSyncs(olderThanDays = 90)`
Archive or remove old successful sync records to manage database size.

```javascript
// Clear successful syncs older than 90 days
const cleared = await clearOldSuccessfulSyncs(90);
console.log(`Cleared ${cleared} records`);
```

## UI Component: DriveSyncStatus Page

### Features

#### 1. **Summary Cards**
Four cards displaying:
- Total Records: Overall count of all sync attempts
- Successful: Count of successful syncs (green)
- Pending: Count of pending syncs (yellow)
- Failed: Count of failed syncs (red)

#### 2. **Tabbed Interface**
Switch between three views:
- **Failed Tab**: Shows only failed syncs (allows retry)
- **Pending Tab**: Shows in-progress syncs awaiting retry
- **Successful Tab**: Shows completed syncs

#### 3. **Data Table**
Columns displayed:
| Column | Description | Always Shown |
|--------|-------------|--------------|
| Staff Member | Name and employee number | ✓ |
| File Type | Document category badge | ✓ |
| File Name | Original uploaded filename | ✓ |
| Status | Success/Failed/Pending badge | ✓ |
| Timestamp | When sync was attempted | ✓ |
| Error Details | Failure reason | Failed Tab Only |
| Actions | Retry button | Failed Tab Only |

#### 4. **Search & Filtering**
Search box filters across:
- Staff names
- Employee numbers
- File names
- File types
- Staff IDs

#### 5. **Pagination**
- Configurable page size (10, 25, 50 items)
- Previous/Next navigation
- Current page indicator

#### 6. **Action Buttons**
- **Refresh**: Reload all sync statuses
- **Retry All**: Retry all failed/pending syncs (failed tab only)
- **Individual Retry**: Retry specific sync (per-row button)

### Access Control

**Allowed Roles:**
- ✓ Admins: Full access to all sync records
- ✓ Managers: Full access to all sync records
- ✗ Staff: Cannot access
- ✗ Clients: Cannot access

**Implemented via useRole() hook:**
```javascript
const { isAdmin, isManager } = useRole();

if (!isAdmin && !isManager) {
  return <AccessDenied />;
}
```

## Integration Points

### 1. **Google Drive Service**
When uploading files to Google Drive, call:

```javascript
import * as driveSyncService from './driveSyncService.js';

// On successful upload:
await driveSyncService.logSyncAttempt(
  staffId,
  fileName,
  fileType,
  'success',
  appwriteFileId,
  googleDriveFileId
);

// On failed upload:
await driveSyncService.logSyncAttempt(
  staffId,
  fileName,
  fileType,
  'failed',
  appwriteFileId,
  null,
  error.message
);
```

### 2. **HR Module Dashboard**
Display sync health in HR dashboard:

```javascript
import { getSyncSummary } from './driveSyncService.js';

const summary = await getSyncSummary();
// Show failure rate, pending count, etc.
```

### 3. **Compliance Workflow**
Check sync status before marking compliance as complete:

```javascript
const staffStatus = await getStaffSyncStatus(staffId);
if (staffStatus.failed > 0) {
  console.warn(`${staffStatus.failed} failed syncs for staff`);
}
```

### 4. **Audit Logging**
All sync attempts are logged via auditService:

```javascript
// Automatically logged with each attempt:
{
  action: 'DRIVE_SYNC_ATTEMPT',
  entity: 'compliance_uploads',
  entityId: recordId,
  changes: { status, staffId, fileName }
}
```

## Error Handling

### Common Error Scenarios

| Error | Cause | Resolution |
|-------|-------|-----------|
| Invalid credentials | Google Drive API key expired | Update credentials and retry |
| Rate limit exceeded | Too many API requests | Wait 60 seconds then retry |
| File not found | Appwrite file deleted | Reinstall file and retry |
| Permission denied | Drive folder access revoked | Check Drive folder permissions |
| Network timeout | Connection issue | Retry with exponential backoff |

### Retry Strategy

Failed syncs can be retried:
1. **Individual Retry**: Click "Retry" button on specific record
2. **Bulk Retry**: Click "Retry All" button to retry all failed syncs
3. **Manual Retry**: Update status to 'pending' and system retries

## Usage Examples

### Example 1: Check Failed Syncs on Dashboard
```javascript
import { getFailedSyncs, getSyncSummary } from './services/driveSyncService.js';

function DashboardWidget() {
  const [failed, setFailed] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    async function load() {
      const [failedData, summaryData] = await Promise.all([
        getFailedSyncs(),
        getSyncSummary()
      ]);
      setFailed(failedData);
      setSummary(summaryData);
    }
    load();
  }, []);

  return (
    <div>
      <h3>Drive Sync Health</h3>
      <p>Failure Rate: {summary?.failureRate}%</p>
      {failed.length > 0 && (
        <p className="text-red-500">
          {failed.length} failed syncs require attention
        </p>
      )}
    </div>
  );
}
```

### Example 2: Staff Onboarding - Check Compliance Upload Status
```javascript
import { getStaffSyncStatus } from './services/driveSyncService.js';

async function checkStaffCompliance(staffId) {
  const status = await getStaffSyncStatus(staffId);
  
  if (status.failed > 0) {
    console.warn(`Cannot complete onboarding: ${status.failed} failed uploads`);
    return false;
  }
  
  if (status.successful < 3) {
    console.warn(`Waiting for compliance uploads: ${status.successful}/3 complete`);
    return false;
  }
  
  return true; // Ready to complete onboarding
}
```

### Example 3: Generate Compliance Report
```javascript
import { generateSyncReport } from './services/driveSyncService.js';

async function generateComplianceMetrics() {
  const report = await generateSyncReport();
  
  const successRate = (
    (report.byStatus.success / report.totalRecords) * 100
  ).toFixed(2);
  
  return {
    totalUploads: report.totalRecords,
    successRate: `${successRate}%`,
    failedByType: report.byFileType,
    staffWithIssues: Object.entries(report.byStaff)
      .filter(([_, data]) => data.failed > 0)
      .map(([staffId, data]) => ({ staffId, failures: data.failed }))
  };
}
```

## Performance Considerations

### Database Indexes
The collection includes indexes for:
- `staff_id`: Fast lookup by staff member
- `appwrite_file_id`: Unique constraint, prevent duplicates
- `drive_sync_status`: Efficient filtering by status

### Query Optimization
- Filter by status first to reduce result set
- Use pagination for large result sets (>1000 records)
- Clear old successful syncs periodically

### Recommended Maintenance
```javascript
// Run weekly cleanup
setInterval(async () => {
  // Clear syncs older than 180 days
  await clearOldSuccessfulSyncs(180);
}, 1000 * 60 * 60 * 24 * 7); // Weekly
```

## Testing Checklist

- [ ] Load page with admin account - sees all syncs
- [ ] Load page with manager account - sees all syncs
- [ ] Load page with staff account - gets access denied
- [ ] Summary cards display correct counts
- [ ] Failed tab shows only failed syncs
- [ ] Pending tab shows only pending syncs
- [ ] Successful tab shows only successful syncs
- [ ] Search filters correctly across all fields
- [ ] Pagination works (10/25/50 per page)
- [ ] Individual retry button works
- [ ] Retry all button works
- [ ] Error messages display for failed syncs
- [ ] Timestamps display correctly formatted
- [ ] Status badges show correct colors
- [ ] Refresh button reloads data
- [ ] Mobile responsive layout

## API Integration (Future)

### Webhook Endpoint
```
POST /api/drive-sync
{
  staffId: string
  appwriteFileId: string
  fileName: string
  fileType: string
}
```

### Response
```javascript
{
  success: boolean,
  recordId: string,
  status: 'success' | 'failed' | 'pending',
  driveFileId?: string,
  error?: string
}
```

## Files Modified

- `src/services/driveSyncService.js` (NEW - 460+ lines)
- `src/pages/portal/DriveSyncStatus.jsx` (ENHANCED - 340+ lines)
- `src/lib/appwrite.js` (UPDATED - added collection ID)

## Deployment

```bash
# Build
npm run build

# Deploy to Vercel (auto on push)
git push origin main
```

---

**Last Updated:** January 2026
**Status:** Production Ready
**Version:** 1.0
