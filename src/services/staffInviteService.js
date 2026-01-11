/**
 * Staff Invite & Signup Service
 * Handles invite creation, validation, and staff signup with auto-generated credentials
 */

import { ID, Query } from 'appwrite';
import { account, databases } from '../lib/appwrite.js';
import { generateEmployeeNumber, sanitizeUsername, validateEmail } from '../lib/validation.js';
import { logAudit } from './auditService.js';

// Prefer Vite env in browser; fallback for SSR/bundlers if present
const dbId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APPWRITE_DATABASE_ID) || process.env.VITE_APPWRITE_DATABASE_ID;
const invitesCol = 'staff_invites';
const numbersCol = 'staff_numbers';

/**
 * Create staff invite (admin only)
 */
export async function createStaffInvite(adminId, email, expiresInDays = 30) {
  if (!validateEmail(email)) {
    throw new Error('Invalid email address');
  }

  // Check if already invited
  const existing = await databases.listDocuments(dbId, invitesCol, [
    Query.equal('email', email),
    Query.equal('status', 'active'),
  ]);

  if (existing.documents.length > 0) {
    throw new Error('Active invite already exists for this email');
  }

  // Generate unique invite code (32 chars)
  const inviteCode = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const invite = await databases.createDocument(dbId, invitesCol, ID.unique(), {
    code: inviteCode,
    email: email.toLowerCase(),
    createdBy: adminId,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'active',
  });

  await logAudit({
    actorId: adminId,
    actorRole: 'admin',
    action: 'CREATE',
    entity: 'staff_invites',
    entityId: invite.$id,
    diff: JSON.stringify({ email, expiresAt }),
  });

  const signupUrl = `${window.location.origin}/signup?code=${inviteCode}`;

  // Send invite email via API
  try {
    await fetch('/api/send-invite-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.toLowerCase(),
        inviteCode,
        signupUrl,
      }),
    });
  } catch (emailError) {
    console.error('Failed to send invite email:', emailError);
    // Don't fail the whole operation if email fails
  }

  return {
    inviteId: invite.$id,
    inviteCode,
    signupUrl,
    email: email.toLowerCase(),
  };
}

/**
 * Validate invite code
 */
export async function validateInviteCode(code) {
  if (!code || code.length !== 32) {
    throw new Error('Invalid invite code format');
  }

  // Prefer secure serverless validation to keep invites private
  if (typeof window !== 'undefined') {
    const resp = await fetch('/api/invite-validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.error || 'Invite validation failed');
    }
    return data.invite;
  }

  // Fallback (server-side) direct validation
  const invites = await databases.listDocuments(dbId, invitesCol, [
    Query.equal('code', code),
  ]);

  if (invites.documents.length === 0) {
    throw new Error('Invite code not found');
  }

  const invite = invites.documents[0];

  if (invite.status !== 'active') {
    throw new Error(`Invite is ${invite.status}`);
  }

  if (new Date(invite.expiresAt) < new Date()) {
    await databases.updateDocument(dbId, invitesCol, invite.$id, { status: 'expired' });
    throw new Error('Invite has expired');
  }

  return invite;
}

/**
 * Signup staff member via invite
 * - Validates invite
 * - Allocates employee number
 * - Creates staff record
 * - Initializes compliance wizard
 */
export async function signupStaffMember(inviteCode, password, firstName, lastName) {
  // Validate inputs
  if (!inviteCode || inviteCode.length !== 32) {
    throw new Error('Invalid invite code');
  }

  if (!password || password.length < 12) {
    throw new Error('Password must be at least 12 characters');
  }

  if (!firstName || !lastName) {
    throw new Error('First and last name required');
  }

  // Validate invite
  const invite = await validateInviteCode(inviteCode);

  // Check if already used
  if (invite.used_by) {
    throw new Error('This invite has already been used');
  }

  // Create Appwrite user account
  const appwriteAccount = account;
  if (!appwriteAccount) {
    throw new Error('Appwrite account client is not configured');
  }

  let user;
  try {
    user = await appwriteAccount.create(ID.unique(), invite.email, password, `${firstName} ${lastName}`);
  } catch (err) {
    if (String(err.message).includes('already exists')) {
      throw new Error('Email already has an account. Contact support.');
    }
    throw err;
  }

  try {
    // Generate employee number
    const employeeNumber = await allocateEmployeeNumber(user.$id);

    // Generate username from first.last
    let username = sanitizeUsername(`${firstName}.${lastName}`);
    let attempts = 0;
    while (await usernameExists(username) && attempts < 10) {
      username = sanitizeUsername(`${firstName}.${lastName}${++attempts}`);
    }

    if (attempts === 10) {
      throw new Error('Could not generate unique username');
    }

    // Create staff profile
    const staffProfile = await databases.createDocument(dbId, 'staff_profiles', user.$id, {
      userId: user.$id,
      fullName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email: invite.email,
      employee_number: employeeNumber,
      username,
      siaLicence: '', // To be filled in compliance wizard
      siaExpiryDate: null,
      status: 'pending_compliance',
    });

    // Initialize compliance progress
    await databases.createDocument(dbId, 'staff_compliance', ID.unique(), {
      staff_id: user.$id,
      current_step: 0,
      status: 'in_progress',
    });

    // Mark invite as used
    await databases.updateDocument(dbId, invitesCol, invite.$id, {
      used_by: user.$id,
      used_at: new Date().toISOString(),
      status: 'used',
    });

    await logAudit({
      actorId: user.$id,
      actorRole: 'staff',
      action: 'CREATE',
      entity: 'staff_profiles',
      entityId: user.$id,
      diff: JSON.stringify({
        email: invite.email,
        employeeNumber,
        username,
      }),
    });

    return {
      userId: user.$id,
      email: invite.email,
      employeeNumber,
      username,
      firstName,
      lastName,
    };
  } catch (err) {
    // Rollback is not possible with client SDK without admin privileges/session
    // Log and rethrow
    console.error('Signup failed after account creation:', err);
    throw err;
  }
}

// ============ HELPERS ============

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 32; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function allocateEmployeeNumber(staffId) {
  // Format: FS-000123
  // Fetch highest number
  const numbers = await databases.listDocuments(dbId, numbersCol, [
    Query.orderDesc('employee_number'),
    Query.limit(1),
  ]);

  let nextNum = 1;
  if (numbers.documents.length > 0) {
    const last = numbers.documents[0].employee_number; // FS-000123
    nextNum = parseInt(last.split('-')[1]) + 1;
  }

  const empNum = `FS-${String(nextNum).padStart(6, '0')}`;

  await databases.createDocument(dbId, numbersCol, ID.unique(), {
    staff_id: staffId,
    employee_number: empNum,
    allocated_at: new Date().toISOString(),
  });

  return empNum;
}

async function usernameExists(username) {
  const docs = await databases.listDocuments(dbId, 'staff_profiles', [
    Query.equal('username', username),
  ]);
  return docs.documents.length > 0;
}

export { allocateEmployeeNumber, usernameExists };
