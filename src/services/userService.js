/**
 * User Service
 * CRUD operations with RBAC and tenancy enforcement.
 */

import { ID, Query } from 'appwrite';
import { account, databases, config } from '../lib/appwrite.js';
import { ROLES as VALIDATION_ROLES, STATUSES, validateRBAC, userSchemas, profileSchemas, sanitize } from '../lib/rbacValidation.js';
import { PERMISSIONS } from '../lib/rbac.ts';
import { ensureDatabaseConfig, getAuthorizedScope, resolveActor, withScopedQueries, assertScopedDocument } from '../lib/serviceSecurity.js';
import { RESOURCE_TYPES } from '../lib/tenancyScope.js';
import { logEvent } from './auditLogService.js';

const dbId = config.databaseId;

const ensureCollections = () => {
  ensureDatabaseConfig(config.usersCollectionId, 'users collection');
  ensureDatabaseConfig(config.clientsCollectionId, 'clients collection');
};

const toRole = (role) => String(role || '').toLowerCase();

const profileCollectionForRole = (role) => {
  switch (toRole(role)) {
    case VALIDATION_ROLES.ADMIN:
      return config.adminProfilesCollectionId;
    case VALIDATION_ROLES.MANAGER:
      return config.managerProfilesCollectionId;
    case VALIDATION_ROLES.STAFF:
      return config.staffProfilesCollectionId;
    case VALIDATION_ROLES.CLIENT:
      return config.clientProfilesCollectionId;
    default:
      return null;
  }
};

const getUserDocByExternalId = async (externalId) => {
  const response = await databases.listDocuments(dbId, config.usersCollectionId, [
    Query.equal('externalId', externalId),
    Query.limit(1),
  ]);
  return response.documents[0] || null;
};

const getProfileByUserId = async (role, userId) => {
  const collectionId = profileCollectionForRole(role);
  if (!collectionId) return null;

  const response = await databases.listDocuments(dbId, collectionId, [
    Query.equal('userId', userId),
    Query.limit(1),
  ]);

  return response.documents[0] || null;
};

const toAppwritePayload = (source = {}) => {
  const payload = {};
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      payload[key] = JSON.stringify(value);
    } else {
      payload[key] = value;
    }
  }
  return payload;
};

const findUserByIdOrExternalId = async (userId) => {
  try {
    return await databases.getDocument(dbId, config.usersCollectionId, userId);
  } catch (_) {
    const byExternalId = await getUserDocByExternalId(userId);
    if (byExternalId) return byExternalId;
    throw new Error('User not found');
  }
};

const loadProfileForUserDoc = async (userDoc) => {
  if (!userDoc) return null;
  return getProfileByUserId(userDoc.role, userDoc.externalId);
};

/**
 * Get current user with profile.
 */
export async function getMe(user) {
  ensureCollections();

  const actor = user?.$id ? user : await resolveActor();
  const userDoc = await getUserDocByExternalId(actor.$id);

  if (!userDoc) {
    throw new Error('User record not found.');
  }

  const profile = await loadProfileForUserDoc(userDoc);

  return {
    id: actor.$id,
    email: actor.email,
    phone: userDoc.phone,
    role: userDoc.role,
    status: userDoc.status,
    lastLoginAt: userDoc.lastLoginAt,
    profile,
  };
}

/**
 * Update own user record (limited fields).
 */
export async function updateMe(user, updates) {
  ensureCollections();

  const actor = user?.$id ? user : await resolveActor();
  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_PROFILE });

  const sanitized = sanitize(updates || {});
  validateRBAC(sanitized, userSchemas.selfUpdate);

  const allowedUpdates = {};
  if (sanitized.phone !== undefined) allowedUpdates.phone = sanitized.phone;

  if (Object.keys(allowedUpdates).length === 0) {
    return getMe(actor);
  }

  const userDoc = await getUserDocByExternalId(actor.$id);
  if (!userDoc) {
    throw new Error('User not found.');
  }

  const updated = await databases.updateDocument(dbId, config.usersCollectionId, userDoc.$id, allowedUpdates);

  await logEvent({
    actorId: actor.$id,
    action: 'user.self.updated',
    resourceType: RESOURCE_TYPES.STAFF_PROFILES,
    resourceId: updated.$id,
    clientId: scope.clientId || null,
    metadata: {
      fields: Object.keys(allowedUpdates),
    },
  });

  return getMe(actor);
}

