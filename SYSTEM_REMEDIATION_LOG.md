# SYSTEM_REMEDIATION_LOG

## 0. Snapshot
- Commit/branch scanned: `64dc81468afd4a9c40dde4687dc57a1f21d3efd3` on `work`
- Scan timestamp (UTC): `2026-03-01T23:55:56Z`
- App framework (Next/Vite/etc): Vite + React (`vite`, `react`, `react-router-dom` in package.json)
- Backend (Appwrite project assumptions): Appwrite Cloud + Appwrite Functions + Vercel serverless API routes
- Environments found: `.env.development`, `.env.example`, `.env.production`
- Centralized config file(s) found (or “None”): `src/lib/appwrite.js` (primary Appwrite/env config), plus feature flags in `src/config/features.ts`

## 1. Fault Inventory (By Category)

### A) Env / Config Hygiene
| Severity | Finding | Evidence (path:lines) | Impact | Remediation |
|---|---|---|---|---|
| Blocker | Production env file omits all Appwrite collection IDs while runtime config expects many IDs. | `.env.production:1-22`, `src/lib/appwrite.js:33-63` | Core portal modules can silently degrade or hard-fail depending on route and fallback path. | Phase 1: create a complete production env contract and populate all required `VITE_APPWRITE_*_COLLECTION_ID` variables; validate at startup with explicit fatal/config error UI for missing required IDs. |
| High | Direct env access bypasses centralized config layer in portal pages/services. | `src/pages/portal/InviteManagement.jsx:34`, `src/services/complianceWizardV1Service.js:5-7`, `src/services/complianceWizardV1Service.js:11`, `src/context/AuthContext.jsx:27-28` | Inconsistent environment behavior and drift from single source of truth; harder rollout/testing across environments. | Phase 1: add centralized `env/config` accessor and replace direct `import.meta.env` usage in feature code paths. |
| High | Browser code reads `process.env` in Vite client modules (non-standard at runtime) alongside `import.meta.env`. | `src/services/schedulingService.js:10-14`, `src/services/googleDriveService.js:16-25`, `src/services/fileUploadService.js:8`, `src/main.jsx:9`, `src/App.jsx:525` | Undefined values in browser bundles can alter feature behavior and cause environment-specific bugs. | Phase 1: standardize to `import.meta.env` in client code and reserve `process.env` for Node-only scripts/functions. |
| Medium | Multiple non-centralized fallback IDs are embedded in services/pages (collection names in code). | `src/services/complianceWizardV1Service.js:5-8`, `src/pages/portal/RecurringPatterns.jsx:61`, `src/pages/portal/HR.jsx:99-101` | Hidden coupling to undocumented collection IDs; future renames break features unpredictably. | Phase 1: move all collection IDs to centralized config constants and add schema docs parity checks in CI. |
| Medium | `.env.example` documents only a subset of collection IDs used in runtime config. | `.env.example:1-22`, `src/lib/appwrite.js:33-63` | New environments can be provisioned incompletely, producing partial functionality. | Phase 1: expand `.env.example` to include all referenced IDs and annotate required vs optional. |

