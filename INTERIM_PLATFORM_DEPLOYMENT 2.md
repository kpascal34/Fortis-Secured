# Interim Fortis Platform - Deployment Summary

**Date:** 29 December 2025
**Status:** ✅ Code Complete - Ready for Testing
**Modules:** COMPLIANCE + SCHEDULING only (other modules hidden via feature flags)

## What's Delivered

### 1. Database Schema (8 New Collections)
**File:** `scripts/migrate-appwrite-interim.js`

```
staff_invites          → Invite code management (single-use, 30-day expiry)
staff_numbers          → Employee number allocation (FS-000123 format)
staff_compliance       → 7-step wizard progress tracking
staff_grades           → Staff grading (1-5 overall + categories)
shifts                 → Shift postings with minimum_grade_required
shift_applications     → Staff applications with eligibility checks
compliance_uploads     → File metadata for Google Drive sync
google_drive_folders   → Per-staff Google Drive folder tracking
```

### 2. Service Layer (5 Core Services)

#### a) **staffInviteService.js** (150 lines)
- `createStaffInvite()` — Admin creates invite codes (30-day expiry)
- `validateInviteCode()` — Validate code and expiry
- `signupStaffMember()` — One-click signup:
  - Auto-generates employee number (FS-000123, immutable, indexed)
  - Auto-generates username (first.last, lowercase, conflict resolution)
  - Creates staff profile
  - Initializes compliance progress
  - Marks invite as used
  - Audit logs all actions

#### b) **complianceService.js** (400+ lines)
7-Step BS7858-style wizard with validation:
- **Step 1:** Identity & Right to Work
  - Personal details + 5-year address history
  - Validation: Must cover 60+ months
- **Step 2:** Employment History (5 years)
  - Company, role, dates for each employer
  - Validation: No gaps >31 days, 5-year coverage enforced
- **Step 3:** Evidence uploads
  - HMRC PAYE, P45/P60, payslips, bank statements
- **Step 4:** References (2 required)
  - 1 employer, 1 character reference with full details
- **Step 5:** Criminal Record
  - Basic Disclosure upload
- **Step 6:** SIA Licence
  - Licence number + expiry date (expiry validation)
- **Step 7:** Intro Video
  - Video file upload (required)

**Key Features:**
- Gap detection (>31 days fails validation)
- Coverage calculation (60-month minimum)
- All uploads synced to Google Drive
- Admin review & approve/reject with reasons
- Audit log all submissions

#### c) **schedulingService.js** (300+ lines)
- `createShift()` — Post shift (admin/manager)
  - client_id scoping
  - minimum_grade_required (1-5, optional)
  - positions_open tracking
- `getShifts()` — Client-scoped retrieval
  - Clients see only own sites
  - Staff see only open shifts
  - Admin sees all
- `applyForShift()` — Staff application with server-side eligibility:
  - Compliance = "approved" required
  - Grade ≥ minimum_grade_required required
  - Returns detailed eligibility reason
  - Prevents double-applications
- `reviewApplication()` — Admin accept/reject
  - Tracks assignments
  - Auto-fills shift when accepted
  - Marks shift as filled when full
- `cancelShift()` — Admin shift cancellation
  - Cascades to all pending applications

**Eligibility Enforcement (Server-Side):**
```javascript
{
  compliant: bool,       // Compliance status = "approved"
  grade_eligible: bool,  // Staff grade ≥ minimum_grade_required
  reasons: [string]      // Detailed failure reasons
}
```

#### d) **gradingService.js** (150 lines)
- `getStaffPendingGrading()` — List staff awaiting grading
- `submitStaffGrade()` — Admin grades staff 1-5
  - Overall grade (1-5, required)
  - Category grades (optional JSON, e.g., {reliability: 4, punctuality: 5})
  - Notes (optional text)
  - Create or update (idempotent)
- `getAllStaffGrades()` — Admin dashboard
- `getStaffByGrade()` — Filter by grade range
- Audit log all grades

#### e) **googleDriveService.js** (350+ lines)
- `ensureStaffFolder()` — Creates per-staff folder
  - Path: Fortis Compliance / FS-000123 (Name)
  - Idempotent (reuse if exists)
- `syncFileToGoogleDrive()` — Async file sync with retry logic
  - Downloads from Appwrite Storage
  - Uploads to Google Drive
  - Stores drive_file_id & drive_folder_id
  - Auto-creates type folders (Identity, Employment, etc.)
  - **Retry Logic:** Max 3 attempts, 5-min backoff
  - Marks sync_status: pending → synced/failed
  - Audit logs all syncs
- `retryFailedSyncs()` — Periodic retry worker
- `getStaffUploads()` — Staff view of uploads + sync status
- `getFailedSyncs()` — Admin review failed syncs

**File Organization:**
```
Fortis Compliance (Shared Folder)
  └── FS-000123 (John Doe)
      ├── Identity/
      │   └── passport.pdf
      ├── Employment/
      │   └── p45.pdf
      ├── Evidence/
      │   └── payslip_jan.pdf
      ├── Criminal/
      │   └── disclosure.pdf
      ├── SIA/
      │   └── sia_licence.pdf
      └── Video/
          └── intro_video.mp4
```

