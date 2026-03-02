/**
 * Staff Invite and Signup Service
 * Invite management is RBAC-gated and tenancy-aware.
 */

import { ID, Query } from 'appwrite';
import { account, databases, config } from '../lib/appwrite.js';
import { sanitizeUsername, validateEmail } from '../lib/validation.js';
import { PERMISSIONS } from '../lib/rbac.ts';
import { buildPermissionsForDoc } from '../lib/appwritePermissions.js';
import { ensureDatabaseConfig, getAuthorizedScope } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';
import { notifyInviteSent } from './notificationService.js';

const dbId = config.databaseId;
const invitesCol = config.staffInvitesCollectionId || 'staff_invites';
const numbersCol = config.staffNumbersCollectionId || 'staff_numbers';
const staffProfilesCol = config.staffProfilesCollectionId || 'staff_profiles';
const staffComplianceCol = config.staffComplianceCollectionId || 'staff_compliance';

const ensureCollections = () => {
  ensureDatabaseConfig(invitesCol, 'staff invites collection');
  ensureDatabaseConfig(numbersCol, 'staff numbers collection');
  ensureDatabaseConfig(staffProfilesCol, 'staff profiles collection');
  ensureDatabaseConfig(staffComplianceCol, 'staff compliance collection');
};

export function buildInviteLink(inviteCode, origin = window.location.origin) {
  return `${origin}/portal/invite/${inviteCode}`;
}

/**
 * Create staff invite (admin only).
 */
export async function createStaffInvite(adminId, email, expiresInDays = 30, actor = null) {
  ensureCollections();

  if (!validateEmail(email)) {
    throw new Error('Invalid email address.');
  }

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.MANAGE_INVITES,
  });

  if (adminId && String(adminId) !== String(resolvedActor.$id) && scope.role !== 'admin') {
    throw new Error('Cannot create invite on behalf of another user.');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await databases.listDocuments(dbId, invitesCol, [
    Query.equal('email', normalizedEmail),
    Query.equal('status', 'active'),
    Query.limit(1),
  ]);

  if (existing.documents.length > 0) {
    throw new Error('Active invite already exists for this email.');
  }

  const inviteCode = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + Math.max(1, Number(expiresInDays || 30)));

  const invitePayload = {
    code: inviteCode,
    email: normalizedEmail,
    createdBy: resolvedActor.$id,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'active',
    clientId: resolvedActor?.profile?.clientId || scope.clientId || null,
    siteId: resolvedActor?.profile?.siteId || null,
  };

  const invite = await databases.createDocument(dbId, invitesCol, ID.unique(), invitePayload);

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'staff.invite.created',
    resourceType: RESOURCE_TYPES.STAFF_PROFILES,
    resourceId: invite.$id,
    clientId: invitePayload.clientId || null,
    siteId: invitePayload.siteId || null,
    metadata: {
      email: normalizedEmail,
      expiresAt: invitePayload.expiresAt,
    },
  });

  const signupUrl = buildInviteLink(inviteCode);

  let emailDispatchError = null;
  try {
    await notifyInviteSent({
      toEmail: normalizedEmail,
      inviteCode,
      signupUrl,
      expiresAt: invitePayload.expiresAt,
      clientId: invitePayload.clientId || null,
      siteId: invitePayload.siteId || null,
      userId: null,
    });
  } catch (error) {
    console.error('Failed to enqueue invite email notification:', error);
    emailDispatchError = error.message || 'Invite created but notification queue failed.';
  }

  return {
    inviteId: invite.$id,
    inviteCode,
    signupUrl,
    email: normalizedEmail,
    emailDispatchError,
  };
}

const assertInviteScope = (invite, scope) => {
  if (scope.role === 'admin') return true;

  if (scope.role === 'client') {
    if (!scope.clientId || String(invite.clientId || '') !== String(scope.clientId)) {
      throw new Error('Invite is outside your client tenancy scope.');
    }
    return true;
  }

  if (scope.role === 'manager') {
    const sites = Array.isArray(scope.assignedSiteIds) ? scope.assignedSiteIds : [];
    const clients = Array.isArray(scope.assignedClientIds) ? scope.assignedClientIds : [];
    const matchesSite = invite.siteId && sites.includes(invite.siteId);
    const matchesClient = invite.clientId && clients.includes(invite.clientId);
    if (!matchesSite && !matchesClient) {
      throw new Error('Invite is outside your manager tenancy scope.');
    }
  }

  return true;
};

/**
 * Re-enqueue invite notification email for an active invite.
 */
export async function resendStaffInvite(inviteId, actor = null) {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({
    actor,
    permission: PERMISSIONS.MANAGE_INVITES,
  });

  const invite = await databases.getDocument(dbId, invitesCol, inviteId);
  assertInviteScope(invite, scope);

  if (invite.status !== 'active') {
    throw new Error('Only active invites can be resent.');
  }

  const signupUrl = buildInviteLink(invite.code);

  await notifyInviteSent({
    toEmail: invite.email,
    inviteCode: invite.code,
    signupUrl,
    expiresAt: invite.expiresAt,
    clientId: invite.clientId || null,
    siteId: invite.siteId || null,
    userId: invite.used_by || null,
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'staff.invite.resent',
    resourceType: RESOURCE_TYPES.STAFF_PROFILES,
    resourceId: invite.$id,
    clientId: invite.clientId || null,
    siteId: invite.siteId || null,
    metadata: {
      email: invite.email,
      expiresAt: invite.expiresAt,
    },
  });

  return {
    inviteId: invite.$id,
    email: invite.email,
    signupUrl,
  };
}

