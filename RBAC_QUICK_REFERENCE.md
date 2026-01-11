# RBAC Quick Reference Card

## 📍 File Locations

```
src/
├── lib/
│   ├── rbacCore.js              # Main RBAC utilities
│   ├── rbacValidation.js        # Input validation & schemas
│   ├── permissions.js           # Permission matrix & scope logic
│   └── appwrite.js              # (updated) Collection IDs
├── services/
│   ├── userService.js           # User CRUD operations
│   └── auditService.js          # Audit logging
├── hooks/
│   └── useRBAC.js               # React hooks for RBAC
└── pages/portal/
    └── Profile.jsx              # User profile page

Documentation:
├── APPWRITE_SCHEMA.md           # Database schema definitions
├── RBAC_IMPLEMENTATION_GUIDE.md # Complete implementation guide
└── RBAC_DEPLOYMENT_SUMMARY.md   # This project summary
```

## 🔑 Key Imports

```javascript
// RBAC core
import { 
  getCurrentUserWithProfile, 
  requireAuth, 
  requireRole, 
  requireScope 
} from '../lib/rbacCore.js';

// Permission checking
import { 
  hasPermission, 
  canAccess, 
  RESOURCES, 
  PERMISSIONS 
} from '../lib/permissions.js';

// Validation
import { 
  validateRBAC, 
  sanitize, 
  ROLES, 
  STATUSES 
} from '../lib/rbacValidation.js';

// Services
import * as userService from '../services/userService.js';
import * as auditService from '../services/auditService.js';

// React hooks
import { 
  useCurrentUser, 
  usePermission, 
  useRole, 
  useProfile,
  useUsers,
  useStaff
} from '../hooks/useRBAC.js';
```

## 🎯 Common Tasks

### Check if user has permission
```javascript
const hasAccess = userHasPermission(
  user, 
  RESOURCES.USERS, 
  PERMISSIONS.CREATE
);

if (hasAccess) {
  // Show create button
}
```

### Get current user with profile
```javascript
const { user, profile, loading } = useCurrentUser();

console.log(user.role);           // 'admin', 'manager', 'staff', 'client'
console.log(profile.fullName);    // User's full name
console.log(user.status);         // 'active', 'suspended', etc.
```

### Create a new user (admin only)
```javascript
const actor = getCurrentUserWithProfile();

await userService.createUser(
  actor,
  {
    email: 'john@example.com',
    role: ROLES.STAFF,
    phone: '07700900000',
  },
  {
    fullName: 'John Doe',
    siaLicence: '12345678',
    siaExpiryDate: '2025-12-31T23:59:59Z',
  }
);
```

### Update user profile
```javascript
const { updateProfile } = useProfile();

await updateProfile({
  fullName: 'Jane Smith',
  phone: '07700900001',
});
```

### Log an audit event
```javascript
await auditService.logAudit({
  actorId: user.$id,
  actorRole: user.role,
  action: 'update',
  entity: 'users',
  entityId: targetUserId,
  diff: { before: oldData, after: newData },
});
```

### Apply scope to database query
```javascript
import { applyScopeToQuery } from '../lib/rbacCore.js';

const queries = [];
const scopedQueries = applyScopeToQuery(
  user, 
  RESOURCES.SHIFTS, 
  queries
);

// Now query with scope applied
const response = await databases.listDocuments(
  databaseId,
  collectionsId,
  scopedQueries
);
```

## 👥 Roles Quick Reference

| Role | Access Level | Key Features |
|------|-------------|--------------|
| **Admin** | Global | All resources, user management, audit logs |
| **Manager** | Scoped | Assigned clients/sites, staff management |
| **Staff** | Own data | Own profile, shifts, incidents |
| **Client** | Own client | Own organization, sites, reports |

## 🔐 Scope Rules

