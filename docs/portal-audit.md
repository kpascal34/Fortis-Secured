# Portal Audit (Repo-Inspected Baseline)

Last updated: 2026-02-26

## Method
- Reviewed router definitions for all `/portal` routes in `src/App.jsx`.
- Inspected each `src/pages/portal/*.jsx` page for Appwrite collection usage (`config.*CollectionId`), direct env usage, RBAC hooks, and fallback/mock/demo behavior.
- Reviewed shared Appwrite config and feature gating.
- Built app (`npm run build`) to detect compile-time breakage.

## Global findings
- Route-level access is enforced centrally through `FeatureRoute` (feature flag + coarse role gate).
- Several routes are feature-flagged off in `src/config/features.ts`; these render the `FeatureDisabled` screen rather than module UIs.
- Many pages have graceful fallback logging when Appwrite data is unavailable, but some modules still rely on mock data or no-op placeholders.
- Appwrite is optional at runtime (demo mode/fallback), so many modules are **partially working** without full env/collections.

## Route inventory (`/portal*`)

### Auth/compatibility route
| Route | Component | Depends on | Status | Notes |
|---|---|---|---|---|
| `/portal/password-reset/:token` | `ResetPassword` | Token in URL; auth/account flows | Partially | Routed outside `PortalLayout`; compatibility path for older templates. |

### Core routes
| Route | Feature + roles | Primary dependencies (collections/env/permissions) | Status |
|---|---|---|---|
| `/portal` | `DASHBOARD`; admin/staff/client | `clients`, `incidents`, `shifts`, `staff_profiles`, `tasks`; analytics helpers | Working |
| `/portal/profile` | `PROFILE`; admin/staff/client | RBAC hooks (`useCurrentUser`, `useRole`), profile validation, Appwrite account/profile | Working |

### Scheduling module
| Route | Feature + roles | Primary dependencies | Status |
|---|---|---|---|
| `/portal/scheduling` | `SCHEDULING`; admin/staff | `shifts`, `shift_assignments`, `clients`, `sites`, `guards`; scheduling utils + audit log | Working |
| `/portal/scheduling-drag-drop` | `SCHEDULING`; admin/staff | Drag/drop integration components; scheduling data via child components | Working |
| `/portal/scheduling-board` | `SCHEDULING`; admin/staff | `shifts`, `applications`, `clients`, `sites`; RBAC hooks | Partially |
| `/portal/scheduling/new` | `SCHEDULING`; admin/staff | `shifts`, `clients`, `sites`; RBAC hooks; explicit demo-mode error path | Partially |
| `/portal/recurring-patterns` | `RECURRING_PATTERNS`; admin/staff | `shifts`, `clients`, `sites`; recurring pattern library; modal | Partially |
| `/portal/my-schedule` | `MY_SCHEDULE`; admin/staff | `shifts`, `shift_assignments`, `sites`; schedule utils | Partially |
| `/portal/my-schedule-view` | `MY_SCHEDULE`; admin/staff | Drag/drop schedule components/services | Partially |
| `/portal/open-shifts` | `OPEN_SHIFTS`; admin/staff | `shifts`, `applications`, `sites`; shift application scoring helpers; mock eligibility data path | Partially |
| `/portal/shift-applications` | `SHIFT_APPLICATIONS`; admin/staff | `applications`, `shifts`; application helper lib | Partially |

### Compliance/HR module
| Route | Feature + roles | Primary dependencies | Status |
|---|---|---|---|
| `/portal/hr` | `COMPLIANCE`; admin/staff | `staff_profiles`, `staff_leave`, `staff_training`, `staff_licenses`, `compliance_uploads`; HR modals/tables | Working |
| `/portal/compliance` | `COMPLIANCE`; admin/staff | `compliance_wizard`; compliance/file-upload services; RBAC hooks | Working |
| `/portal/admin-grading` | `COMPLIANCE`; admin | `admin_grading`; grading service + modal; RBAC hooks | Working |
| `/portal/invite-management` | `COMPLIANCE`; admin | **Direct env** `VITE_APPWRITE_STAFF_INVITES_COLLECTION_ID`; staff invite service; RBAC hooks | Broken |
| `/portal/drive-sync` | `COMPLIANCE`; admin | `compliance_uploads`; drive sync service; RBAC hooks | Partially |
| `/portal/audit` | `AUDIT_LOG`; admin | audit helpers/service; Appwrite DB | Partially |