/**
 * Validate invite code.
 */
export async function validateInviteCode(code) {
  ensureCollections();

  if (!code || code.length !== 32) {
    throw new Error('Invalid invite code format.');
  }

  if (typeof window !== 'undefined') {
    const response = await fetch('/api/invite-validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Invite validation failed');
    }

    return data.invite;
  }

  const invites = await databases.listDocuments(dbId, invitesCol, [
    Query.equal('code', code),
    Query.limit(1),
  ]);

  if (invites.documents.length === 0) {
    throw new Error('Invite code not found.');
  }

  const invite = invites.documents[0];

  if (invite.status !== 'active') {
    throw new Error(`Invite is ${invite.status}.`);
  }

  if (new Date(invite.expiresAt) < new Date()) {
    await databases.updateDocument(dbId, invitesCol, invite.$id, { status: 'expired' });
    throw new Error('Invite has expired.');
  }

  return invite;
}

/**
 * Signup staff member via invite.
 */
export async function signupStaffMember(inviteCode, password, firstName, lastName) {
  ensureCollections();

  if (!inviteCode || inviteCode.length !== 32) {
    throw new Error('Invalid invite code.');
  }

  if (!password || password.length < 12) {
    throw new Error('Password must be at least 12 characters.');
  }

  if (!firstName || !lastName) {
    throw new Error('First and last name are required.');
  }

  const invite = await validateInviteCode(inviteCode);

  if (invite.used_by) {
    throw new Error('This invite has already been used.');
  }

  if (!account) {
    throw new Error('Appwrite account client is not configured.');
  }

  let user;
  try {
    user = await account.create(ID.unique(), invite.email, password, `${firstName} ${lastName}`);
  } catch (error) {
    if (String(error.message || '').toLowerCase().includes('already exists')) {
      throw new Error('Email already has an account. Contact support.');
    }
    throw error;
  }

  try {
    const employeeNumber = await allocateEmployeeNumber(user.$id);

    let username = sanitizeUsername(`${firstName}.${lastName}`);
    let attempts = 0;
    while (await usernameExists(username)) {
      attempts += 1;
      if (attempts >= 10) {
        throw new Error('Could not generate unique username.');
      }
      username = sanitizeUsername(`${firstName}.${lastName}${attempts}`);
    }

    const staffProfile = await databases.createDocument(dbId, staffProfilesCol, user.$id, {
      userId: user.$id,
      fullName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email: invite.email,
      employeeNumber,
      username,
      siaLicence: '',
      siaExpiryDate: null,
      status: 'pending_compliance',
      clientId: invite.clientId || null,
      siteId: invite.siteId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const compliancePermissions = buildPermissionsForDoc({
      type: 'staff_compliance',
      ownerUserId: user.$id,
      clientUserId: invite.clientUserId || null,
      sharedWithClient: false,
    });

    await databases.createDocument(
      dbId,
      staffComplianceCol,
      ID.unique(),
      {
        staffId: user.$id,
        currentStep: 0,
        status: 'in_progress',
        clientId: invite.clientId || null,
        siteId: invite.siteId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      compliancePermissions
    );

    await databases.updateDocument(dbId, invitesCol, invite.$id, {
      used_by: user.$id,
      used_at: new Date().toISOString(),
      status: 'used',
    });

    await logEvent({
      actorId: user.$id,
      action: 'staff.signup.completed',
      resourceType: RESOURCE_TYPES.STAFF_PROFILES,
      resourceId: staffProfile.$id,
      clientId: invite.clientId || null,
      siteId: invite.siteId || null,
      metadata: {
        email: invite.email,
        employeeNumber,
        username,
      },
    });

    return {
      userId: user.$id,
      email: invite.email,
      employeeNumber,
      username,
      firstName,
      lastName,
    };
  } catch (error) {
    console.error('Signup failed after account creation:', error);
    throw error;
  }
}

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 32; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function allocateEmployeeNumber(staffId) {
  const numbers = await databases.listDocuments(dbId, numbersCol, [
    Query.orderDesc('employeeNumber'),
    Query.limit(1),
  ]);

  let nextNum = 1;
  if (numbers.documents.length > 0) {
    const last = String(numbers.documents[0].employeeNumber || 'FS-000000');
    const parsed = Number(last.split('-')[1]);
    nextNum = Number.isNaN(parsed) ? 1 : parsed + 1;
  }

  const employeeNumber = `FS-${String(nextNum).padStart(6, '0')}`;

  await databases.createDocument(dbId, numbersCol, ID.unique(), {
    staffId,
    employeeNumber,
    allocated_at: new Date().toISOString(),
  });

  return employeeNumber;
}

async function usernameExists(username) {
  const docs = await databases.listDocuments(dbId, staffProfilesCol, [
    Query.equal('username', username),
    Query.limit(1),
  ]);
  return docs.documents.length > 0;
}

export { allocateEmployeeNumber, usernameExists };