### B) Appwrite / Collections Integrity
| Severity | Finding | Evidence (path:lines) | Impact | Remediation |
|---|---|---|---|---|
| High | Compliance V1 service uses undocumented fallback collections (`documentTemplates`, `complianceSubmissions`, `documentInstances`) not present in core schema docs. | `src/services/complianceWizardV1Service.js:5-7`, `APPWRITE_SCHEMA.md:1-220` | Compliance workflow can target nonexistent collections despite “configured” app state. | Phase 1: explicitly add these collections to canonical schema docs and centralized config, then enforce startup validation. |
| High | Audit log collection naming mismatch risk: fallback `auditLogs` (camel) vs schema/docs `audit_logs` (snake). | `src/services/complianceWizardV1Service.js:8`, `APPWRITE_SCHEMA.md:140-186`, `src/lib/appwrite.js:38` | Writes may fail in one module while succeeding in others due to ID mismatch. | Phase 1: canonicalize collection ID naming and remove divergent fallbacks. |
| High | Hardcoded collection use bypasses config (`recurring_patterns`). | `src/pages/portal/RecurringPatterns.jsx:61` | Route can fail if Appwrite collection ID differs from hardcoded string or env strategy. | Phase 1: add `recurringPatternsCollectionId` to centralized config and env docs; migrate consumers. |
| Medium | HR module appears to mix compliance uploads with fallback `documents` collection ID. | `src/pages/portal/HR.jsx:99-101`, `src/pages/portal/HR.jsx:172`, `src/lib/appwrite.js:60` | Data may be fetched from wrong collection; compliance docs/status can be inconsistent. | Phase 1: separate collection constants for upload metadata vs binary documents bucket references and update HR queries. |
| Medium | Mixed field naming conventions remain in invite flow (`used_by`, `used_at`) while broader codebase migrates snake/camel fields. | `src/services/staffInviteService.js:158-218`, `scripts/migrateFieldNames.ts:20-35`, `docs/APPWRITE_INVITE_PASSWORD_RECOVERY_SETUP.md:37-38` | Schema drift and migration complexity; increased risk of query misses and write incompatibility. | Phase 1: define canonical field casing policy and migrate invite fields or document intentional exception. |

### C) Feature Readiness / Flags / Demo Logic
| Severity | Finding | Evidence (path:lines) | Impact | Remediation |
|---|---|---|---|---|
| High | Portal audit marks critical routes as `Broken`/`Partially`, including invite management hard dependency. | `docs/portal-audit.md:49-50`, `docs/portal-audit.md:81-82` | Known production risk areas are already identified but unresolved; onboarding and ops paths are unstable. | Phase 1: prioritize broken route remediation first (invite flow + drive sync preflight). |
| High | Demo/fallback mode is deeply active across auth and data services. | `src/lib/appwrite.js:5-20`, `src/context/AuthContext.jsx:42-44`, `src/services/driveSyncService.js:112`, `src/pages/portal/OpenShifts.jsx:126-144` | Production-like behavior is masked by demo paths; defects can evade detection until deployment. | Phase 1: add strict production mode guardrails (disallow demo mode in production build/env). |
| Medium | Feature flags disable many routes, but routes still mounted and render `FeatureDisabled`, creating “available-but-not-ready” UX ambiguity. | `src/config/features.ts:20-39`, `src/App.jsx:125-133`, `src/App.jsx:441-509` | Users can navigate to disabled modules and perceive platform instability. | Phase 1: couple navigation visibility + routing guard + readiness metadata; optionally hide disabled routes entirely for non-admin testers. |
| Medium | Mock datasets are present in live portal pages/reports. | `src/pages/portal/Reports.jsx:143-178`, `src/pages/ScheduleDemo.jsx:101-213`, `src/data/demoAuditLogs.js:2-5`, `src/data/demoGuards.js:2-6` | Analytics/reporting decisions may be based on synthetic values; trust/compliance risk. | Phase 1: fence mock data behind explicit non-production build flag and telemetry marker. |