| Role | Scope | Filter |
|------|-------|--------|
| Admin | None | Global access |
| Manager | Clients & Sites | assignedClients[], assignedSites[] |
| Staff | Own data | userId matches |
| Client | Own client | clientId matches |

## 📊 Resource Types

```javascript
RESOURCES = {
  USERS: 'users',
  PROFILES: 'profiles',
  CLIENTS: 'clients',
  SITES: 'sites',
  GUARDS: 'guards',
  SHIFTS: 'shifts',
  INCIDENTS: 'incidents',
  ASSETS: 'assets',
  REPORTS: 'reports',
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings',
}
```

## 🔓 Permission Types

```javascript
PERMISSIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  ASSIGN: 'assign',
}
```

## 🚨 Error Handling

```javascript
import { AuthError, PermissionError } from '../lib/rbacCore.js';

try {
  const user = await requireRole(ROLES.ADMIN);
} catch (error) {
  if (error instanceof AuthError) {
    // Not authenticated
    navigate('/portal/login');
  } else if (error instanceof PermissionError) {
    // Wrong role
    alert('Admin access required');
  }
}
```

## 🛡️ Data Masking

```javascript
import { maskSensitive } from '../lib/rbacValidation.js';

const email = maskSensitive({ email: 'john@example.com' }, 'email');
// Returns: 'j***@example.com'

const phone = maskSensitive({ phone: '07700900123' }, 'phone');
// Returns: '****0123'

const sia = maskSensitive({ siaLicence: '12345678' }, 'siaLicence');
// Returns: '****5678'
```

## 🗂️ Collection IDs (from env)

```
users
admin_profiles
manager_profiles
staff_profiles
client_profiles
audit_logs
clients
sites
```

## 📋 Validation Schemas

```javascript
import { userSchemas, profileSchemas } from '../lib/rbacValidation.js';

// Validate user creation
validateRBAC(userData, userSchemas.create);

// Validate self-update (limited fields)
validateRBAC(updates, userSchemas.selfUpdate);

// Validate staff profile
validateRBAC(profileData, profileSchemas.staff.create);
```

## 🧪 Testing Command

```bash
# Run in development
npm run dev

# Build for production
npm run build:prod

# Preview production build
npm run preview
```

## 📱 Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/portal/profile` | All | User profile management |
| `/portal/users` | Admin | User management (admin only) |
| `/portal/admin/users` | Admin | Admin user list (future) |
| `/portal/manager/staff` | Manager | Staff management (future) |
| `/portal/client/settings` | Client | Client settings (future) |

## 🔄 User Lifecycle

```
1. Admin creates user → Appwrite auth account created
2. User document created in 'users' collection
3. Role profile created (*_profiles collection)
4. User can login
5. Profile loaded on each authentication
6. Permissions checked on every action
7. All actions logged to audit_logs
8. Admin can suspend/archive user (soft delete)
```

## ⚙️ Setup Checklist

- [ ] Create Appwrite collections from APPWRITE_SCHEMA.md
- [ ] Add collection IDs to .env.local
- [ ] Create first admin user
- [ ] Test login
- [ ] Test profile page
- [ ] Test permission checks
- [ ] Verify audit logs

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "User not found" | Check users collection, externalId must match Appwrite user |
| "Permission denied" | Verify role in users collection, check permission matrix |
| "Profile not found" | Ensure profile created in correct collection for role |
| "Scope filtering not working" | Check assignedClients/Sites or clientId in profiles |
| Collections empty | Run setup in Appwrite Console with exact schema |

## 🎓 Documentation Links

- Full Guide: `RBAC_IMPLEMENTATION_GUIDE.md`
- Database Schema: `APPWRITE_SCHEMA.md`
- Deployment Summary: `RBAC_DEPLOYMENT_SUMMARY.md`
- This Card: `RBAC_QUICK_REFERENCE.md`

---

**Last Updated**: 22 December 2025  
**Status**: Production Ready  
**Framework**: React + Vite + Appwrite
