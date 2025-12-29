# Interim Fortis Platform Implementation Guide

## Quick Start

```bash
# 1. Run database migration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1 \
APPWRITE_PROJECT_ID=your_id \
APPWRITE_API_KEY=your_key \
APPWRITE_DATABASE_ID=fortis_database \
node scripts/migrate-appwrite-interim.js

# 2. Deploy
npm run build:prod && vercel --prod
```

## Architecture Overview

### Database Schema
- **Existing:** users, staff_profiles, audit_logs, client_profiles
- **New Collections:**
  - `staff_invites`: Invite code management (single-use, 30-day expiry)
  - `staff_numbers`: Employee number allocation (FS-000123 format)
  - `staff_compliance`: 7-step wizard progress tracking
  - `staff_grades`: Staff grading (1-5 overall + categories)
  - `shifts`: Shift postings with minimum_grade_required
  - `shift_applications`: Staff applications with eligibility checks
  - `compliance_uploads`: File metadata for Google Drive sync
  - `google_drive_folders`: Per-staff Google Drive folder tracking

### Service Layer

**Files Created:**
1. `src/services/staffInviteService.js` — Invite creation, validation, signup
2. `src/services/complianceService.js` — 7-step wizard management
3. `src/services/schedulingService.js` — Shift posting and application (TBD)
4. `src/services/gradingService.js` — Admin grading interface (TBD)
5. `src/services/googleDriveService.js` — Drive integration with retry logic (TBD)

## Role-Based Access & Scoping

### Client Users
- **Access:** Read-only shifts for owned venues/sites only
- **Scoping:** All shift queries include `client_id` filter
- **Permission:** SCHEDULING_READ only

### Staff Users
- **Signup:** Via invite code only
- **Auto-Assigned:** 
  - Employee number (immutable, indexed)
  - Username (first.last, auto-conflict resolution)
- **Status Flow:** pending_compliance → active → graded
- **Eligibility:** Compliance approved + grade ≥ shift minimum

### Admin Users
- **Access:** All modules, all data
- **Responsibilities:**
  - Create invites
  - Review compliance submissions
  - Grade staff (1-5 scale)
  - Create/manage shifts
  - Manage Google Drive failsafe

## Compliance Wizard (7 Steps)

| Step | Name | Required Fields | Files | Validation |
|------|------|-----------------|-------|-----------|
| 1 | Identity & Right to Work | DOB, NI#, addresses | Proof docs | 5-year address history |
| 2 | Employment History | 5 employers, dates | None | No gaps >31 days, 5-year coverage |
| 3 | Evidence | HMRC/payslips | 1+ files | File type validation |
| 4 | References | 2 refs (employer + character) | None | Full contact details |
| 5 | Criminal Record | NA | Basic Disclosure | File upload required |
| 6 | SIA Licence | Licence #, expiry | None | Not expired, valid format |
| 7 | Intro Video | NA | Video file | Upload required |

**Auto-Actions:**
- Each upload → copy to Google Drive folder
- Google Drive sync tracked in `compliance_uploads`
- Retry logic for failed uploads (max 3 attempts)
- Audit log all actions

## Scheduling Module

### Shift Model
```javascript
{
  client_id: "client_123",        // Scoping
  site_id: "site_456",
  position_title: "Site Supervisor",
  date: "2025-03-15",
  start_time: "08:00",
  end_time: "16:00",
  minimum_grade_required: 3,      // 1-5 or null
  positions_open: 2,
  assignments: [{staff_id, status}],
  status: "open|filled|cancelled"
}
```

### Eligibility Check (Server-Side)
```javascript
// Enforce all checks server-side (not client)
eligibility = {
  compliant: true/false,    // Compliance = "approved"
  grade_eligible: true/false, // Staff grade ≥ minimum_grade_required
  reasons: ["Missing SIA", "Grade too low"]
}
```

### Client View
- See own sites' open shifts
- Apply for shifts
- View assignments
- No access to other clients' data

### Staff View
- Browse all available shifts (open status)
- Apply for shifts
- View own assignments
- See grade (when available)

### Admin View
- All shifts (all clients)
- Create/edit/cancel shifts
- View applications
- Accept/reject applications
- Manage Google Drive

## Google Drive Integration

### Structure
```
Fortis Compliance (Shared Folder)
  └── FS-000123 (John Doe)
      ├── Identity
      │   └── passport.pdf
      ├── Employment
      │   └── p45.pdf
      ├── Evidence
      │   └── payslip_jan.pdf
      ├── Criminal
      │   └── disclosure.pdf
      ├── SIA
      │   └── sia_licence.pdf
      └── Video
          └── intro_video.mp4
```

### Sync Flow
1. Staff uploads file (Appwrite Storage)
2. Backend creates Google Drive file in staff folder
3. Store `google_drive_file_id` in `compliance_uploads`
4. Mark `sync_status: "synced"`
5. **Retry logic:** If sync fails, retry up to 3 times with 5-min backoff
6. Audit log all sync events

