# Shift Application Workflow - Quick Start

## What's New? 🎯

Your Fortis-Secured portal now includes a professional **Shift Application Workflow** system where:

- **Guards** apply for shifts instead of instant-claiming them
- **Managers** review applications with detailed eligibility scoring
- **Automatic matching** shows compatibility (0-100%)
- **Smart assignment** ensures best candidate gets the shift

## Files Created

| File | Purpose | Size |
|------|---------|------|
| `src/lib/shiftApplications.js` | Application logic & scoring | 14 KB |
| `src/pages/portal/ShiftApplications.jsx` | Manager dashboard | 28 KB |
| `src/lib/recurringShiftPatterns.js` | Recurring shift patterns | 17 KB |
| `src/pages/portal/RecurringPatterns.jsx` | Patterns management UI | 20 KB |
| `src/components/RecurringPatternModal.jsx` | Pattern creation modal | 24 KB |

## Documentation

| Guide | For | Length |
|-------|-----|--------|
| [SHIFT_APPLICATIONS_GUIDE.md](./SHIFT_APPLICATIONS_GUIDE.md) | Users & Managers | 14 KB |
| [APPWRITE_APPLICATIONS_SETUP.md](./APPWRITE_APPLICATIONS_SETUP.md) | Setup Instructions | 6 KB |
| [SHIFT_APPLICATIONS_IMPLEMENTATION.md](./SHIFT_APPLICATIONS_IMPLEMENTATION.md) | Technical Overview | 10 KB |
| [SHIFT_APPLICATIONS_DEPLOYMENT_CHECKLIST.md](./SHIFT_APPLICATIONS_DEPLOYMENT_CHECKLIST.md) | Deployment Tasks | 9 KB |
| [RECURRING_PATTERNS_GUIDE.md](./RECURRING_PATTERNS_GUIDE.md) | Pattern Usage | 9 KB |

## Quick Setup (5 minutes)

### 1. Create Appwrite Collection
Follow [APPWRITE_APPLICATIONS_SETUP.md](./APPWRITE_APPLICATIONS_SETUP.md):
- Create `applications` collection
- Add all required attributes
- Create indexes
- Set permissions

### 2. Add Environment Variable
```env
VITE_APPWRITE_APPLICATIONS_COLLECTION_ID=applications
```

### 3. Deploy
```bash
npm run build    # ✅ Already tested
git push         # Deploy to production
```

## How It Works

### Guard Experience 👤
```
1. Open Shifts → View availability with match %
2. Apply → Submit application with eligibility assessment
3. Track → See "Pending", "Approved", or "Rejected"
```

### Manager Experience 👔
```
1. Dashboard → See all applications + statistics
2. Review → View eligibility breakdown + criteria
3. Approve/Reject → One-click with notes
```

## Eligibility Scoring (0-100)

The system scores guards on 7 criteria:

| Criterion | Points | Mandatory |
|-----------|--------|-----------|
| SIA License | 20 | ✅ Yes |
| Skills Match | 20 | ❌ No |
| Experience | 15 | ❌ No |
| Reliability | 15 | ❌ No |
| Site Familiarity | 10 | ❌ No |
| Availability | 10 | ✅ Yes |
| Training | 10 | ❌ No |

**Scoring Levels:**
- 🟢 85-100: Highly Recommended
- 🔵 70-84: Recommended
- 🟡 50-69: Acceptable
- 🔴 0-49: Not Recommended

## Key Features

✅ **Automatic Eligibility Scoring** - 7-criteria assessment  
✅ **Application Status Tracking** - pending → approved/rejected  
✅ **Manager Dashboard** - Filter, sort, approve/reject  
✅ **Batch Processing** - Auto-reject competing applications  
✅ **Detailed Breakdown** - See why you match (or don't)  
✅ **Approval Notes** - Managers can leave feedback  
✅ **Statistics** - Track approval rates & average scores  

## Navigation Changes

Two new pages added to portal:

### For Guards
- **Open Shifts** (Updated)
  - Apply for shifts instead of claiming
  - Track "My Applications"
  - View eligibility breakdown

### For Managers
- **Shift Applications** (New!)
  - Review all pending applications
  - Approve/reject with detailed assessment
  - Track statistics

## Database Schema

Required `applications` collection:
- `guardId`, `guardName` - Who's applying
- `shiftId`, `shiftDetails` - Which shift
- `status` - pending/approved/rejected/withdrawn
- `eligibilityScore` - Full assessment data
- `appliedAt`, `reviewedAt` - Timestamps
- `reviewNotes`, `rejectionReason` - Manager feedback

See [APPWRITE_APPLICATIONS_SETUP.md](./APPWRITE_APPLICATIONS_SETUP.md) for full schema.

## Changes to Existing Code

### OpenShifts.jsx (Updated)
- `handleApplyForShift()` - Instead of instant-claim
- `fetchApplications()` - Load user's applications
- `getShiftApplicationStatus()` - Check application state
- New "My Applications" filter
- Application status badges

### App.jsx (Updated)
- Added `/portal/shift-applications` route
- Lazy-load ShiftApplications component

### PortalNav.jsx (Updated)
- Added "Shift Applications" navigation link
- Uses new AiOutlineFileDone icon

### appwrite.js (Updated)
- Added `applicationsCollectionId` export
- Exported database/collection constants

### .env.example (Updated)
- Added `VITE_APPWRITE_APPLICATIONS_COLLECTION_ID`

## Deployment Checklist

- [x] Code implemented and tested
- [x] Build successful (63 precache entries)
- [x] Documentation complete
- [ ] Appwrite collection created
- [ ] Environment variable set
- [ ] Deploy to production
- [ ] Verify in live portal

**Next Step:** Create the Appwrite Applications collection (see [APPWRITE_APPLICATIONS_SETUP.md](./APPWRITE_APPLICATIONS_SETUP.md))

## Troubleshooting

**Applications not showing?**
1. Check Applications collection exists in Appwrite
2. Verify collection ID in `.env`
3. Check browser console for errors

**Eligibility shows 0%?**
1. Guard profile needs required fields:
   - `siaLicenseExpiry`
   - `yearsExperience`
   - `skills` (array)
   - `completedTraining` (array)
2. Shifts need required fields:
   - `siteName`, `date`, `startTime`, `endTime`
   - `requiredSkills`, `requiredExperience`, `requiredTraining` (optional)

**Manager can't approve?**
1. Check manager has Update permission on Applications collection
2. Verify shift hasn't already been filled
3. Check Appwrite logs for specific error

## Support

- **User Guide**: [SHIFT_APPLICATIONS_GUIDE.md](./SHIFT_APPLICATIONS_GUIDE.md)
- **Setup Help**: [APPWRITE_APPLICATIONS_SETUP.md](./APPWRITE_APPLICATIONS_SETUP.md)
- **Tech Details**: [SHIFT_APPLICATIONS_IMPLEMENTATION.md](./SHIFT_APPLICATIONS_IMPLEMENTATION.md)
- **Code**: `src/lib/shiftApplications.js`, `src/pages/portal/ShiftApplications.jsx`

## Bonus: Recurring Shift Patterns 🔄

While you're here, we also added **Recurring Shift Patterns**:
- Create weekly, biweekly, or monthly patterns
- Auto-generate shifts from templates
- Manage patterns on `/portal/recurring-patterns`

See [RECURRING_PATTERNS_GUIDE.md](./RECURRING_PATTERNS_GUIDE.md) for details.

---

**Status**: ✅ Ready for deployment!

Questions? Check the comprehensive guides above or review the source code in `src/lib/shiftApplications.js` and `src/pages/portal/ShiftApplications.jsx`.
