import { Query } from 'appwrite';
import { account, databases, config } from './appwrite.js';
import { assertPermission, normalizeRole, ROLES } from './rbac.ts';
import { assertScopedAccess, getScope, mergeScopedQueries, normalizeTenancyDocument } from './tenancyScope.js';

const ACTOR_CACHE_TTL_MS = 10 * 1000;
let actorCache = {
  at: 0,
  actor: null,
};

const parseMaybeJson = (value) => {
  if (!value) return value;
  if (Array.isArray(value) || typeof value === 'object') return value;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch (_) {
    return value;
  }
};

const roleProfileCollectionId = (role) => {
  switch (role) {
    case ROLES.ADMIN:
      return config.adminProfilesCollectionId;
    case ROLES.MANAGER:
      return config.managerProfilesCollectionId;
    case ROLES.STAFF:
      return config.staffProfilesCollectionId;
    case ROLES.CLIENT:
      return config.clientProfilesCollectionId;
    default:
      return null;
  }
};

const hydrateActor = async (accountUser) => {
  const fallbackRole = normalizeRole(accountUser?.role || accountUser?.prefs?.role || ROLES.STAFF) || ROLES.STAFF;
  const hydrated = {
    ...accountUser,
    role: fallbackRole,
    profile: null,
    userDocId: null,
  };

  if (!databases || !config.databaseId) {
    return hydrated;
  }

  if (config.usersCollectionId) {
    try {
      const userDocs = await databases.listDocuments(config.databaseId, config.usersCollectionId, [
        Query.equal('externalId', accountUser.$id),
        Query.limit(1),
      ]);

      if (userDocs.documents.length > 0) {
        const userDoc = userDocs.documents[0];
        hydrated.userDocId = userDoc.$id;
        hydrated.role = normalizeRole(userDoc.role || hydrated.role) || hydrated.role;
        hydrated.userDoc = userDoc;
      }
    } catch (error) {
      console.error('[serviceSecurity] Failed to hydrate user role from users collection.', error);
    }
  }

  const profileCollectionId = roleProfileCollectionId(hydrated.role);
  if (profileCollectionId) {
    try {
      const profileDocs = await databases.listDocuments(config.databaseId, profileCollectionId, [
        Query.equal('userId', accountUser.$id),
        Query.limit(1),
      ]);
      hydrated.profile = profileDocs.documents[0] || null;
    } catch (error) {
      console.error('[serviceSecurity] Failed to load actor profile.', error);
    }
  }

  if (hydrated.profile?.assignedClients) {
    hydrated.profile.assignedClients = parseMaybeJson(hydrated.profile.assignedClients);
  }
  if (hydrated.profile?.assignedSites) {
    hydrated.profile.assignedSites = parseMaybeJson(hydrated.profile.assignedSites);
  }

  return hydrated;
};

export const resolveActor = async (explicitActor = null) => {
  if (explicitActor?.$id && explicitActor?.role) {
    return explicitActor;
  }

  const now = Date.now();
  if (actorCache.actor && now - actorCache.at < ACTOR_CACHE_TTL_MS) {
    return actorCache.actor;
  }

  if (!account || config.isDemoMode) {
    throw new Error('Authentication context unavailable for service authorization.');
  }

  const accountUser = await account.get();
  const actor = await hydrateActor(accountUser);
  actorCache = { at: now, actor };
  return actor;
};

export const getAuthorizedScope = async ({ actor, permission }) => {
  const resolvedActor = await resolveActor(actor);
  assertPermission(resolvedActor, permission, `Permission denied for ${permission}`);

  const scope = getScope(resolvedActor, resolvedActor.profile || resolvedActor);
  return { actor: resolvedActor, scope };
};

export const withScopedQueries = (resourceType, scope, baseQueries = []) => {
  return mergeScopedQueries(resourceType, scope, baseQueries);
};

export const assertScopedDocument = (resourceType, document, scope) => {
  const normalized = normalizeTenancyDocument(resourceType, document);
  return assertScopedAccess(resourceType, normalized, scope);
};

export const ensureDatabaseConfig = (collectionId, label) => {
  if (config.isDemoMode) {
    throw new Error(`${label} is unavailable in demo mode.`);
  }

  if (!databases || !config.databaseId) {
    throw new Error('Appwrite database client is not configured.');
  }

  if (!collectionId) {
    throw new Error(`Missing Appwrite collection ID for ${label}.`);
  }
};
