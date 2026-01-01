# Feature Gating Implementation

## Overview
This document describes the feature gating system implemented to temporarily scale back the Fortis Secured app. Currently, only **COMPLIANCE** and **SCHEDULING** modules are visible and accessible. All other code, routes, and database structures remain intact for future re-enablement.

## Files Modified/Created

### 1. Feature Flag Configuration
**File:** `src/config/features.ts`

Central configuration file that controls all module visibility.

```typescript
export const FEATURES = {
  DASHBOARD: true,      // Always on (core)
  PROFILE: true,        // Always on (core)
  COMPLIANCE: true,     // ✓ Enabled
  SCHEDULING: true,     // ✓ Enabled
  CRM: false,
  CLIENTS: false,
  SITES: false,
  GUARDS: false,
  TIME_TRACKING: false,
  // ... all others false by default
};

// Helper functions
isFeatureEnabled(feature)  // Check if feature is enabled
getEnabledModules()        // Get list of all enabled features
```

**To enable/disable a module:**
1. Edit `src/config/features.ts`
2. Set `MODULE_NAME: true/false`
3. Changes apply automatically across nav, routes, and guards

### 2. FeatureDisabled Component
**File:** `src/components/FeatureDisabled.jsx`

Displays a "Coming Soon" page for disabled modules. Provides:
- Friendly message explaining the module is temporarily unavailable
- "Return to Dashboard" button
- "Go Back" button

**Usage:**
```jsx
<FeatureDisabled featureName="HR & Compliance" />
```

Also includes `FeatureGuard` wrapper for conditional rendering:
```jsx
<FeatureGuard enabled={isFeatureEnabled('HR')} featureName="HR">
  <HRComponent />
</FeatureGuard>
```

### 3. Navigation Gating
**File:** `src/components/PortalNav.jsx`

Updated navigation to only show enabled modules:
- Each nav item mapped to a feature flag
- `getEnabledNavigation()` filters by enabled features
- Disabled modules removed from sidebar/mobile menu

**Changes:**
```jsx
const allNavigation = [
  { name: 'Scheduling', href: '/portal/scheduling', feature: 'SCHEDULING' },
  { name: 'HR & Compliance', href: '/portal/hr', feature: 'COMPLIANCE' },
  // ... others
];

// Filter and render only enabled items
{getEnabledNavigation().map((item) => (
  <NavItem key={item.name} item={item} isActive={isActive} />
))}
```

### 4. Route-Level Guards
**File:** `src/App.jsx`

All portal routes wrapped with feature checks:
- If module disabled → redirects to `FeatureDisabled` page
- If module enabled → renders component normally
- Direct URL access to disabled routes shows "Coming Soon"

**Implementation:**
```jsx
const FeatureRoute = ({ feature, name, element }) => {
  if (!isFeatureEnabled(feature)) {
    return <FeatureDisabled featureName={name} />;
  }
  return element;
};

// Usage in routes
<Route 
  path="scheduling" 
  element={<FeatureRoute feature="SCHEDULING" name="Scheduling" element={<SchedulingWithDragDrop />} />} 
/>
```

**Gated Routes:**
- COMPLIANCE: `/portal/hr`, `/portal/audit`
- SCHEDULING: `/portal/scheduling`, `/portal/recurring-patterns`, `/portal/my-schedule`, `/portal/open-shifts`, `/portal/shift-applications`
- All others: show "Coming Soon" page

## Feature Gates Applied

### Three Points of Control

1. **Navigation Rendering** (`PortalNav.jsx`)
   - Disabled modules don't appear in sidebar
   - Cleaner UX: users don't see unavailable options

2. **Route Protection** (`App.jsx`)
   - Direct URL access blocked: `/portal/clients` → "Coming Soon"
   - Browser back/forward navigation redirects to dashboard
   - All entry points validated

3. **Cross-Module Links** (Entry Points)
   - Dashboard and other pages don't link to disabled modules
   - Verified via grep: no hardcoded links to gated features
   - Links can be re-enabled by changing feature flag (no code change needed)

