# Appwrite Database Schema for RBAC System

## Collections to Create in Appwrite Console

### 1. users
**Collection ID**: `users`
**Permissions**: 
- Read: role:admin, role:manager (own documents)
- Create: role:admin
- Update: role:admin, role:manager (own documents)
- Delete: role:admin

**Attributes**:
```json
[
  { "key": "email", "type": "email", "size": 320, "required": true, "unique": true },
  { "key": "phone", "type": "string", "size": 20, "required": false },
  { "key": "role", "type": "enum", "elements": ["admin", "manager", "staff", "client"], "required": true, "default": "staff" },
  { "key": "status", "type": "enum", "elements": ["active", "suspended", "compliance_blocked", "archived"], "required": true, "default": "active" },
  { "key": "lastLoginAt", "type": "datetime", "required": false },
  { "key": "externalId", "type": "string", "size": 255, "required": false },
  { "key": "metadata", "type": "string", "size": 10000, "required": false },
  { "key": "deletedAt", "type": "datetime", "required": false }
]
```

**Indexes**:
- `email_idx`: email (unique)
- `role_idx`: role (key)
- `status_idx`: status (key)
- `deletedAt_idx`: deletedAt (key)

---

### 2. admin_profiles
**Collection ID**: `admin_profiles`

**Attributes**:
```json
[
  { "key": "userId", "type": "string", "size": 255, "required": true },
  { "key": "fullName", "type": "string", "size": 255, "required": true },
  { "key": "department", "type": "string", "size": 100, "required": false },
  { "key": "permissions", "type": "string", "size": 5000, "required": false },
  { "key": "notificationPreferences", "type": "string", "size": 2000, "required": false }
]
```

**Indexes**:
- `userId_idx`: userId (unique)

---

### 3. manager_profiles
**Collection ID**: `manager_profiles`

**Attributes**:
```json
[
  { "key": "userId", "type": "string", "size": 255, "required": true },
  { "key": "fullName", "type": "string", "size": 255, "required": true },
  { "key": "assignedClients", "type": "string", "size": 5000, "required": false },
  { "key": "assignedSites", "type": "string", "size": 5000, "required": false },
  { "key": "maxStaffSupervision", "type": "integer", "required": false, "default": 50 },
  { "key": "certifications", "type": "string", "size": 2000, "required": false }
]
```

**Indexes**:
- `userId_idx`: userId (unique)

---

### 4. staff_profiles
**Collection ID**: `staff_profiles`

**Attributes**:
```json
[
  { "key": "userId", "type": "string", "size": 255, "required": true },
  { "key": "fullName", "type": "string", "size": 255, "required": true },
  { "key": "siaLicence", "type": "string", "size": 50, "required": true },
  { "key": "siaExpiryDate", "type": "datetime", "required": true },
  { "key": "emergencyContact", "type": "string", "size": 500, "required": false },
  { "key": "availability", "type": "string", "size": 2000, "required": false },
  { "key": "certifications", "type": "string", "size": 2000, "required": false },
  { "key": "uniformSize", "type": "string", "size": 20, "required": false },
  { "key": "transportMethod", "type": "enum", "elements": ["car", "public_transport", "bicycle", "motorcycle", "walk"], "required": false }
]
```

**Indexes**:
- `userId_idx`: userId (unique)
- `siaLicence_idx`: siaLicence (key)
- `siaExpiryDate_idx`: siaExpiryDate (key)

---

### 5. client_profiles
**Collection ID**: `client_profiles`

**Attributes**:
```json
[
  { "key": "userId", "type": "string", "size": 255, "required": true },
  { "key": "clientId", "type": "string", "size": 255, "required": true },
  { "key": "companyName", "type": "string", "size": 255, "required": true },
  { "key": "contactName", "type": "string", "size": 255, "required": true },
  { "key": "billingAddress", "type": "string", "size": 500, "required": false },
  { "key": "vatNumber", "type": "string", "size": 50, "required": false },
  { "key": "contractStartDate", "type": "datetime", "required": false },
  { "key": "contractEndDate", "type": "datetime", "required": false },
  { "key": "paymentTerms", "type": "integer", "required": false, "default": 30 }
]
```

**Indexes**:
- `userId_idx`: userId (unique)
- `clientId_idx`: clientId (key)

---

### 6. audit_logs
**Collection ID**: `audit_logs`

**Attributes**:
```json
[
  { "key": "actorId", "type": "string", "size": 255, "required": true },
  { "key": "actorRole", "type": "string", "size": 50, "required": true },
  { "key": "action", "type": "string", "size": 100, "required": true },
  { "key": "entity", "type": "string", "size": 100, "required": true },
  { "key": "entityId", "type": "string", "size": 255, "required": true },
  { "key": "diff", "type": "string", "size": 10000, "required": false },
  { "key": "ipAddress", "type": "string", "size": 45, "required": false },
  { "key": "userAgent", "type": "string", "size": 500, "required": false }
]
```

**Indexes**:
- `actorId_idx`: actorId (key)
- `entity_idx`: entity (key)
- `entityId_idx`: entityId (key)
- `createdAt_idx`: $createdAt (key)

---

## Environment Variables

Add to `.env` or `.env.local`:

```env
# Existing Appwrite config
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=fortis_database

# New Collection IDs for RBAC
VITE_APPWRITE_USERS_COLLECTION_ID=users
VITE_APPWRITE_ADMIN_PROFILES_COLLECTION_ID=admin_profiles
VITE_APPWRITE_MANAGER_PROFILES_COLLECTION_ID=manager_profiles
VITE_APPWRITE_STAFF_PROFILES_COLLECTION_ID=staff_profiles
VITE_APPWRITE_CLIENT_PROFILES_COLLECTION_ID=client_profiles
VITE_APPWRITE_AUDIT_LOGS_COLLECTION_ID=audit_logs

# Existing collections (if not already defined)
VITE_APPWRITE_CLIENTS_COLLECTION_ID=clients
VITE_APPWRITE_SITES_COLLECTION_ID=sites
```

## Setup Instructions

1. Log into your Appwrite Console
2. Navigate to your project → Databases → fortis_database
3. Create each collection above with the exact attributes and indexes
4. Set appropriate permissions on each collection
5. Update your `.env.local` file with the collection IDs
6. Restart your development server