### D) Code Duplication / Hygiene
| Severity | Finding | Evidence (path:lines) | Impact | Remediation |
|---|---|---|---|---|
| High | Duplicate “copy” files exist for core libraries/services (e.g., `* 2.js`, `FeatureDisabled 2.jsx`). | `src/services/userService 2.js:1`, `src/services/complianceService 2.js:1`, `src/services/schedulingService 2.js:1`, `src/lib/dragDropShiftService 2.js:1`, `src/components/FeatureDisabled 2.jsx:1` | High drift risk; developers may patch wrong file, causing nondeterministic behavior and regressions. | Phase 1: establish authoritative file set, diff duplicates, merge intentionally, delete stale copies, and add lint rule/check for duplicate filename patterns. |
| Medium | Parallel RBAC implementations/types (`rbac.js`, `rbac.ts`, `rbacCore.js`, `rbacCore 2.js`) increase ambiguity. | `src/lib/rbac.js:1`, `src/lib/rbac.ts:1`, `src/lib/rbacCore.js:1`, `src/lib/rbacCore 2.js:1` | Permission logic divergence can lead to unauthorized access or false denials. | Phase 1: consolidate RBAC source of truth and enforce import boundaries. |
| Medium | Dead/commented production code blocks suggest incomplete module implementations. | `src/pages/portal/Tasks.jsx:222-267` | Features appear present but CRUD operations are disabled, causing user-facing no-op behavior. | Phase 1: either complete backend integration with visible status handling or hide feature until ready. |

### E) Logging / Error Handling
| Severity | Finding | Evidence (path:lines) | Impact | Remediation |
|---|---|---|---|---|
| High | Silent catches and swallowed errors violate “no silent failures.” | `src/lib/pwa.js:478`, `src/services/googleDriveService.js:147`, `src/services/staffInviteService.js:74-77` | Failures are hidden, making incident triage and user feedback unreliable. | Phase 1: replace swallowed catches with structured error reporting + user-facing toasts where user-impacting. |
| High | Services mix throw-based errors with success-like fallback returns (`[]`, zero metrics), leading to inconsistent error contracts. | `src/services/analyticsService.js:6-12`, `src/services/driveSyncService.js:108-115`, `src/services/driveSyncService.js:218-228` | Callers cannot reliably distinguish “empty data” vs “failed request,” causing false healthy states. | Phase 1: standardize service contract (`Result` shape or always-throw policy) and enforce via tests. |
| Medium | Extensive direct `console.log/error/warn` across portal/services instead of structured logging pipeline. | `src/pages/portal/InviteManagement.jsx:93-116`, `src/pages/portal/Clients.jsx:104-121`, `src/hooks/useRBAC.js:40-247`, `src/lib/performance.js:27-401` | Production observability is fragmented; sensitive/internal data may leak to console. | Phase 1: introduce centralized logger utility with severity levels, redaction, and environment gating. |
| Medium | Promise-level fallback catches in pages hide data-layer errors and continue with empty datasets. | `src/pages/portal/Dashboard.jsx:68-72` | Dashboards can display misleading KPIs without surfacing backend health issues. | Phase 1: propagate failure states to UI banners/toasts and include retry + diagnostics metadata. |

## 2. Cross-Reference Map (Collections ↔ Services ↔ Pages)
- `staff_invites` (`VITE_APPWRITE_STAFF_INVITES_COLLECTION_ID`) -> `src/services/staffInviteService.js` -> `src/pages/portal/InviteManagement.jsx` and `/portal/invite/:token` flow via `src/pages/StaffSignup.jsx`. **Mismatch risk:** page uses direct env instead of `config.staffInvitesCollectionId`. 
- `staff_numbers` -> `src/services/staffInviteService.js` -> invite/signup path. **Unknown:** production env does not define this ID.
- `staff_profiles` -> `src/services/userService.js`, `src/services/analyticsService.js`, `src/pages/portal/HR.jsx` -> profile/user/admin analytics pages.
- `compliance_uploads` -> `src/services/driveSyncService.js` -> `src/pages/portal/DriveSyncStatus.jsx`, `src/pages/portal/HR.jsx`. **Mismatch risk:** HR fallbacks to `documents`.
- `admin_grading` -> `src/services/gradingService.js` -> `src/pages/portal/AdminGrading.jsx`. **Unknown:** not present in `.env.production`.
- `applications` + `shifts` -> `src/lib/shiftApplications.js`, `src/pages/portal/OpenShifts.jsx`, `src/pages/portal/ShiftApplications.jsx`, `src/pages/portal/SchedulingBoard.jsx`.
- `shift_assignments` -> `src/pages/portal/MySchedule.jsx`, `src/pages/portal/TimeTracking.jsx`, `src/pages/portal/Finance.jsx`.
- `incidents` -> `src/pages/portal/Incidents.jsx`, dashboard summary in `src/pages/portal/Dashboard.jsx`.
- `tasks` -> `src/pages/portal/Tasks.jsx`, dashboard task card; **module incomplete** (commented mutations).
- `documentTemplates` / `complianceSubmissions` / `documentInstances` -> `src/services/complianceWizardV1Service.js` -> `src/pages/portal/ComplianceWizard.jsx`. **Unknown IDs:** not in centralized config and not listed in `.env.example`/`.env.production`.
- `recurring_patterns` -> direct page query in `src/pages/portal/RecurringPatterns.jsx`; **mismatch:** no centralized config entry.