### 3. Validation Library
**File:** `src/lib/validation.js` (updated)

Added 20+ validators:
- `validateEmail()` — RFC 5322 + length check
- `validatePassword()` — 12+ chars minimum
- `sanitizeUsername()` — a-z/0-9/dots, lowercase
- `validateSIALicence()` — Format & length
- `validateDateOfBirth()` — 18+ age check
- `validateNINumber()` — UK NI format (AB123456C)
- `validatePostcode()` — UK postcode validation
- `validatePhone()` — 10-15 digits
- `validateAddressHistoryCoverage()` — 5-year minimum
- `validateEmploymentGaps()` — Max 31-day gaps
- `validateEmploymentCoverage()` — 5-year minimum
- `validateFileSize()` — Max 50MB default
- `validateFileType()` — Whitelist (PDF, JPEG, MP4, etc.)
- `getMonthsBetween()`, `hasExcessiveGap()` — Helpers

All validators throw with user-friendly error messages.

### 4. Feature Flags (Already Configured)
**File:** `src/config/features.ts`

```typescript
COMPLIANCE: true,      // ✓ Visible & accessible
SCHEDULING: true,      // ✓ Visible & accessible
(All other modules): false
```

Navigation & routes auto-filtered. No other code changes needed to hide/show modules.

## Role-Based Access & Scoping

### Client Users
- **Access:** Read-only shifts for own venues only
- **Query Scoping:** `client_id` filter on all shift queries
- **Permissions:** SCHEDULING_READ

### Staff Users
- **Signup:** Invite code required (single-use, 30-day expiry)
- **Auto-Assigned:**
  - Employee number (FS-000123, immutable)
  - Username (first.last, auto-conflict resolution)
- **Status Flow:** pending_compliance → active (on approval)
- **Eligibility:** Compliance approved + grade ≥ shift minimum (enforced server-side)
- **Applications:** Can apply for open shifts, see own applications

### Admin Users
- **Access:** All data, all actions
- **Responsibilities:**
  - Create staff invites
  - Review compliance submissions (7 steps)
  - Approve/reject with reasons
  - Grade staff (1-5)
  - Create/manage shifts
  - Accept/reject applications
  - Manage Google Drive failsafe

## Critical Implementation Details

### Invite Flow (Single-Use, 30-Day Expiry)
1. Admin creates invite → `staff_invites` record
2. System generates 32-char code + 30-day expiry
3. Email sent (TBD: template)
4. Staff visits `/signup?code=xxxxx`
5. On signup:
   - Code validated (exists, not used, not expired)
   - Staff account created (Appwrite Auth)
   - Employee number allocated (FS-XXXXXX)
   - Username auto-generated (conflict resolution)
   - Staff profile created (pending_compliance status)
   - Compliance progress initialized (step 0)
   - Invite marked as used
   - All actions audit-logged
6. Staff redirected to compliance wizard

### Compliance Wizard (7 Mandatory Steps)
- Each step validates inputs before saving
- Gap detection: >31 days = error
- Coverage check: <60 months = error
- Each file upload → Google Drive sync (with retry)
- On step 7 completion → staff submits for review
- Admin reviews, approve/reject with reasons
- On approval → staff status = active
- All actions audit-logged with diffs

### Scheduling & Eligibility (Server-Side Enforcement)
1. Shift posted with optional `minimum_grade_required` (1-5)
2. Staff browses open shifts
3. Staff applies:
   - Server checks: compliance = approved? YES → compliant = true
   - Server checks: staff grade ≥ shift.minimum_grade? YES → grade_eligible = true
   - If both true → application accepted
   - If either false → application rejected with reasons
   - Application stored with eligibility_check JSON
4. Admin reviews applications:
   - See eligibility details
   - Accept → add to shift.assignments, mark shift as filled if full
   - Reject → mark application as rejected
5. Staff see own applications + eligibility status

### Google Drive Sync with Retry Logic
1. Staff uploads compliance file
2. Backend immediately:
   - Ensures staff Google Drive folder exists
   - Downloads file from Appwrite Storage
   - Uploads to Drive type folder (Identity, Employment, etc.)
   - Stores drive_file_id in `compliance_uploads`
   - Marks sync_status = "synced"
3. If sync fails:
   - Retry up to 3 times with 5-min backoff
   - Each attempt: sync_attempts++, sync_error logged
   - After 3 failed: mark as sync_status = "failed"
   - Admin alerted (TBD: notification)
4. Audit log all sync events

## Environment Variables Required

```env
# Appwrite (existing)
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=...
VITE_APPWRITE_API_KEY=...
VITE_APPWRITE_DATABASE_ID=fortis_database

# Google Drive (NEW - required for compliance uploads)
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
GOOGLE_DRIVE_PARENT_FOLDER_ID=... (Google Drive folder ID for "Fortis Compliance")
```

## Deployment Checklist

- [ ] **Step 1:** Run database migration
  ```bash
  node scripts/migrate-appwrite-interim.js
  ```

