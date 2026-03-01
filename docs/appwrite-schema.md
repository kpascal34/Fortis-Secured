# Appwrite Schema Reference

## Drive Sync Status

Drive Sync Status reads from the `compliance_uploads` collection (ID from `VITE_APPWRITE_COMPLIANCE_UPLOADS_COLLECTION_ID`, default fallback: `compliance_uploads`).

### Queries used by the page

- `Query.equal('driveSyncStatus', ['failed'])`
- `Query.equal('driveSyncStatus', ['pending'])`
- `Query.equal('driveSyncStatus', ['success'])`
- `Query.orderDesc('lastSyncAttempt')`

### Required attributes checklist

| Attribute | Type | Required | Enum values |
| --- | --- | --- | --- |
| `staffId` | `string` | Yes | — |
| `fileName` | `string` | Yes | — |
| `fileType` | `string` | Yes | — |
| `driveSyncStatus` | `string` | Yes | `pending`, `failed`, `success` |
| `appwriteFileId` | `string` | No | — |
| `googleDriveFileId` | `string` | No | — |
| `syncError` | `string` | No | — |
| `lastSyncAttempt` | `datetime` | No | — |

### Behavior when schema is incomplete

The Drive Sync Status page validates this schema before querying. If required attributes are missing (or enum/type values do not match), it stops the data queries and shows a setup banner with a per-attribute checklist.
