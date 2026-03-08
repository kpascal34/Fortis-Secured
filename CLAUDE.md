# CLAUDE.md — Fortis Secured

AI assistant reference guide for the Fortis Secured codebase. Read this before making any changes.

---

## Project Overview

**Fortis Secured** is an enterprise-grade workforce management platform for a physical security company. It combines a public marketing site with a feature-rich staff/operations portal covering scheduling, compliance, payroll, finance, HR, and analytics.

**Tech stack:**
- **Frontend:** React 18 + Vite 6 + Tailwind CSS 3 (PWA-enabled)
- **Backend:** Appwrite (BaaS) — document database, auth, storage, serverless functions
- **Serverless API:** Vercel Functions (`/api/`)
- **Email:** Nodemailer + AWS SES
- **Integrations:** Google Drive (compliance doc sync), Appwrite Functions (PDF generation)
- **Deployment:** Vercel (primary), Netlify (secondary)

---

## Repository Structure

```
/
├── src/
│   ├── App.jsx                  # Root router — all route definitions live here
│   ├── main.jsx                 # React DOM entry point
│   ├── components/              # Reusable UI components (30+ files)
│   ├── pages/
│   │   ├── portal/              # 48 authenticated portal pages
│   │   └── services/            # Public service detail pages
│   ├── services/                # Business logic service layer (29 files)
│   ├── lib/                     # Utilities, RBAC, Appwrite client, validation (41 files)
│   ├── context/                 # React contexts (AuthContext)
│   ├── config/                  # Feature flags, navigation config
│   ├── layouts/                 # Layout wrappers (PortalLayout, etc.)
│   ├── hooks/                   # Custom React hooks
│   ├── theme/                   # Design tokens
│   ├── styles/                  # Global CSS
│   ├── server/                  # Server-side security utilities
│   ├── sections/                # Marketing homepage sections
│   ├── compliance/              # Compliance feature modules
│   └── emails/                  # Email templates
├── api/                         # Vercel serverless functions
│   ├── notify.js                # Email dispatcher (POST)
│   ├── drive-sync.js            # Google Drive integration
│   ├── send-invite-email.js     # Staff invite emails
│   ├── log-error.js             # Client error telemetry
│   └── invite-validate.js       # Invite code validation
├── scripts/                     # 40+ Node.js operational automation scripts
│   ├── schema/collections.js    # Appwrite collection definitions
│   └── lib/                     # Script-shared utilities
├── appwrite/
│   └── functions/generateCompliancePdfAndUpload/  # PDF generation function
├── public/                      # Static assets, icons, manifests
├── docs/                        # Additional documentation
├── vite.config.js
├── tailwind.config.js
├── vercel.json
├── appwrite.config.json         # Project ID: 68fbe225003cf4576a12
└── .env.example                 # All environment variables documented here
```

---

## Development Workflow

### Setup

```bash
npm install
cp .env.example .env.local       # Fill in required vars (see below)
npm run dev                       # Vite dev server
```

### Key Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start local dev server |
| `npm run build` | Production build |
| `npm run build:prod` | Clean + build |
| `npm run preview` | Preview production build |
| `npm run schema:provision` | Create/update Appwrite collections (idempotent) |
| `npm run schema:verify` | Validate schema against expected state |
| `npm run smoke:tenancy` | Tenancy/RBAC smoke tests |
| `npm run smoke:gold-paths` | Integration workflow tests |
| `npm run data:check` | Data integrity checks |
| `npm run verify:production` | Pre-deploy release gate (runs all checks) |

### Operational Engine Scripts

These run as scheduled jobs or on-demand. Do not run them against production without understanding their write paths:

```bash
npm run margin:monitor       # Margin anomaly detection
npm run forecast:run         # Demand forecasting
npm run compliance:scan      # Compliance expiry scanning
npm run risk:evaluate        # Enterprise risk scoring
npm run cashflow:run         # Cash flow projections
npm run contract:health      # Contract risk scoring
npm run leakage:scan         # Margin leakage detection
npm run resilience:run       # Resilience scoring
npm run profit:snapshot      # Financial snapshots
```

