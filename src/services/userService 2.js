/**
 * User Service
 * Handles CRUD operations for users and their profiles
 */

import { databases, config, account } from '../lib/appwrite.js';
import { ID, Query } from 'appwrite';
import { ROLES, STATUSES, validateRBAC, userSchemas, profileSchemas, sanitize } from '../lib/rbacValidation.js';
import { requireRole, isAdmin, applyScopeToQuery } from '../lib/rbacCore.js';
import { RESOURCES, PERMISSIONS } from '../lib/permissions.js';
import * as auditService from './auditService.js';

/**
 * Get current user with profile
 * @param {object} user - Authenticated user
 * @returns {Promise<object>} User with profile
 */
export async function getMe(user) {
  try {
    // User already has profile loaded from requireAuth
    return {
      id: user.$id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      profile: user.profile,
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    throw new Error('Failed to fetch user data');
  }
}

/**
 * Update current user (self-edit)
 * Only allows updating permitted fields
 * @param {object} user - Authenticated user
 * @param {object} updates - Updates to apply
 * @returns {Promise<object>} Updated user
 */
export async function updateMe(user, updates) {
  try {
    const sanitized = sanitize(updates);
    
    // Validate with self-update schema
    validateRBAC(sanitized, userSchemas.selfUpdate);
    
    // Only allow updating phone (not role or status)
    const allowedUpdates = {};
    if (sanitized.phone !== undefined) {
      allowedUpdates.phone = sanitized.phone;
    }
    
    if (Object.keys(allowedUpdates).length === 0) {
      return getMe(user);
    }
    
    // Get user document
    const userResponse = await databases.listDocuments(
      config.databaseId,
      config.usersCollectionId,
      [Query.equal('externalId', user.$id)]
    );
    
    if (userResponse.documents.length === 0) {
      throw new Error('User not found');
    }
    
    const userDoc = userResponse.documents[0];
    const before = { ...userDoc };
    
    // Update user document
    const updated = await databases.updateDocument(
      config.databaseId,
      config.usersCollectionId,
      userDoc.$id,
      allowedUpdates
    );
    
    // Log audit
    await auditService.logUserUpdate(user.$id, user.role, userDoc.$id, before, updated);
    
    return getMe(user);
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error(error.message || 'Failed to update user');
  }
}

/**
 * Update user profile
 * @param {object} user - Authenticated user
 * @param {object} updates - Profile updates
 * @returns {Promise<object>} Updated profile
 */
export async function updateMyProfile(user, updates) {
  try {
    if (!user.profile) {
      throw new Error('Profile not found');
    }
    
    const sanitized = sanitize(updates);
    
    // Validate based on role
    const schema = profileSchemas[user.role]?.update;
    if (!schema) {
      throw new Error('Invalid role for profile update');
    }
    
    validateRBAC(sanitized, schema);
    
    // Get collection ID based on role
    let collectionId;
    switch (user.role) {
      case ROLES.ADMIN:
        collectionId = config.adminProfilesCollectionId;
        break;
      case ROLES.MANAGER:
        collectionId = config.managerProfilesCollectionId;
        break;
      case ROLES.STAFF:
        collectionId = config.staffProfilesCollectionId;
        break;
      case ROLES.CLIENT:
        collectionId = config.clientProfilesCollectionId;
        break;
      default:
        throw new Error('Invalid role');
    }
    
    const before = { ...user.profile };
    
    // Convert arrays/objects to JSON strings for Appwrite
    const processedUpdates = {};
    for (const [key, value] of Object.entries(sanitized)) {
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        processedUpdates[key] = JSON.stringify(value);
      } else {
        processedUpdates[key] = value;
      }
    }
    
    // Update profile
    const updated = await databases.updateDocument(
      config.databaseId,
      collectionId,
      user.profile.$id,
      processedUpdates
    );
    
    // Log audit
    await auditService.logAudit({
      actorId: user.$id,
      actorRole: user.role,
      action: 'update',
      entity: 'profiles',
      entityId: user.profile.$id,
      diff: auditService.createDiff(before, updated),
    });
    
    return updated;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error(error.message || 'Failed to update profile');
  }
}

/**
 * Get all users (admin only)
 * @param {object} actor - Authenticated admin user
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Users list
 */