/**
 * Update own role profile.
 */
export async function updateMyProfile(user, updates) {
  ensureCollections();

  const actor = user?.$id ? user : await resolveActor();
  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_PROFILE });

  const role = toRole(actor.role || actor.userDoc?.role || VALIDATION_ROLES.STAFF);
  const schema = profileSchemas[role]?.update;
  if (!schema) {
    throw new Error('Invalid role for profile update.');
  }

  const sanitized = sanitize(updates || {});
  validateRBAC(sanitized, schema);

  const collectionId = profileCollectionForRole(role);
  if (!collectionId) {
    throw new Error(`Profile collection is not configured for role: ${role}`);
  }

  const profile = actor.profile?.$id
    ? actor.profile
    : await getProfileByUserId(role, actor.$id);

  if (!profile) {
    throw new Error('Profile not found.');
  }

  const payload = toAppwritePayload(sanitized);
  const updated = await databases.updateDocument(dbId, collectionId, profile.$id, payload);

  await logEvent({
    actorId: actor.$id,
    action: 'profile.self.updated',
    resourceType: RESOURCE_TYPES.STAFF_PROFILES,
    resourceId: updated.$id,
    clientId: scope.clientId || null,
    siteId: actor.profile?.siteId || null,
    metadata: {
      role,
      fields: Object.keys(payload),
    },
  });

  return updated;
}

/**
 * Get all users (admin only).
 */
export async function getUsers(actor, filters = {}) {
  ensureCollections();

  await getAuthorizedScope({ actor, permission: PERMISSIONS.MANAGE_USERS });

  const queries = [Query.isNull('deletedAt')];

  if (filters.role) queries.push(Query.equal('role', String(filters.role).toLowerCase()));
  if (filters.status) queries.push(Query.equal('status', filters.status));
  if (filters.search) queries.push(Query.search('email', filters.search));

  queries.push(Query.limit(Number(filters.limit || 100)));
  if (filters.offset) queries.push(Query.offset(Number(filters.offset)));

  return databases.listDocuments(dbId, config.usersCollectionId, queries);
}

/**
 * Get user by document ID or externalId (admin only).
 */
export async function getUserById(actor, userId) {
  ensureCollections();

  await getAuthorizedScope({ actor, permission: PERMISSIONS.MANAGE_USERS });

  const userDoc = await findUserByIdOrExternalId(userId);

  if (userDoc.deletedAt) {
    throw new Error('User not found.');
  }

  const profile = await loadProfileForUserDoc(userDoc);
  return { ...userDoc, profile };
}

/**
 * Create user + profile (admin only).
 */
export async function createUser(actor, userData, profileData) {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.MANAGE_USERS });

  const sanitizedUser = sanitize(userData || {});
  const sanitizedProfile = sanitize(profileData || {});

  validateRBAC(sanitizedUser, userSchemas.create);

  const role = toRole(sanitizedUser.role);
  const profileSchema = profileSchemas[role]?.create;
  if (!profileSchema) {
    throw new Error('Invalid role for profile creation.');
  }

  validateRBAC(sanitizedProfile, profileSchema);

  if (!account) {
    throw new Error('Appwrite account client is not configured.');
  }

  const appwriteUser = await account.create(
    ID.unique(),
    sanitizedUser.email,
    sanitizedUser.password || generatePassword(),
    sanitizedProfile.fullName || sanitizedProfile.companyName || sanitizedUser.email
  );

  const userDoc = await databases.createDocument(dbId, config.usersCollectionId, ID.unique(), {
    externalId: appwriteUser.$id,
    email: sanitizedUser.email,
    phone: sanitizedUser.phone || null,
    role,
    status: sanitizedUser.status || STATUSES.ACTIVE,
    metadata: null,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const collectionId = profileCollectionForRole(role);
  if (!collectionId) {
    throw new Error(`Missing profile collection for role: ${role}`);
  }

  const profilePayload = {
    userId: appwriteUser.$id,
    ...toAppwritePayload(sanitizedProfile),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const profile = await databases.createDocument(dbId, collectionId, ID.unique(), profilePayload);

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'user.created',
    resourceType: RESOURCE_TYPES.STAFF_PROFILES,
    resourceId: userDoc.$id,
    clientId: scope.clientId || profile.clientId || null,
    siteId: profile.siteId || null,
    metadata: {
      role,
      createdExternalId: appwriteUser.$id,
      profileId: profile.$id,
    },
  });

  return { ...userDoc, profile };
}

