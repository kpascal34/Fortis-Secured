# Codex Control File

## Project Context
- This repository is a **Vite + React portal**.
- The portal is **deployed on Vercel**.
- The backend and auth/data integrations use **Appwrite**.

## Route Boundaries
- All target application routes for this portal must live under:
  - `/portal/*`
- Changes that introduce or modify navigable pages should preserve the `/portal/*` route namespace.

## Hard Engineering Rules
1. **No silent failures**
   - Do not swallow errors.
   - Every failure path must provide an explicit, observable outcome (UI feedback, logged error, and/or surfaced error state).

2. **Error Boundaries are required**
   - Add and use React Error Boundaries for portal sections/components where runtime UI failures may occur.
   - Error fallbacks must be user-visible and actionable.

3. **Toast notifications are required**
   - User-impacting success/failure states must trigger toast notifications.
   - Notifications should be clear, concise, and non-ambiguous.

4. **WCAG AA contrast is required**
   - UI changes must maintain at least WCAG AA color contrast compliance.
   - Do not merge visual changes that reduce accessibility contrast below AA.

5. **Menu grouping is required**
   - Navigation/menu updates must use clear grouping (logical sections) for discoverability.
   - New menu items must be placed in the correct group instead of appended arbitrarily.

## Required Fix Delivery Format
Every fix must include all of the following:
1. **Reproduction steps**
2. **Root cause**
3. **Code change**
4. **Validation steps**
5. **Commit message**

Any fix missing one or more of the five items above is incomplete.