### Required ENV Variables
```env
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON=...
GOOGLE_DRIVE_PARENT_FOLDER_ID=...
```

## Validation & Error Handling

### Input Validation
- Email: RFC 5322 format
- Password: 12+ chars (no validation rules, just length)
- Employee number: Format FS-XXXXXX, immutable
- Username: a-z/0-9/dots, lowercase, unique
- SIA licence: Format validation, expiry check
- Addresses: At least 1, covers 5 years
- Employment: No gaps >31 days, 5-year coverage
- References: Exactly 2 (1 employer, 1 character)

### Error Messages
- User-friendly, never expose DB structure
- Actionable guidance (e.g., "Gap of 45 days detected. Max 31 allowed.")
- Audit all validation failures

## Feature Flags (Current State)

```javascript
// src/config/features.ts
COMPLIANCE: true,      // ✓ Visible & accessible
SCHEDULING: true,      // ✓ Visible & accessible
CRM: false,            // Hidden
USER_MANAGEMENT: false, // Hidden
// ... others false
```

**To re-enable:** Set flag to true → immediate effect (nav + routes)

## File Paths Summary

### Migration
- `scripts/migrate-appwrite-interim.js` — Database schema

### Services
- `src/services/staffInviteService.js` — Invite & signup
- `src/services/complianceService.js` — Compliance wizard
- `src/services/schedulingService.js` — Shifts & applications (PENDING)
- `src/services/gradingService.js` — Admin grading (PENDING)
- `src/services/googleDriveService.js` — Drive integration (PENDING)

### Components (TBD)
- `src/pages/portal/ComplianceWizard.jsx` — 7-step form
- `src/pages/portal/SchedulingBoard.jsx` — Shift browser & applications
- `src/pages/portal/AdminGrading.jsx` — Staff review & grading
- `src/pages/portal/StaffSignup.jsx` — Invite signup page
- `src/pages/portal/InviteManagement.jsx` — Admin invite creation

### Hooks (TBD)
- `src/hooks/useCompliance.js` — Wizard state & submission
- `src/hooks/useScheduling.js` — Shifts & applications
- `src/hooks/useGrading.js` — Admin grading form

### Configuration
- `src/config/features.ts` — Feature flags (already updated)

## Testing Checklist

### Invite Flow
- [ ] Admin creates invite
- [ ] Invite email sent
- [ ] Staff signs up with code
- [ ] Employee number auto-allocated
- [ ] Username auto-generated (conflict resolution)
- [ ] Compliance wizard starts
- [ ] Invite marked as used

### Compliance Wizard
- [ ] Step 1: Address history validation (5-year check)
- [ ] Step 2: Employment gaps detected (>31 days)
- [ ] Step 3: Evidence files uploaded to Drive
- [ ] Step 4: References validated (2 refs, correct types)
- [ ] Step 5: Criminal record file uploaded
- [ ] Step 6: SIA licence expiry checked
- [ ] Step 7: Video file uploaded
- [ ] Submission redirects to admin review
- [ ] Admin approve/reject with reasons

### Scheduling
- [ ] Client sees only own sites' shifts
- [ ] Staff sees only open shifts
- [ ] Eligibility check enforced (compliance + grade)
- [ ] Applications tracked
- [ ] Admin sees all shifts & applications

### Admin Grading
- [ ] View pending staff
- [ ] Grade 1-5 overall
- [ ] Add category grades (optional)
- [ ] Save & audit log

### Google Drive
- [ ] Files synced to Drive on upload
- [ ] Folder structure created
- [ ] Retry logic on failures
- [ ] Audit log all sync events

## Deployment Steps

1. **Run Migration**
   ```bash
   node scripts/migrate-appwrite-interim.js
   ```

2. **Build & Deploy**
   ```bash
   npm run build:prod && vercel --prod
   ```

3. **Set Environment Variables** (Vercel Console)
   - `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`
   - `GOOGLE_DRIVE_PARENT_FOLDER_ID`

4. **Test Admin Invite Creation**
   - Login as admin
   - Create test invite
   - Copy signup URL
   - Sign up as staff

5. **Test Compliance Wizard**
   - Complete all 7 steps
   - Verify Google Drive sync
   - Submit for review

6. **Test Scheduling**
   - Create shifts (admin)
   - View & apply (staff)
   - Check eligibility enforcement

## Known Limitations (Phase 1)

- No email notifications yet (manual URL sharing)
- No reference verification API integration
- No background job scheduler (Google Drive sync on-demand)
- No bulk staff import
- No batch shift creation
- Limited admin dashboards

## Next Phases

**Phase 2:** Email notifications, better admin UI
**Phase 3:** Background jobs, reference verification, bulk operations
**Phase 4:** Full HR module, payroll, full CRM

---

**Created:** 29 Dec 2025
**Status:** Ready for implementation