/**
 * Update user (admin only).
 */
export async function updateUser(actor, userId, updates) {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.MANAGE_USERS });

  const sanitized = sanitize(updates || {});
  validateRBAC(sanitized, userSchemas.update);

  const userDoc = await findUserByIdOrExternalId(userId);
  if (userDoc.deletedAt) {
    throw new Error('User not found.');
  }

  const updated = await databases.updateDocument(dbId, config.usersCollectionId, userDoc.$id, {
    ...sanitized,
    updatedAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'user.updated',
    resourceType: RESOURCE_TYPES.STAFF_PROFILES,
    resourceId: updated.$id,
    clientId: scope.clientId || null,
    metadata: {
      fields: Object.keys(sanitized),
    },
  });

  return updated;
}

/**
 * Soft-delete user (admin only).
 */
export async function deleteUser(actor, userId) {
  ensureCollections();

  const { actor: resolvedActor, scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.MANAGE_USERS });

  const userDoc = await findUserByIdOrExternalId(userId);
  if (userDoc.deletedAt) {
    throw new Error('User already deleted.');
  }

  const updated = await databases.updateDocument(dbId, config.usersCollectionId, userDoc.$id, {
    deletedAt: new Date().toISOString(),
    status: STATUSES.ARCHIVED,
    updatedAt: new Date().toISOString(),
  });

  await logEvent({
    actorId: resolvedActor.$id,
    action: 'user.deleted',
    resourceType: RESOURCE_TYPES.STAFF_PROFILES,
    resourceId: updated.$id,
    clientId: scope.clientId || null,
    metadata: {
      archivedExternalId: userDoc.externalId,
    },
  });

  return updated;
}

function generatePassword() {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i += 1) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Get staff users. Admin gets all; manager/client get scoped via staff profiles.
 */
export async function getStaff(actor, filters = {}) {
  ensureCollections();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_GUARDS });

  const baseQueries = [
    Query.equal('role', VALIDATION_ROLES.STAFF),
    Query.isNull('deletedAt'),
  ];

  const limit = Number(filters.limit || 100);
  const offset = Number(filters.offset || 0);

  let response;

  if (scope.role === 'admin') {
    response = await databases.listDocuments(dbId, config.usersCollectionId, [
      ...baseQueries,
      Query.limit(limit),
      Query.offset(offset),
    ]);
  } else {
    const profileQueries = withScopedQueries(RESOURCE_TYPES.STAFF_PROFILES, scope, [
      Query.limit(1000),
    ]);

    const profiles = await databases.listDocuments(dbId, config.staffProfilesCollectionId, profileQueries);
    const userIds = [...new Set(profiles.documents.map((profile) => profile.userId).filter(Boolean))];

    if (userIds.length === 0) {
      return { total: 0, documents: [] };
    }

    response = await databases.listDocuments(dbId, config.usersCollectionId, [
      ...baseQueries,
      Query.equal('externalId', userIds),
      Query.limit(limit),
      Query.offset(offset),
    ]);
  }

  for (const userDoc of response.documents) {
    userDoc.profile = await loadProfileForUserDoc(userDoc);
  }

  return response;
}

/**
 * Get client organization for current scope.
 */
export async function getClientOrg(actor) {
  ensureCollections();

  const { scope } = await getAuthorizedScope({ actor, permission: PERMISSIONS.VIEW_CLIENTS });

  const clientId = scope.clientId || actor?.profile?.clientId || actor?.userDoc?.clientId;
  if (!clientId) {
    throw new Error('Client scope is not resolved for this user.');
  }

  const client = await databases.getDocument(dbId, config.clientsCollectionId, clientId);
  assertScopedDocument(RESOURCE_TYPES.CLIENTS, client, scope);
  return client;
}