## 3. Hotspot Files (Top 10)
1. `src/lib/appwrite.js` — central runtime gate for demo mode + all collection IDs; currently allows broad fallback behavior.
2. `src/pages/portal/InviteManagement.jsx` — direct env usage + onboarding-critical flow + verbose console logging.
3. `src/services/staffInviteService.js` — invite/signup core logic with partial error swallowing and mixed field naming.
4. `src/services/complianceWizardV1Service.js` — uses non-centralized collection IDs and function URL hard dependency.
5. `src/services/driveSyncService.js` — mixed throw/fallback returns; schema preflight + demo bypass complexity.
6. `src/pages/portal/HR.jsx` — mixed collection fallbacks (`compliance_uploads` vs `documents`) with broad data surface.
7. `src/pages/portal/Dashboard.jsx` — promise catches convert failures into empty metrics.
8. `src/config/features.ts` — many modules disabled while routes remain mounted; readiness governance hotspot.
9. `src/pages/portal/Tasks.jsx` — apparent feature with disabled CRUD paths (commented integration).
10. `src/services/* 2.js` and `src/lib/* 2.js` duplicates — systemic drift/regression risk across core modules.

## 4. Phase 1 Remediation Order (Do Not Execute Yet)
1. **Auth/login/invite/reset flows**
   - Normalize invite/reset config access; remove direct env usage in page-level code.
   - Enforce explicit failure UI + toast + audit trail for invite send/validate/signup.
2. **Data integrity (collections/fields/env)**
   - Define canonical Appwrite config schema (all IDs required/optional).
   - Reconcile undocumented collections and field naming (snake/camel).
   - Add startup preflight and CI check against `.env.example` + schema docs.
3. **Routing + role access**
   - Align feature flags with route exposure and nav grouping.
   - Ensure disabled modules are clearly hidden or administratively gated.
4. **Scheduling core workflows**
   - Remove demo-only assumptions from scheduling/open-shifts/time modules.
   - Standardize collection access and error contracts.
5. **Compliance/HR modules**
   - Unify compliance collection IDs (`compliance_uploads`, submissions/templates/instances).
   - Remove fallback collection ambiguity in HR.
6. **UX polish**
   - Replace ad-hoc console logging with structured logger + user toasts.
   - Ensure WCAG-visible error banners + actionable retry paths for data failures.

## 5. Open Questions / Unknowns
- Which collections and exact IDs exist in the live Appwrite project (cannot verify from repo alone).
- Whether `audit_logs` or `auditLogs` is the canonical production collection ID for all modules.
- Whether `documentTemplates`, `complianceSubmissions`, and `documentInstances` are already provisioned in production.
- Whether `recurring_patterns` is an intentional fixed ID or a legacy hardcoded placeholder.
- Whether duplicate `* 2.js` files are intentionally used by tooling/build aliases (no evidence found in scanned imports).
- Whether Vercel environment variables currently include the missing collection IDs not present in `.env.production` file template.
