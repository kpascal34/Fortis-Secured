# SYSTEM Remediation Phase 1 Implementation

## 1) Env/config centralization + production fatal guard
- **Reproduction steps:** Build portal with missing Appwrite collection IDs in `.env.production`; routes partially render then fail at data fetch boundaries.
- **Root cause:** Runtime read scattered `import.meta.env` / `process.env` values directly, with no single required-contract validator.
- **Code change:** Added `src/lib/env.js` (exclusive env access) + `src/lib/config.js` (normalized config + required checks), refactored app bootstrap/auth/services/pages to consume config only, and added fatal production config UI in `App.jsx`.
- **Validation steps:** Run `npm run verify:no-process-env`, `npm run verify:env`, and `npm run build`; production build must fail visibly at runtime if required keys are absent.
- **Commit message:** `fix(remediation): centralize env/config and enforce fatal production config guard`

## 2) Schema integrity and naming consistency
- **Reproduction steps:** Run compliance/audit/recurring features with missing/mismatched IDs (`auditLogs` vs `audit_logs`, hardcoded `recurring_patterns`).
- **Root cause:** Hardcoded collection names bypassed config and created mismatch risk.
- **Code change:** Canonicalized `audit_logs` default in config, removed hardcoded recurring pattern collection name in `RecurringPatterns.jsx`, introduced `VITE_APPWRITE_RECURRING_PATTERNS_COLLECTION_ID`, and aligned HR/Drive flows to explicit compliance uploads collection config.
- **Validation steps:** Run `npm run verify:schema`; when `APPWRITE_API_KEY` is set it validates remote collection existence.
- **Commit message:** `fix(remediation): enforce canonical collection IDs for audit, recurring patterns, and HR uploads`

## 3) Compliance V1 hard-disable until provisioned
- **Reproduction steps:** Open Compliance Wizard v1 with undocumented collections absent.
- **Root cause:** Service defaulted to undocumented fallback collection IDs.
- **Code change:** `complianceWizardV1Service` now requires explicit collection IDs + feature flag `VITE_ENABLE_COMPLIANCE_V1`; `ComplianceWizard.jsx` shows explicit disabled UI with remediation instructions.
- **Validation steps:** With flag off, UI shows disabled state. With flag on + missing IDs, service throws actionable error.
- **Commit message:** `fix(remediation): gate compliance v1 behind explicit feature flag and required schema`

## 4) Remove duplicate artifacts and add enforcement scripts
- **Reproduction steps:** Repo contains duplicate `* 2.js|jsx` modules causing drift risk.
- **Root cause:** Stale duplicate files remained in source tree.
- **Code change:** Deleted duplicate `* 2.*` files and added script guard `scripts/no-duplicate-2-files.mjs`.
- **Validation steps:** Run `npm run verify:no-duplicates`.
- **Commit message:** `chore(remediation): remove duplicate source files and enforce duplicate guard`

## 5) Service contract hardening + dashboard failure visibility
- **Reproduction steps:** Simulate Appwrite errors in analytics/dashboard/drive sync/invite flow.
- **Root cause:** Multiple services masked errors by returning placeholder metrics/data (`[]`, `0`) and dashboard swallowed partial failures.
- **Code change:** Hardened `analyticsService`, `driveSyncService`, `staffInviteService`, `Dashboard.jsx`, and `InviteManagement.jsx` to surface explicit errors and user feedback.
- **Validation steps:** Trigger a bad collection ID and confirm explicit error state appears, with no silent fallback metrics.
- **Commit message:** `fix(remediation): standardize service error contracts and remove dashboard masking`