---

## Environment Variables

All variables are documented in `.env.example`. Key categories:

### Required (client-side, prefixed `VITE_`)
```
VITE_APPWRITE_ENDPOINT          # Appwrite API URL
VITE_APPWRITE_PROJECT_ID        # Project: 68fbe225003cf4576a12
VITE_APPWRITE_DATABASE_ID       # Database: fortis_prod_v2
VITE_APPWRITE_*_COLLECTION_ID   # One per collection (~35+ vars)
```

### Feature Flags
```
VITE_ENABLE_DEMO_MODE           # Demo data mode
VITE_ENABLE_COMPLIANCE_V1       # Legacy compliance system
VITE_FINANCE_INTEGRATION_ENABLED
```

### Server-side only (Vercel functions / scripts)
```
APPWRITE_API_KEY                # Server SDK key (never expose client-side)
NOTIFY_SECRET                   # Protects /api/notify endpoint
SMTP_HOST / SMTP_USER / SMTP_PASS
FIELD_ENCRYPTION_KEY
```

**Rule:** Never use `APPWRITE_API_KEY` or `NOTIFY_SECRET` in `src/` — those are server-only.

---

## RBAC & Permissions

Defined in `src/lib/rbac.ts`. **Always use this module for permission checks.**

### Roles (hierarchy order)
1. `admin` — full access to everything
2. `entity_admin` — multi-tenant admin, most permissions except `DEBUG_ADMIN`
3. `manager` — operational management, no finance/payroll/user-management write
4. `client` — customer portal view only
5. `staff` — own schedule, compliance submission, time tracking

### Usage patterns

```tsx
// Component-level guard
import RequirePermission from './components/auth/RequirePermission.tsx';

<RequirePermission permission="manageShifts">
  <ShiftCreateButton />
</RequirePermission>

// Programmatic check
import { can, PERMISSIONS } from './lib/rbac.ts';
if (can(PERMISSIONS.VIEW_FINANCE, userContext)) { ... }

// Throw on failure
import { assertPermission } from './lib/rbac.ts';
assertPermission(user, 'manageCompliance', 'Finance access required');
```

### Role resolution order
`resolveUserRole()` in `rbac.ts` checks in this order:
1. Appwrite team memberships (roles array)
2. `user.role` / `user.prefs.role`
3. `user.labels` array
4. Email domain fallback (`@fortissecured.*` → staff)
5. Default: `client`

---

## Multi-Tenancy

**Every database query must be scoped to the correct entity/legal entity.**

Core module: `src/lib/tenancyScope.js`

- All service functions accept a `legalEntityId` or derive it from the authenticated user's context.
- Do not query collections without applying the tenancy filter — this is a security boundary.
- `phase8OpsService.js` handles entity isolation for multi-tenant operations.

---

## Service Layer

Business logic lives in `src/services/`. UI components should not query Appwrite directly — always go through a service.

Key services:
| File | Responsibility |
|------|----------------|
| `timesheetService.js` | Timesheet lifecycle, approval workflow |
| `schedulingService.js` | Shift creation, assignment, conflicts |
| `complianceService.js` | Document tracking, expiry management |
| `complianceEngineService.js` | Automated compliance scanning & flagging |
| `reportingService.js` | KPI dashboards, financial analytics |
| `forecastService.js` | Demand prediction, financial forecasting |
| `marginAlertService.js` | Anomaly detection, margin monitoring |
| `contractIntelligenceService.js` | Contract health scoring |
| `notificationService.js` | Email outbox queuing |
| `payrollExportService.js` | Timesheet → payroll export |
| `driveSyncService.js` | Google Drive document sync |
| `incidentService.js` | Incident logging & lifecycle |

---

## Appwrite Data Model

### Connection (client-side)
```js
// src/lib/appwrite.js exports:
import { databases, storage, account, functions } from './lib/appwrite.js';
```