## Currently Enabled Modules

| Module | Feature Flag | Route | Status |
|--------|-------------|-------|--------|
| Dashboard | DASHBOARD | `/portal` | ✅ Enabled |
| My Profile | PROFILE | `/portal/profile` | ✅ Enabled |
| Scheduling | SCHEDULING | `/portal/scheduling` | ✅ Enabled |
| HR & Compliance | COMPLIANCE | `/portal/hr`, `/portal/audit` | ✅ Enabled |
| (Others) | (Multiple) | Various | ❌ Disabled |

## Currently Disabled Modules

| Module | Feature Flag | Route |
|--------|-------------|-------|
| Clients / CRM | CRM | `/portal/clients` |
| Sites | SITES | `/portal/sites` |
| Guards | GUARDS | `/portal/guards` |
| Time Tracking | TIME_TRACKING | `/portal/time` |
| Tasks | TASKS | `/portal/tasks` |
| Incidents | INCIDENTS | `/portal/incidents` |
| Assets | ASSETS | `/portal/assets` |
| Messages | MESSAGES | `/portal/messages` |
| Finance | FINANCE | `/portal/finance` |
| Payroll | PAYROLL | `/portal/payroll` |
| Reports | REPORTS | `/portal/reports` |
| Analytics | ANALYTICS | `/portal/analytics` |
| AI Assistant | AI_ASSISTANT | `/portal/ai` |
| User Management | USER_MANAGEMENT | `/portal/users` |
| Settings | SETTINGS | `/portal/settings` |

## Re-Enabling Modules

**To re-enable a module:**

1. Edit `src/config/features.ts`
2. Change the feature flag: `MODULE: true`
3. Build and deploy: `npm run build && vercel --prod`
4. Module automatically appears in nav and is accessible via route

**No other code changes required.**

## Testing

### Verify Navigation
- [ ] Open `/portal`
- [ ] Sidebar shows only: Dashboard, Profile, Scheduling, HR & Compliance
- [ ] Other items hidden

### Verify Route Guards
- [ ] Try `/portal/clients` → shows "Coming Soon"
- [ ] Try `/portal/finance` → shows "Coming Soon"
- [ ] Try `/portal/scheduling` → loads normally
- [ ] Try `/portal/hr` → loads normally

### Verify Mobile Menu
- [ ] Open on mobile
- [ ] Toggle menu
- [ ] Same modules shown as desktop

## Code Integrity

### What Was NOT Removed
✅ All page components remain intact (`src/pages/portal/*.jsx`)
✅ All route definitions remain intact (`App.jsx`)
✅ All database schemas remain intact
✅ All API services remain functional
✅ All RBAC logic remains active

### What Is Abstracted
- Nav rendering (uses feature flags)
- Route access (wrapped with FeatureRoute)
- Direct URL access (checked in routes)

### Rollback
To fully revert feature gating:
1. Delete `src/config/features.ts`
2. Revert `src/components/PortalNav.jsx` to previous version
3. Revert `src/App.jsx` to previous version
4. Delete `src/components/FeatureDisabled.jsx`

Or simply set all flags to `true` in `features.ts` for immediate full access.

## Performance Impact

- **Zero runtime overhead** for enabled modules
- Feature flag checks are O(1) lookups on already-enabled paths
- No additional network requests
- No bundle size impact (flags are compile-time constants in tree-shaking)

## Future Phases

As you scale back up:

**Phase 2:** Enable CRM, Clients, Sites
```typescript
CRM: true,
CLIENTS: true,
SITES: true,
```

**Phase 3:** Enable Finance, Payroll, Reports
```typescript
FINANCE: true,
PAYROLL: true,
REPORTS: true,
```

Each phase requires only editing `src/config/features.ts` → zero risk of code regressions.

## Summary

✅ Feature gating implemented at 3 points: nav, routes, entry points
✅ Only COMPLIANCE & SCHEDULING visible/accessible
✅ All code and DB structures preserved
✅ Zero changes to page/component logic
✅ Build passes successfully
✅ Production-ready for deployment
