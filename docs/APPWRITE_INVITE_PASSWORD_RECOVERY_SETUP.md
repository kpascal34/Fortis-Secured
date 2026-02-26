# Appwrite Invite + Password Recovery Setup

This project supports two onboarding/recovery entry points:

1. **Staff invite link**: `/portal/invite/:token` (token = invite code).
2. **Password recovery link**: `/portal/reset-password?userId=...&secret=...` (Appwrite recovery callback).

## Required Appwrite configuration

## 1) Platform URLs (Console → Project Settings → Platforms)
Add your frontend domains to the Web platform list:

- `http://localhost:5173` (local dev)
- `https://<your-production-domain>`

The recovery redirect URL must be on one of these domains.

## 2) Auth URL allowlist / redirect targets
Your Appwrite recovery redirect should use:

- `https://<your-domain>/portal/reset-password`

For local development:

- `http://localhost:5173/portal/reset-password`

## 3) Collections expected by invite flow
In your Appwrite database (`VITE_APPWRITE_DATABASE_ID`), ensure these collections exist:

- `staff_invites`
  - `code` (string, 32)
  - `email` (string)
  - `createdBy` (string)
  - `createdAt` (datetime/string)
  - `expiresAt` (datetime/string)
  - `status` (string: `active|used|expired`)
  - `used_by` (string, optional)
  - `used_at` (datetime/string, optional)
- `staff_profiles`
- `staff_numbers`
- `staff_compliance`

## 4) Environment variables
### Frontend (`.env`)
- `VITE_PUBLIC_BASE_URL=https://<your-domain>`
- `VITE_APPWRITE_ENDPOINT=...`
- `VITE_APPWRITE_PROJECT_ID=...`
- `VITE_APPWRITE_DATABASE_ID=...`
- `VITE_APPWRITE_STAFF_INVITES_COLLECTION_ID=staff_invites`
- `VITE_APPWRITE_STAFF_PROFILES_COLLECTION_ID=staff_profiles`
- `VITE_APPWRITE_STAFF_NUMBERS_COLLECTION_ID=staff_numbers`

### Serverless/API env
- `APPWRITE_ENDPOINT=...`
- `APPWRITE_PROJECT_ID=...`
- `APPWRITE_API_KEY=...` (Server key with database read/write for invite validation)
- `APPWRITE_DATABASE_ID=...`
- `AWS_SES_REGION=...`
- `AWS_SES_FROM_EMAIL=...`
- `AWS_SES_ACCESS_KEY_ID=...`
- `AWS_SES_SECRET_ACCESS_KEY=...`

## 5) Email template/link behavior
Invite emails should contain a link to:

- `/portal/invite/<inviteCode>`

Password recovery emails sent by Appwrite should redirect to:

- `/portal/reset-password?userId=<id>&secret=<secret>`

## Verification checklist
- Create invite in Invite Management.
- Use **Copy Invite Link** and open it in a private window.
- Confirm signup page loads and allows password set.
- Request password reset via `/portal/forgot-password`.
- Open email link and confirm reset page accepts new password.
