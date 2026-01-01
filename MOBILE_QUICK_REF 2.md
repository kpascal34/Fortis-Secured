# Mobile Responsiveness Quick Reference

**Deploy Status:** ✅ Live in Production  
**Date:** Dec 22, 2025

---

## What Changed

### Navigation
- **Mobile:** Hamburger menu (top header)
- **Desktop:** Fixed sidebar (unchanged)

### Time Tracking Table
- **Mobile:** Horizontal scroll, abbreviated headers
- **Desktop:** All columns visible

### Clock-In Buttons
- **Mobile:** "In" / "Out" labels
- **Desktop:** "Clock In" / "Clock Out" labels

---

## Test on Your Phone

1. Visit production URL: https://fortis-secured-n9r3igbrh-kingsleypascal1-gmailcoms-projects.vercel.app
2. Go to Portal → Time Tracking
3. Verify:
   - ✓ Hamburger menu visible on top
   - ✓ Table scrolls sideways
   - ✓ Clock buttons fit screen
   - ✓ Photo upload area visible
   - ✓ No horizontal page scroll

---

## Responsive Breakpoints

```
Mobile (default)    <640px   | iPhone, small Android
─────────────────────────────
Tablet (sm:)       ≥640px    | iPad portrait
─────────────────────────────
Desktop (lg:)      ≥1024px   | Laptops, desktops
```

---

## Key CSS Patterns

```jsx
// Hamburger on mobile, hidden on desktop
className="lg:hidden"

// Sidebar visible on desktop, hidden on mobile
className="hidden lg:block"

// Stack on mobile, row on desktop
className="flex flex-col lg:flex-row"

// Single column on mobile, 2 on desktop
className="grid grid-cols-1 md:grid-cols-2"

// Responsive text size
className="text-xs sm:text-sm md:text-base"

// Responsive padding
className="p-2 sm:p-4 lg:p-6"
```

---

## Files to Know

| File | Change |
|------|--------|
| `src/layouts/PortalLayout.jsx` | Flex direction responsive |
| `src/components/PortalNav.jsx` | Hamburger menu + drawer |
| `src/pages/portal/TimeTracking.jsx` | Responsive table + buttons |

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Table doesn't scroll on mobile | Check `overflow-x-auto` wrapper |
| Button text overflows | Use abbreviated labels with `sm:hidden` / `hidden sm:inline` |
| Sidebar takes full width | Ensure `flex-col lg:flex-row` in parent |
| Modal too large on phone | Add `max-h-[90vh] overflow-y-auto` |
| Icons too big on mobile | Use `h-3 w-3` instead of `h-4 w-4` |

---

## Responsive Development Checklist

- [ ] Hamburger menu visible on mobile
- [ ] All inputs full-width on mobile
- [ ] Buttons are 44px+ height/width (touch-friendly)
- [ ] Text minimum 12px on mobile
- [ ] No horizontal page scroll
- [ ] Tables scrollable, not squeezed
- [ ] Images responsive
- [ ] Form labels visible on mobile
- [ ] No fixed positioning except nav

---

## Browser Compatibility

✅ iOS Safari 14+  
✅ Chrome Mobile 90+  
✅ Firefox Mobile 88+  
✅ Samsung Internet 14+

---

## Deploy Notes

**Last Build:** Production v1 (Dec 22, 2025)  
**Size:** 28.77 kB (TimeTracking bundle)  
**Build Time:** 4.13s  

To redeploy after changes:
```bash
npm run build:prod && vercel --prod --yes
```

---

## Next Steps

1. Test on real mobile devices
2. Gather feedback from mobile users
3. Consider landscape mode support
4. Add bottom sheet modals for mobile
5. Implement mobile-specific gestures (swipe, long-press)

---

**Questions?** See `MOBILE_RESPONSIVENESS_GUIDE.md` for detailed documentation.