### Key Collections
Core operations:
- `shifts`, `shift_assignments`, `recurring_patterns`, `applications`
- `timesheets`, `timesheet_entries`, `payroll_exports`, `billing_exports`, `rate_cards`
- `staff_profiles`, `manager_profiles`, `staff_invites`
- `clients`, `sites`, `guards`, `incidents`, `assets`

Compliance:
- `staff_compliance`, `compliance_uploads`, `compliance_rules`, `compliance_flags`

Financial / Analytics:
- `contracts`, `margin_alerts`, `forecast_models`, `forecast_snapshots`
- `profit_snapshots`, `contract_health_snapshots`, `cashflow_snapshots`
- `enterprise_risk_scores`, `resilience_snapshots`, `legal_entities`
- `concentration_alerts`, `margin_leakage_alerts`, `employment_risk_flags`
- `tender_models`, `tender_win_models`, `strategic_forecasts`

HR:
- `staff_leave`, `staff_training`, `staff_licenses`, `staff_grades`, `departments`

System:
- `notification_outbox`, `audit_logs`, `security_events`

### Schema Management
Collection definitions live in `scripts/schema/collections.js`. Run provisioning after any schema changes:
```bash
npm run schema:provision   # Creates missing collections/attributes/indexes
npm run schema:verify      # Validates current state
```

---

## Routing

All routes defined in `src/App.jsx`.

- Public site: `/`, `/services/*`, `/about`, `/contact`, `/join-the-team`, etc.
- Portal: `/portal/*` — wrapped in `<PortalLayout>` with `<AuthProvider>`
- All portal pages use `React.lazy()` for code-splitting
- Route guards: `<RequirePermission>` component wraps protected routes
- Error boundary: `<ErrorBoundary>` wraps portal routes

### Adding a new portal page
1. Create `src/pages/portal/MyPage.jsx`
2. Add lazy import in `App.jsx`
3. Add `<Route>` inside the portal `<Routes>` block with appropriate `<RequirePermission>`
4. Add navigation entry in `src/config/navigation.js` (if nav-visible)

---

## Styling Conventions

- **Utility-first** with Tailwind CSS 3
- **Design tokens** in `src/theme/tokens.js` — use CSS variables, not hardcoded colors
- **CSS variables:** `--bg`, `--surface`, `--text`, `--brand`, `--accent`
- **Dark theme by default** — the portal uses a dark glassmorphism aesthetic
- **Typography:** Manrope font family
- **Animations:** Framer Motion for complex transitions; Tailwind keyframes for simple ones
- **Class merging:** Use `clsx` for conditional class names

Example class patterns:
```jsx
// Glass card
className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6"

// Primary button
className="rounded-xl bg-accent px-6 py-3 text-white font-semibold hover:bg-accent/90 transition-colors"
```

---

## Security Practices

### Must-follow rules
1. **Never query Appwrite without tenancy scope** — use `tenancyScope.js` helpers
2. **Never expose server-side secrets in `src/`** — `APPWRITE_API_KEY` is server-only
3. **Always check permissions before rendering sensitive UI** — use `<RequirePermission>` or `can()`
4. **Validate and sanitize all user input** — utilities in `src/lib/validation.js` and `src/lib/securityUtils.js`
5. **Log sensitive operations to `audit_logs`** — especially writes, deletes, exports
6. **API endpoints validate `NOTIFY_SECRET`** before processing

### Input validation
```js
import { validateInput, sanitizeText } from './lib/validation.js';
```

### Audit logging
```js
// Write an audit record for any sensitive operation
import { logAuditEvent } from './services/auditService.js';
await logAuditEvent({ action: 'DELETE_STAFF', userId, resourceId, details });
```

---

## Serverless API Functions (`/api/`)

| File | Route | Purpose |
|------|-------|---------|
| `notify.js` | `POST /api/notify` | Processes `notification_outbox`, sends emails via SMTP |
| `drive-sync.js` | `/api/drive-sync` | Syncs docs to Google Drive |
| `send-invite-email.js` | `/api/send-invite-email` | Sends staff invitation emails |
| `log-error.js` | `/api/log-error` | Receives client-side error telemetry |
| `invite-validate.js` | `/api/invite-validate` | Validates invite codes |

