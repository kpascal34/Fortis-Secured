# Portal Implementation Plan (P0–P2)

This plan is derived from current route/page implementation status and dependency inspection.

## P0 — Stabilize baseline and remove hard blockers

### 1) Normalize invite collection access (broken path)
- **Goal**: Make `/portal/invite-management` resilient by removing direct env coupling.
- **Files to change**:
  - `src/pages/portal/InviteManagement.jsx`
  - `src/services/staffInviteService.js`
  - `src/lib/appwrite.js` (if additional config alias needed)
- **Appwrite schema actions**:
  - Ensure staff invite collection exists and ID is standardized (prefer `staff_invites`).
  - Confirm indexes for invite lookup (code/email/status/expiry).
- **Tests/checks**:
  - Route-level smoke test for admin access and invite list render.
  - Service unit checks for create/list/resend invite behavior with missing env fallback.

### 2) Align feature flags with product reality
- **Goal**: Separate "disabled intentionally" from "implemented but unstable".
- **Files to change**:
  - `src/config/features.ts`
  - `docs/portal-audit.md` (status refresh)
- **Appwrite schema actions**:
  - None directly; this is release-gating metadata.
- **Tests/checks**:
  - Verify each flag-off route renders `FeatureDisabled` and does not crash.
  - Snapshot or smoke checks for enabled/disabled route matrix.

### 3) Add minimal regression suite for portal routing
- **Goal**: Prevent unnoticed route regressions.
- **Files to change**:
  - `src/App.jsx`
  - new test harness files (router smoke tests)
- **Appwrite schema actions**:
  - None.
- **Tests/checks**:
  - Automated checks for all `/portal` routes under role contexts (admin/staff/client).

---

## P1 — Data integrity + RBAC consistency for active modules

### 4) Standardize collection ID usage through `config`
- **Goal**: All portal pages use `config.*CollectionId` (no direct env reads).
- **Files to change**:
  - `src/pages/portal/*.jsx` (pages with direct env access)
  - `src/services/*.js` where collection IDs are duplicated
  - `src/lib/appwrite.js`
- **Appwrite schema actions**:
  - Validate required collections from config exist in target DB.
  - Publish canonical collection ID list in docs.
- **Tests/checks**:
  - Static check to reject `import.meta.env.VITE_APPWRITE_*COLLECTION*` usage in portal pages.
  - Runtime smoke checks with missing optional collections (graceful fallback).

### 5) Promote active modules from fallback-heavy to live-data-first
- **Goal**: Reduce mock/demo branches in scheduling + compliance paths.
- **Files to change**:
  - `src/pages/portal/SchedulingBoard.jsx`
  - `src/pages/portal/NewShift.jsx`
  - `src/pages/portal/DriveSyncStatus.jsx`
  - `src/pages/portal/HR.jsx`
  - supporting libs/services (`src/lib/shiftApplications.js`, `src/services/driveSyncService.js`)
- **Appwrite schema actions**:
  - Verify relationships/indexes for `shifts`, `applications`, `staff_*`, `compliance_uploads`.
  - Add missing indexes used by common query filters/orderings.
- **Tests/checks**:
  - CRUD smoke tests on shifts/applications/HR docs.
  - Validate demo fallback only triggers when explicitly in demo mode.

### 6) RBAC convergence (route, page, and service)
- **Goal**: Ensure route roles, page guards, and service permissions match.
- **Files to change**:
  - `src/App.jsx`
  - `src/hooks/useRBAC.js`
  - `src/lib/rbacCore.js`
  - selected portal pages currently missing page-level access checks
- **Appwrite schema actions**:
  - Reconcile collection permissions in Appwrite with app-side role matrix.
- **Tests/checks**:
  - Matrix tests for admin/staff/client access across representative endpoints.

---

## P2 — Expand disabled modules to production-ready

### 7) Operations modules hardening (posts/time/tasks/incidents/assets/messages)
- **Goal**: Move feature-flagged modules from partial to working.
- **Files to change**:
  - `src/pages/portal/Posts.jsx`
  - `src/pages/portal/TimeTracking.jsx`
  - `src/pages/portal/Tasks.jsx`
  - `src/pages/portal/Incidents.jsx`
  - `src/pages/portal/Assets.jsx`
  - `src/pages/portal/Messages.jsx`
- **Appwrite schema actions**:
  - Ensure collections and query indexes for each module are complete.
  - Add retention/lifecycle policies where needed (incidents/audit-like records).
- **Tests/checks**:
  - End-to-end user flows per module (create/update/filter/export).
  - Build-time plus runtime checks for empty-state and error-state UX.

### 8) Admin modules hardening (finance/users/payroll/reports/analytics/settings/ai)
- **Goal**: Convert admin screens from local/mock-heavy to integrated.
- **Files to change**:
  - `src/pages/portal/Finance.jsx`
  - `src/pages/portal/UserManagement.jsx`
  - `src/pages/portal/Payroll.jsx`
  - `src/pages/portal/Reports.jsx`
  - `src/pages/portal/Analytics.jsx`
  - `src/pages/portal/Settings.jsx`
  - `src/pages/portal/AIAssistant.jsx`
- **Appwrite schema actions**:
  - Add/validate supporting collections for finance/payroll/report snapshots if persistence is required.
  - Define secure storage strategy for settings/secrets (avoid client-only secret handling).
- **Tests/checks**:
  - Role-restricted integration tests.
  - Security checks for settings and user-management operations.

### 9) Release readiness checklist + observability
- **Goal**: Add maintainable release criteria for portal modules.
- **Files to change**:
  - `docs/portal-audit.md`
  - `README.md` / operational docs
  - optional telemetry hooks in `src/lib/analyticsUtils.js`
- **Appwrite schema actions**:
  - Ensure audit/event data model supports release metrics and operational monitoring.
- **Tests/checks**:
  - CI gates: build, lint, route smoke, critical module flow tests.
  - Post-deploy verification runbook for `/portal` routes.

---

## Command audit (requested checks)
- `npm test`: **not run** (script not present in `package.json`).
- `npm run lint`: **not run** (script not present in `package.json`).
- `npm run build`: **passed** locally.