export async function getUsers(actor, filters = {}) {
  try {
    // Require admin role
    await requireRole(ROLES.ADMIN);
    
    const queries = [];
    
    // Apply filters
    if (filters.role) {
      queries.push(Query.equal('role', filters.role));
    }
    
    if (filters.status) {
      queries.push(Query.equal('status', filters.status));
    }
    
    if (filters.search) {
      queries.push(Query.search('email', filters.search));
    }
    
    // Exclude deleted users
    queries.push(Query.isNull('deletedAt'));
    
    // Pagination
    if (filters.limit) {
      queries.push(Query.limit(filters.limit));
    }
    
    if (filters.offset) {
      queries.push(Query.offset(filters.offset));
    }
    
    const response = await databases.listDocuments(
      config.databaseId,
      config.usersCollectionId,
      queries
    );
    
    return response;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
}

/**
 * Get user by ID (admin only)
 * @param {object} actor - Authenticated admin user
 * @param {string} userId - User ID
 * @returns {Promise<object>} User with profile
 */
export async function getUserById(actor, userId) {
  try {
    // Require admin role
    await requireRole(ROLES.ADMIN);
    
    const user = await databases.getDocument(
      config.databaseId,
      config.usersCollectionId,
      userId
    );
    
    if (user.deletedAt) {
      throw new Error('User not found');
    }
    
    // Load profile
    user.profile = await getUserProfileById(user);
    
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw new Error('User not found');
  }
}

/**
 * Get user profile by user object
 * @param {object} user - User object
 * @returns {Promise<object|null>} Profile
 */
async function getUserProfileById(user) {
  if (!user || !user.role) return null;
  
  let collectionId;
  
  switch (user.role) {
    case ROLES.ADMIN:
      collectionId = config.adminProfilesCollectionId;
      break;
    case ROLES.MANAGER:
      collectionId = config.managerProfilesCollectionId;
      break;
    case ROLES.STAFF:
      collectionId = config.staffProfilesCollectionId;
      break;
    case ROLES.CLIENT:
      collectionId = config.clientProfilesCollectionId;
      break;
    default:
      return null;
  }
  
  if (!collectionId) return null;
  
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      collectionId,
      [Query.equal('userId', user.externalId)]
    );
    
    return response.documents[0] || null;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

/**
 * Create new user (admin only)
 * @param {object} actor - Authenticated admin user
 * @param {object} userData - User data
 * @param {object} profileData - Profile data
 * @returns {Promise<object>} Created user
 */
export async function createUser(actor, userData, profileData) {
  try {
    // Require admin role
    await requireRole(ROLES.ADMIN);
    
    const sanitizedUser = sanitize(userData);
    const sanitizedProfile = sanitize(profileData);
    
    // Validate user data
    validateRBAC(sanitizedUser, userSchemas.create);
    
    // Validate profile data based on role
    const profileSchema = profileSchemas[sanitizedUser.role]?.create;
    if (!profileSchema) {
      throw new Error('Invalid role');
    }
    validateRBAC(sanitizedProfile, profileSchema);
    
    // Create Appwrite account
    const appwriteUser = await account.create(
      ID.unique(),
      sanitizedUser.email,
      sanitizedUser.password || generatePassword(),
      sanitizedProfile.fullName || sanitizedProfile.companyName
    );
    
    // Create user document
    const userDoc = await databases.createDocument(
      config.databaseId,
      config.usersCollectionId,
      ID.unique(),
      {
        externalId: appwriteUser.$id,
        email: sanitizedUser.email,
        phone: sanitizedUser.phone || null,
        role: sanitizedUser.role,
        status: sanitizedUser.status || STATUSES.ACTIVE,
        metadata: null,
        deletedAt: null,
      }
    );
    
    // Create profile
    let collectionId;
    switch (sanitizedUser.role) {
      case ROLES.ADMIN:
        collectionId = config.adminProfilesCollectionId;
        break;
      case ROLES.MANAGER:
        collectionId = config.managerProfilesCollectionId;
        break;
      case ROLES.STAFF:
        collectionId = config.staffProfilesCollectionId;
        break;
      case ROLES.CLIENT:
        collectionId = config.clientProfilesCollectionId;
        break;
      default:
        throw new Error('Invalid role');
    }
    
    // Process profile data (convert arrays/objects to JSON)
    const processedProfile = { userId: appwriteUser.$id };
    for (const [key, value] of Object.entries(sanitizedProfile)) {
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        processedProfile[key] = JSON.stringify(value);
      } else {
        processedProfile[key] = value;
      }
    }
    
    const profile = await databases.createDocument(
      config.databaseId,
      collectionId,
      ID.unique(),
      processedProfile
    );
    
    // Log audit
    await auditService.logUserCreation(actor.$id, actor.role, userDoc.$id, {
      ...userDoc,
      profile,
    });
    
    return {
      ...userDoc,
      profile,
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error(error.message || 'Failed to create user');
  }
}

/**
 * Update user (admin only)
 * @param {object} actor - Authenticated admin user
 * @param {string} userId - User ID to update
 * @param {object} updates - Updates to apply
 * @returns {Promise<object>} Updated user
 */
export async function updateUser(actor, userId, updates) {
  try {
    // Require admin role
    await requireRole(ROLES.ADMIN);
    
    const sanitized = sanitize(updates);
    
    // Validate updates
    validateRBAC(sanitized, userSchemas.update);
    
    // Get user
    const user = await databases.getDocument(
      config.databaseId,
      config.usersCollectionId,
      userId
    );
    
    if (user.deletedAt) {
      throw new Error('User not found');
    }
    
    const before = { ...user };
    
    // Update user
    const updated = await databases.updateDocument(
      config.databaseId,
      config.usersCollectionId,
      userId,
      sanitized
    );
    
    // Log audit
    await auditService.logUserUpdate(actor.$id, actor.role, userId, before, updated);
    
    return updated;
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error(error.message || 'Failed to update user');
  }
}

/**
 * Delete user (soft delete, admin only)
 * @param {object} actor - Authenticated admin user
 * @param {string} userId - User ID to delete
 * @returns {Promise<void>}
 */
export async function deleteUser(actor, userId) {
  try {
    // Require admin role
    await requireRole(ROLES.ADMIN);
    
    // Get user
    const user = await databases.getDocument(
      config.databaseId,
      config.usersCollectionId,
      userId
    );
    
    if (user.deletedAt) {
      throw new Error('User already deleted');
    }
    
    // Soft delete
    const updated = await databases.updateDocument(
      config.databaseId,
      config.usersCollectionId,
      userId,
      {
        deletedAt: new Date().toISOString(),
        status: STATUSES.ARCHIVED,
      }
    );
    
    // Log audit
    await auditService.logUserDeletion(actor.$id, actor.role, userId, user);
    
    return updated;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
}

/**
 * Generate random password
 * @returns {string} Random password
 */
function generatePassword() {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Get staff list (manager scope)
 * @param {object} actor - Authenticated manager user
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Staff list
 */
export async function getStaff(actor, filters = {}) {
  try {
    // Require manager or admin role
    await requireRole([ROLES.ADMIN, ROLES.MANAGER]);
    
    const queries = [
      Query.equal('role', ROLES.STAFF),
      Query.isNull('deletedAt'),
    ];
    
    // Apply scope for managers
    if (actor.role === ROLES.MANAGER) {
      // Managers see all staff - scope is applied at shift assignment level
      // In production, you might want to filter by assigned sites
    }
    
    // Pagination
    if (filters.limit) {
      queries.push(Query.limit(filters.limit));
    }
    
    if (filters.offset) {
      queries.push(Query.offset(filters.offset));
    }
    
    const response = await databases.listDocuments(
      config.databaseId,
      config.usersCollectionId,
      queries
    );
    
    // Load profiles for each staff member
    for (const user of response.documents) {
      user.profile = await getUserProfileById(user);
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching staff:', error);
    throw new Error('Failed to fetch staff');
  }
}

/**
 * Get client organization (client scope)
 * @param {object} actor - Authenticated client user
 * @returns {Promise<object>} Client data
 */
export async function getClientOrg(actor) {
  try {
    // Require client role
    await requireRole(ROLES.CLIENT);
    
    if (!actor.profile || !actor.profile.clientId) {
      throw new Error('Client profile not found');
    }
    
    // Get client document
    const client = await databases.getDocument(
      config.databaseId,
      config.clientsCollectionId,
      actor.profile.clientId
    );
    
    return client;
  } catch (error) {
    console.error('Error fetching client:', error);
    throw new Error('Failed to fetch client data');
  }
}