- `/api/notify` requires the `NOTIFY_SECRET` header — it processes at most 20 outbox records per call.
- All API functions use `node-appwrite` (server SDK), not the browser SDK.

---

## Testing

There is no Jest/Vitest unit test suite. Testing is done via:

| Script | What it tests |
|--------|---------------|
| `npm run smoke:tenancy` | Multi-tenancy isolation, RBAC enforcement |
| `npm run smoke:gold-paths` | Key end-to-end user workflows |
| `npm run data:check` | Data integrity (orphans, invalid refs) |
| `npm run schema:verify` | Appwrite schema matches expected definitions |
| `npm run verify:production` | Full release gate (runs all checks above) |

**Accessibility** is tested via Pa11y CI (`pa11y-ci`) and `@axe-core/cli` (dev dependencies).

Run before any PR:
```bash
npm run verify:production
```

---

## Build & Deployment

### Vite Build Config (`vite.config.js`)
- Code splitting: `react-vendor`, `appwrite-vendor`, `ui-vendor` chunks
- PWA plugin with auto-update and asset caching strategies
- CSS code splitting enabled
- Sourcemaps in dev only
- Minification via Terser in production

### Vercel (primary deployment)
- `vercel.json` configures SPA rewrites, security headers, cache policies
- Immutable asset caching (1 year) for hashed filenames
- HTML files cached for 1 hour

### Netlify (secondary)
- `netlify.toml` mirrors Vercel config

### Self-hosted
- `nginx.conf` provided for reverse proxy setup

---

## Common Patterns & Gotchas

### Appwrite Queries
```js
import { databases } from '../lib/appwrite.js';
import { Query } from 'appwrite';

// Always scope by legalEntityId
const docs = await databases.listDocuments(DB_ID, COLLECTION_ID, [
  Query.equal('legalEntityId', legalEntityId),
  Query.equal('status', 'active'),
  Query.orderDesc('$createdAt'),
  Query.limit(100),
]);
```

### Feature Flags
```js
import { isFeatureEnabled } from './config/features.ts';

if (isFeatureEnabled('COMPLIANCE_V1')) { ... }
```

### AuthContext
```jsx
import { useAuth } from '../context/AuthContext.jsx';

const { user, userRole, permissions, loading } = useAuth();
```

### Notification Outbox Pattern
Don't send emails directly from the frontend. Write to `notification_outbox` and let `/api/notify` process it:
```js
import { notificationService } from '../services/notificationService.js';
await notificationService.queue({ type: 'INVITE', to: email, data: { ... } });
```

### Timesheet Status Flow
```
open → submitted → approved → locked
```
Only `admin` / `entity_admin` can lock timesheets. Locked timesheets cannot be edited.

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase `.jsx` | `GuardAssignmentModal.jsx` |
| Services | camelCase `Service.js` | `timesheetService.js` |
| Utilities / libraries | camelCase `.js` | `tenancyScope.js` |
| TypeScript modules | camelCase `.ts` / `.tsx` | `rbac.ts`, `RequirePermission.tsx` |
| Scripts | kebab-case `.mjs` | `data-integrity-check.mjs` |
| Environment vars | `VITE_` prefix for client, bare for server | `VITE_APPWRITE_PROJECT_ID` |

---

## Key Files Quick Reference

| File | What to know |
|------|-------------|
| `src/lib/rbac.ts` | All roles and permissions — modify here to change access control |
| `src/lib/tenancyScope.js` | Multi-tenancy isolation — required for every DB query |
| `src/lib/appwrite.js` | Pre-configured Appwrite client SDK exports |
| `src/lib/config.js` | Environment validation — fatal config errors surface here |
| `src/lib/env.js` | Safe environment variable accessor |
| `src/context/AuthContext.jsx` | User auth state, role, permissions — use `useAuth()` hook |
| `src/config/features.ts` | Feature flag definitions and `isFeatureEnabled()` |
| `src/App.jsx` | All route definitions |
| `scripts/schema/collections.js` | Appwrite database schema source of truth |
| `.env.example` | Complete environment variable reference |
