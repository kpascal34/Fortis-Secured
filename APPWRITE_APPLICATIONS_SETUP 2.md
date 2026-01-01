# Appwrite Setup: Applications Collection

This guide will help you create the Applications collection in Appwrite for the shift application workflow.

## Quick Setup Steps

### 1. Create Collection

1. Open your Appwrite Console
2. Navigate to **Databases** → Select your database
3. Click **Create Collection**
4. Set Collection ID: `applications` (or custom ID)
5. Set Collection Name: `Applications`

### 2. Add Attributes

Create the following attributes:

| Attribute Name | Type | Size | Required | Array | Default | Notes |
|---------------|------|------|----------|-------|---------|-------|
| `guardId` | String | 255 | ✅ | ❌ | - | Guard user ID |
| `guardName` | String | 255 | ✅ | ❌ | - | Guard display name |
| `shiftId` | String | 255 | ✅ | ❌ | - | Shift document ID |
| `shiftDetails` | String (JSON) | 16000 | ✅ | ❌ | `{}` | Cached shift info |
| `eligibilityScore` | String (JSON) | 16000 | ✅ | ❌ | `{}` | Eligibility assessment |
| `message` | String | 1000 | ❌ | ❌ | `""` | Guard's message |
| `status` | String | 50 | ✅ | ❌ | `pending` | Application status |
| `appliedAt` | DateTime | - | ✅ | ❌ | - | Application timestamp |
| `reviewedAt` | DateTime | - | ❌ | ❌ | - | Review timestamp |
| `reviewedBy` | String | 255 | ❌ | ❌ | - | Manager user ID |
| `reviewerName` | String | 255 | ❌ | ❌ | - | Manager name |
| `reviewNotes` | String | 2000 | ❌ | ❌ | `""` | Manager's notes |
| `rejectionReason` | String | 100 | ❌ | ❌ | - | Rejection code |
| `withdrawalReason` | String | 500 | ❌ | ❌ | - | Withdrawal reason |

### 3. Create Indexes

Add these indexes for performance:

| Index Key | Type | Attributes | Order |
|-----------|------|------------|-------|
| `guardId_idx` | Key | `guardId` | ASC |
| `shiftId_idx` | Key | `shiftId` | ASC |
| `status_idx` | Key | `status` | ASC |
| `appliedAt_idx` | Key | `appliedAt` | DESC |
| `guard_status_idx` | Key | `guardId`, `status` | ASC, ASC |

### 4. Set Permissions

Configure collection permissions:

**Document Security**: Enabled ✅

**Collection-Level Permissions:**
- **Read**: `role:users` (all authenticated users)
- **Create**: `role:users` (guards can submit applications)
- **Update**: `role:users` (managers can approve/reject, guards can withdraw)
- **Delete**: `role:admin` (admin only)

### 5. Update Environment Variables

Add to your `.env` file:

```env
VITE_APPWRITE_APPLICATIONS_COLLECTION_ID=applications
```

Replace `applications` with your custom collection ID if different.

## Attribute Details

### JSON Attributes

#### shiftDetails
Stores cached shift information:
```json
{
  "siteName": "Central Mall",
  "date": "2024-01-15",
  "startTime": "08:00",
  "endTime": "16:00",
  "hourlyRate": 15.50
}
```

#### eligibilityScore
Stores complete eligibility assessment:
```json
{
  "eligible": true,
  "score": 85,
  "maxScore": 100,
  "percentage": 85,
  "criteria": {
    "valid_license": {
      "score": 20,
      "passed": true,
      "weight": 20
    },
    "skills_match": {
      "score": 18,
      "passed": true,
      "weight": 20,
      "details": "9/10 skills matched"
    }
    // ... more criteria
  },
  "reasons": [],
  "recommendationLevel": "highly_recommended"
}
```

### Status Values

Valid status values:
- `pending` - Awaiting manager review
- `approved` - Application approved, guard assigned
- `rejected` - Application declined
- `withdrawn` - Guard withdrew application
- `expired` - Application expired (optional auto-cleanup)

### Rejection Reason Codes

Valid rejection reason codes:
- `insufficient_experience`
- `skills_mismatch`
- `reliability_concerns`
- `schedule_conflict`
- `license_expired`
- `missing_training`
- `better_candidate`
- `shift_filled`
- `other`

## Verification

Test your setup:

1. **Test Application Creation**
   ```javascript
   const app = await databases.createDocument(
     DATABASE_ID,
     'applications',
     ID.unique(),
     {
       guardId: 'test-guard-id',
       guardName: 'Test Guard',
       shiftId: 'test-shift-id',
       shiftDetails: JSON.stringify({
         siteName: 'Test Site',
         date: '2024-01-15',
         startTime: '08:00',
         endTime: '16:00',
         hourlyRate: 15.50
       }),
       eligibilityScore: JSON.stringify({
         eligible: true,
         score: 85,
         percentage: 85
       }),
       status: 'pending',
       appliedAt: new Date().toISOString()
     }
   );
   console.log('Test application created:', app.$id);
   ```

2. **Test Query by Guard**
   ```javascript
   const apps = await databases.listDocuments(
     DATABASE_ID,
     'applications',
     [Query.equal('guardId', 'test-guard-id')]
   );
   console.log('Guard applications:', apps.documents.length);
   ```

3. **Test Status Filter**
   ```javascript
   const pending = await databases.listDocuments(
     DATABASE_ID,
     'applications',
     [Query.equal('status', 'pending')]
   );
   console.log('Pending applications:', pending.documents.length);
   ```

## Common Issues

### "Attribute not found"
- Ensure all required attributes are created
- Check attribute names match exactly (case-sensitive)
- Wait a few seconds after creating attributes

### "Permission denied"
- Verify collection permissions include `role:users`
- Check user is authenticated
- Ensure document security is enabled

### "Invalid JSON"
- JSON attributes must be valid JSON strings
- Use `JSON.stringify()` when creating/updating
- Use `JSON.parse()` when reading

### Performance Issues
- Ensure indexes are created for frequently queried fields
- Use `Query.limit()` to limit result sets
- Add compound indexes for common query patterns

## Next Steps

After setting up the collection:

1. ✅ Verify environment variable is set
2. ✅ Test creating an application from the UI
3. ✅ Test manager approval workflow
4. ✅ Monitor Appwrite logs for any errors
5. ✅ Review SHIFT_APPLICATIONS_GUIDE.md for full documentation

## Support

If you encounter issues:

1. Check Appwrite Console logs
2. Verify all attributes and indexes exist
3. Test permissions with Appwrite's test console
4. Review browser console for client-side errors

For detailed usage documentation, see `SHIFT_APPLICATIONS_GUIDE.md`.