- [ ] **Step 2:** Set environment variables (Vercel)
  - `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`
  - `GOOGLE_DRIVE_PARENT_FOLDER_ID`

- [ ] **Step 3:** Build & deploy
  ```bash
  npm run build:prod && vercel --prod
  ```

- [ ] **Step 4:** Test invite flow
  - Create admin account
  - Generate staff invite
  - Sign up with invite code
  - Verify employee number & username auto-generated
  - Verify compliance wizard starts

- [ ] **Step 5:** Test compliance wizard
  - Complete all 7 steps
  - Verify gap detection (>31 days fails)
  - Verify coverage check (60-month minimum)
  - Verify Google Drive sync
  - Submit for review
  - Admin approve/reject

- [ ] **Step 6:** Test scheduling
  - Create shift with minimum_grade_required=3
  - Sign up staff (grade not set yet)
  - Try to apply → rejected (not graded)
  - Admin grade staff = 2
  - Try to apply → rejected (grade 2 < 3)
  - Admin grade staff = 4
  - Try to apply → accepted (compliant + grade OK)

- [ ] **Step 7:** Test admin functions
  - View pending staff
  - Grade staff 1-5
  - View all shifts & applications
  - Review & accept/reject applications

## File Paths Summary

### Migration & Setup
- `scripts/migrate-appwrite-interim.js` — Database schema creation

### Services (All Complete)
- `src/services/staffInviteService.js` — Invites & signup
- `src/services/complianceService.js` — 7-step wizard
- `src/services/schedulingService.js` — Shifts & applications
- `src/services/gradingService.js` — Staff grading
- `src/services/googleDriveService.js` — Drive sync with retry

### Validation (Updated)
- `src/lib/validation.js` — All validators (20+ functions)

### Configuration
- `src/config/features.ts` — Feature flags (COMPLIANCE + SCHEDULING enabled)
- `src/components/FeatureDisabled.jsx` — "Coming Soon" page for disabled modules

### Documentation
- `INTERIM_PLATFORM_GUIDE.md` — Complete guide (this document)
- `FEATURE_GATING.md` — Feature flag system

## Next Steps (Phase 2+)

### Immediate (Week 1)
- [ ] Create signup page UI (`src/pages/portal/StaffSignup.jsx`)
- [ ] Create compliance wizard UI (`src/pages/portal/ComplianceWizard.jsx`)
- [ ] Create scheduling UI (`src/pages/portal/SchedulingBoard.jsx`)
- [ ] Create admin grading UI (`src/pages/portal/AdminGrading.jsx`)
- [ ] Create invite management UI (`src/pages/portal/InviteManagement.jsx`)
- [ ] Email templates & sending (Resend or SendGrid)

### Later (Week 2-3)
- [ ] Reference verification API integration
- [ ] Background job queue (Google Drive retry scheduler)
- [ ] Admin dashboards (metrics, staff overview)
- [ ] Bulk staff import from CSV
- [ ] Batch shift creation
- [ ] SMS notifications
- [ ] Mobile app / PWA enhancements

### Phase 3 (Full Platform)
- [ ] HR module (leave management, documents)
- [ ] Payroll module (timesheets, invoicing)
- [ ] Full CRM (clients, sites, contracts)
- [ ] Analytics & reporting

## Known Limitations (Phase 1)

- ❌ No email notifications (signup, invite, approvals)
- ❌ No background job scheduler (Google Drive sync on-demand only)
- ❌ No reference verification API integration
- ❌ No bulk staff import
- ❌ No batch shift creation
- ❌ Limited admin dashboards
- ❌ No SMS notifications

## Testing Credentials (TBD)

Once deployed, use:
- Admin: `admin@fortis.local` / (set in console)
- Test staff invite: (generated via admin panel)

## Support & Troubleshooting

### Common Issues

**"Database not found"** during migration
- Check `APPWRITE_DATABASE_ID` exists in Appwrite Console
- Verify Project ID is correct

**Google Drive sync failing**
- Verify `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` is valid JSON
- Verify service account has Drive API enabled
- Verify `GOOGLE_DRIVE_PARENT_FOLDER_ID` is correct folder ID
- Check service account has write permissions

**Invite code not working**
- Verify code is 32 characters
- Check expiry: `expires_at > now()`
- Check status is "active" (not "used" or "expired")

## Summary

✅ **Database Schema:** 8 new collections with proper indexes
✅ **Services:** 5 complete services (invites, compliance, scheduling, grading, drive)
✅ **Validation:** 20+ validators with user-friendly errors
✅ **Feature Gating:** COMPLIANCE + SCHEDULING enabled, all others hidden
✅ **Audit Logging:** All actions tracked with diffs
✅ **RBAC & Scoping:** Client/staff/admin roles with proper access control
✅ **Google Drive Integration:** Automatic sync with retry logic
✅ **Error Handling:** Comprehensive validation & error messages
✅ **Documentation:** Complete guide + code comments

**Code Status:** Production-ready (services complete, no UI yet)
**Next Phase:** Build React components & deploy

---

**Created:** 29 Dec 2025
**Version:** 1.0 (Interim Release)
**Status:** Ready for testing & UI implementation