### Operations module
| Route | Feature + roles | Primary dependencies | Status |
|---|---|---|---|
| `/portal/clients` | `CRM`; admin/staff | `clients`; client form modal | Working |
| `/portal/clients/:id` | `CRM`; admin/staff | `clients`; client form modal | Working |
| `/portal/sites` | `SITES`; admin/staff | `sites`, `clients` | Working |
| `/portal/posts` | `POSTS`; admin/staff | `posts`, `clients`, `sites` | Partially |
| `/portal/guards` | `GUARDS`; admin/staff | `guards` | Working |
| `/portal/time` | `TIME_TRACKING`; admin/staff | `shift_assignments`, `shifts`, `guards`, `clients`, `sites`; fallback log if unavailable | Partially |
| `/portal/tasks` | `TASKS`; admin/staff | `tasks`, `clients`, `sites`, `guards`, `shifts` | Partially |
| `/portal/incidents` | `INCIDENTS`; admin/staff | `incidents`, `guards`, `shifts`, `clients`, `sites`; fallback log if unavailable | Partially |
| `/portal/assets` | `ASSETS`; admin/staff | `assets`, `guards`, `sites` | Partially |
| `/portal/messages` | `MESSAGES`; admin/staff | guard directory (`guards`) for recipient context | Partially |

### Admin/analytics module
| Route | Feature + roles | Primary dependencies | Status |
|---|---|---|---|
| `/portal/finance` | `FINANCE`; admin | `shifts`, `shift_assignments`, `clients`, `sites`, `guards`; validation utils | Partially |
| `/portal/ai` | `AI_ASSISTANT`; admin | In-page simulated AI only (no backend inference dependency) | Partially |
| `/portal/users` | `USER_MANAGEMENT`; admin | `guards` (used as user source), security utils (roles/permissions/MFA/import/export) | Partially |
| `/portal/payroll` | `PAYROLL`; admin | Validation/util logic; local computed data flows | Partially |
| `/portal/reports` | `REPORTS`; admin | Report builders + mock metric paths | Partially |
| `/portal/analytics` | `ANALYTICS`; admin | Analytics utility/service (page-level aggregation) | Partially |
| `/portal/client-portal` | `CRM`; client/admin | Client-facing dashboards/data summaries | Working |
| `/portal/settings` | `SETTINGS`; admin | Local settings state/forms (email/API/system tabs) | Partially |

## Status rubric used
- **Working**: Route is enabled in feature flags and has a coherent data flow with expected dependencies.
- **Partially**: Route compiles but is feature-disabled, demo/fallback-heavy, mock-backed, or operationally incomplete.
- **Broken**: Route has a hard runtime dependency likely to fail in common envs (e.g., required env var with no fallback).

## Key dependency map (cross-cutting)
- **Env vars / Appwrite bootstrap**
  - Required core: `VITE_APPWRITE_ENDPOINT`, `VITE_APPWRITE_PROJECT_ID`, `VITE_APPWRITE_DATABASE_ID`.
  - Collection IDs sourced through `config.*CollectionId` in `src/lib/appwrite.js`.
  - One route currently reads env directly (`InviteManagement`), bypassing config fallback.
- **Permission layers**
  - Layer 1: `FeatureRoute` gates by feature flag + basic role allowlist.
  - Layer 2 (page-level): selected modules use RBAC hooks (`useCurrentUser`, `useRole`) and service-level checks.
- **Appwrite schema pressure points**
  - High-traffic collections: `shifts`, `shift_assignments`, `clients`, `sites`, `guards`.
  - Compliance-specific: `compliance_wizard`, `admin_grading`, `compliance_uploads`, invite collection.

## 2026-03-02 Remediation Phase 1 Update
- Centralized runtime env access into `src/lib/env.js` and normalized portal config in `src/lib/config.js`.
- Production now forces demo mode off and shows a fatal configuration UI when required Appwrite IDs are missing.
- Compliance Wizard v1 is now hard-disabled by default behind `VITE_ENABLE_COMPLIANCE_V1` until required collections are provisioned.
- Duplicate `* 2.*` source files removed; repo-level verification scripts added for env coverage, forbidden `process.env` in `src/`, duplicate-file drift, and schema checks.
