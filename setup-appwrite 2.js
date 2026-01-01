/**
 * Appwrite RBAC Collections Setup Script
 * Run this to automatically create all required collections and attributes
 * 
 * Prerequisites:
 * 1. Node.js and npm installed
 * 2. Appwrite Server SDK: npm install node-appwrite
 * 3. Appwrite credentials ready (endpoint, project_id, API key)
 * 
 * Usage:
 * node setup-appwrite.js
 */

const { Client, Databases, Permission, Role } = require('node-appwrite');

// Configuration - UPDATE THESE
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID || 'your_project_id',
  apiKey: process.env.APPWRITE_API_KEY || 'your_api_key',
  databaseId: process.env.APPWRITE_DATABASE_ID || 'fortis_database',
};

// Collection IDs
const collections = {
  USERS: 'users',
  ADMIN_PROFILES: 'admin_profiles',
  MANAGER_PROFILES: 'manager_profiles',
  STAFF_PROFILES: 'staff_profiles',
  CLIENT_PROFILES: 'client_profiles',
  AUDIT_LOGS: 'audit_logs',
};

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);

/**
 * Create users collection
 */
async function createUsersCollection() {
  console.log('📝 Creating users collection...');
  
  try {
    const collection = await databases.createCollection(
      config.databaseId,
      collections.USERS,
      'users',
      [
        Permission.read(Role.users()),
        Permission.update(Role.users()),
        Permission.create(Role.admin()),
        Permission.delete(Role.admin()),
      ]
    );
    console.log('✅ Users collection created');

    // Add attributes
    await databases.createStringAttribute(
      config.databaseId,
      collections.USERS,
      'email',
      320,
      true,
      null,
      true // unique
    );
    console.log('  ✓ email attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.USERS,
      'phone',
      20,
      false
    );
    console.log('  ✓ phone attribute');

    await databases.createEnumAttribute(
      config.databaseId,
      collections.USERS,
      'role',
      ['admin', 'manager', 'staff', 'client'],
      true,
      'staff'
    );
    console.log('  ✓ role attribute');

    await databases.createEnumAttribute(
      config.databaseId,
      collections.USERS,
      'status',
      ['active', 'suspended', 'compliance_blocked', 'archived'],
      true,
      'active'
    );
    console.log('  ✓ status attribute');

    await databases.createDatetimeAttribute(
      config.databaseId,
      collections.USERS,
      'lastLoginAt',
      false
    );
    console.log('  ✓ lastLoginAt attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.USERS,
      'externalId',
      255,
      false
    );
    console.log('  ✓ externalId attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.USERS,
      'metadata',
      10000,
      false
    );
    console.log('  ✓ metadata attribute');

    await databases.createDatetimeAttribute(
      config.databaseId,
      collections.USERS,
      'deletedAt',
      false
    );
    console.log('  ✓ deletedAt attribute');

    // Create indexes
    await databases.createIndex(
      config.databaseId,
      collections.USERS,
      'email_idx',
      'key',
      ['email'],
      ['unique']
    );
    console.log('  ✓ email index (unique)');

    await databases.createIndex(
      config.databaseId,
      collections.USERS,
      'role_idx',
      'key',
      ['role']
    );
    console.log('  ✓ role index');

    await databases.createIndex(
      config.databaseId,
      collections.USERS,
      'status_idx',
      'key',
      ['status']
    );
    console.log('  ✓ status index');

    await databases.createIndex(
      config.databaseId,
      collections.USERS,
      'deletedAt_idx',
      'key',
      ['deletedAt']
    );
    console.log('  ✓ deletedAt index');

  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  Users collection already exists');
    } else {
      console.error('❌ Error creating users collection:', error.message);
      throw error;
    }
  }
}

/**
 * Create admin_profiles collection
 */
async function createAdminProfilesCollection() {
  console.log('\n📝 Creating admin_profiles collection...');
  
  try {
    await databases.createCollection(
      config.databaseId,
      collections.ADMIN_PROFILES,
      'admin_profiles'
    );
    console.log('✅ Admin profiles collection created');

    await databases.createStringAttribute(
      config.databaseId,
      collections.ADMIN_PROFILES,
      'userId',
      255,
      true
    );
    console.log('  ✓ userId attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.ADMIN_PROFILES,
      'fullName',
      255,
      true
    );
    console.log('  ✓ fullName attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.ADMIN_PROFILES,
      'department',
      100,
      false
    );
    console.log('  ✓ department attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.ADMIN_PROFILES,
      'permissions',
      5000,
      false
    );
    console.log('  ✓ permissions attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.ADMIN_PROFILES,
      'notificationPreferences',
      2000,
      false
    );
    console.log('  ✓ notificationPreferences attribute');

    await databases.createIndex(
      config.databaseId,
      collections.ADMIN_PROFILES,
      'userId_idx',
      'unique',
      ['userId']
    );
    console.log('  ✓ userId index (unique)');

  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  Admin profiles collection already exists');
    } else {
      console.error('❌ Error creating admin profiles collection:', error.message);
      throw error;
    }
  }
}

/**
 * Create manager_profiles collection
 */
async function createManagerProfilesCollection() {
  console.log('\n📝 Creating manager_profiles collection...');
  
  try {
    await databases.createCollection(
      config.databaseId,
      collections.MANAGER_PROFILES,
      'manager_profiles'
    );
    console.log('✅ Manager profiles collection created');

    await databases.createStringAttribute(
      config.databaseId,
      collections.MANAGER_PROFILES,
      'userId',
      255,
      true
    );
    console.log('  ✓ userId attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.MANAGER_PROFILES,
      'fullName',
      255,
      true
    );
    console.log('  ✓ fullName attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.MANAGER_PROFILES,
      'assignedClients',
      5000,
      false
    );
    console.log('  ✓ assignedClients attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.MANAGER_PROFILES,
      'assignedSites',
      5000,
      false
    );
    console.log('  ✓ assignedSites attribute');

    await databases.createIntegerAttribute(
      config.databaseId,
      collections.MANAGER_PROFILES,
      'maxStaffSupervision',
      false,
      50,
      50
    );
    console.log('  ✓ maxStaffSupervision attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.MANAGER_PROFILES,
      'certifications',
      2000,
      false
    );
    console.log('  ✓ certifications attribute');

    await databases.createIndex(
      config.databaseId,
      collections.MANAGER_PROFILES,
      'userId_idx',
      'unique',
      ['userId']
    );
    console.log('  ✓ userId index (unique)');

  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  Manager profiles collection already exists');
    } else {
      console.error('❌ Error creating manager profiles collection:', error.message);
      throw error;
    }
  }
}

/**
 * Create staff_profiles collection
 */
async function createStaffProfilesCollection() {
  console.log('\n📝 Creating staff_profiles collection...');
  
  try {
    await databases.createCollection(
      config.databaseId,
      collections.STAFF_PROFILES,
      'staff_profiles'
    );
    console.log('✅ Staff profiles collection created');

    await databases.createStringAttribute(
      config.databaseId,
      collections.STAFF_PROFILES,
      'userId',
      255,
      true
    );
    console.log('  ✓ userId attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.STAFF_PROFILES,
      'fullName',
      255,
      true
    );
    console.log('  ✓ fullName attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.STAFF_PROFILES,
      'siaLicence',
      50,
      true
    );
    console.log('  ✓ siaLicence attribute');

    await databases.createDatetimeAttribute(
      config.databaseId,
      collections.STAFF_PROFILES,
      'siaExpiryDate',
      true
    );
    console.log('  ✓ siaExpiryDate attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.STAFF_PROFILES,
      'emergencyContact',
      500,
      false
    );
    console.log('  ✓ emergencyContact attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.STAFF_PROFILES,
      'availability',
      2000,
      false
    );
    console.log('  ✓ availability attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.STAFF_PROFILES,
      'certifications',
      2000,
      false
    );
    console.log('  ✓ certifications attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.STAFF_PROFILES,
      'uniformSize',
      20,
      false
    );
    console.log('  ✓ uniformSize attribute');

    await databases.createEnumAttribute(
      config.databaseId,
      collections.STAFF_PROFILES,
      'transportMethod',
      ['car', 'public_transport', 'bicycle', 'motorcycle', 'walk'],
      false
    );
    console.log('  ✓ transportMethod attribute');

    await databases.createIndex(
      config.databaseId,
      collections.STAFF_PROFILES,
      'userId_idx',
      'unique',
      ['userId']
    );
    console.log('  ✓ userId index (unique)');

    await databases.createIndex(
      config.databaseId,
      collections.STAFF_PROFILES,
      'siaLicence_idx',
      'key',
      ['siaLicence']
    );
    console.log('  ✓ siaLicence index');

    await databases.createIndex(
      config.databaseId,
      collections.STAFF_PROFILES,
      'siaExpiryDate_idx',
      'key',
      ['siaExpiryDate']
    );
    console.log('  ✓ siaExpiryDate index');

  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  Staff profiles collection already exists');
    } else {
      console.error('❌ Error creating staff profiles collection:', error.message);
      throw error;
    }
  }
}

/**
 * Create client_profiles collection
 */
async function createClientProfilesCollection() {
  console.log('\n📝 Creating client_profiles collection...');
  
  try {
    await databases.createCollection(
      config.databaseId,
      collections.CLIENT_PROFILES,
      'client_profiles'
    );
    console.log('✅ Client profiles collection created');

    await databases.createStringAttribute(
      config.databaseId,
      collections.CLIENT_PROFILES,
      'userId',
      255,
      true
    );
    console.log('  ✓ userId attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.CLIENT_PROFILES,
      'clientId',
      255,
      true
    );
    console.log('  ✓ clientId attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.CLIENT_PROFILES,
      'companyName',
      255,
      true
    );
    console.log('  ✓ companyName attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.CLIENT_PROFILES,
      'contactName',
      255,
      true
    );
    console.log('  ✓ contactName attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.CLIENT_PROFILES,
      'billingAddress',
      500,
      false
    );
    console.log('  ✓ billingAddress attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.CLIENT_PROFILES,
      'vatNumber',
      50,
      false
    );
    console.log('  ✓ vatNumber attribute');

    await databases.createDatetimeAttribute(
      config.databaseId,
      collections.CLIENT_PROFILES,
      'contractStartDate',
      false
    );
    console.log('  ✓ contractStartDate attribute');

    await databases.createDatetimeAttribute(
      config.databaseId,
      collections.CLIENT_PROFILES,
      'contractEndDate',
      false
    );
    console.log('  ✓ contractEndDate attribute');

    await databases.createIntegerAttribute(
      config.databaseId,
      collections.CLIENT_PROFILES,
      'paymentTerms',
      false,
      30,
      30
    );
    console.log('  ✓ paymentTerms attribute');

    await databases.createIndex(
      config.databaseId,
      collections.CLIENT_PROFILES,
      'userId_idx',
      'unique',
      ['userId']
    );
    console.log('  ✓ userId index (unique)');

    await databases.createIndex(
      config.databaseId,
      collections.CLIENT_PROFILES,
      'clientId_idx',
      'key',
      ['clientId']
    );
    console.log('  ✓ clientId index');

  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  Client profiles collection already exists');
    } else {
      console.error('❌ Error creating client profiles collection:', error.message);
      throw error;
    }
  }
}

/**
 * Create audit_logs collection
 */
async function createAuditLogsCollection() {
  console.log('\n📝 Creating audit_logs collection...');
  
  try {
    await databases.createCollection(
      config.databaseId,
      collections.AUDIT_LOGS,
      'audit_logs',
      [Permission.read(Role.admin())]
    );
    console.log('✅ Audit logs collection created');

    await databases.createStringAttribute(
      config.databaseId,
      collections.AUDIT_LOGS,
      'actorId',
      255,
      true
    );
    console.log('  ✓ actorId attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.AUDIT_LOGS,
      'actorRole',
      50,
      true
    );
    console.log('  ✓ actorRole attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.AUDIT_LOGS,
      'action',
      100,
      true
    );
    console.log('  ✓ action attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.AUDIT_LOGS,
      'entity',
      100,
      true
    );
    console.log('  ✓ entity attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.AUDIT_LOGS,
      'entityId',
      255,
      true
    );
    console.log('  ✓ entityId attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.AUDIT_LOGS,
      'diff',
      10000,
      false
    );
    console.log('  ✓ diff attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.AUDIT_LOGS,
      'ipAddress',
      45,
      false
    );
    console.log('  ✓ ipAddress attribute');

    await databases.createStringAttribute(
      config.databaseId,
      collections.AUDIT_LOGS,
      'userAgent',
      500,
      false
    );
    console.log('  ✓ userAgent attribute');

    await databases.createIndex(
      config.databaseId,
      collections.AUDIT_LOGS,
      'actorId_idx',
      'key',
      ['actorId']
    );
    console.log('  ✓ actorId index');

    await databases.createIndex(
      config.databaseId,
      collections.AUDIT_LOGS,
      'entity_idx',
      'key',
      ['entity']
    );
    console.log('  ✓ entity index');

    await databases.createIndex(
      config.databaseId,
      collections.AUDIT_LOGS,
      'entityId_idx',
      'key',
      ['entityId']
    );
    console.log('  ✓ entityId index');

    await databases.createIndex(
      config.databaseId,
      collections.AUDIT_LOGS,
      'createdAt_idx',
      'key',
      ['$createdAt']
    );
    console.log('  ✓ createdAt index');

  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  Audit logs collection already exists');
    } else {
      console.error('❌ Error creating audit logs collection:', error.message);
      throw error;
    }
  }
}

/**
 * Main setup function
 */
async function setupCollections() {
  console.log('🚀 Starting Appwrite RBAC Collections Setup...\n');
  console.log('Configuration:');
  console.log(`  Endpoint: ${config.endpoint}`);
  console.log(`  Project ID: ${config.projectId}`);
  console.log(`  Database ID: ${config.databaseId}\n`);

  try {
    await createUsersCollection();
    await createAdminProfilesCollection();
    await createManagerProfilesCollection();
    await createStaffProfilesCollection();
    await createClientProfilesCollection();
    await createAuditLogsCollection();

    console.log('\n✅ ✅ ✅ All collections created successfully! ✅ ✅ ✅\n');
    
    console.log('📋 Collection IDs to add to .env.local:');
    console.log('VITE_APPWRITE_USERS_COLLECTION_ID=users');
    console.log('VITE_APPWRITE_ADMIN_PROFILES_COLLECTION_ID=admin_profiles');
    console.log('VITE_APPWRITE_MANAGER_PROFILES_COLLECTION_ID=manager_profiles');
    console.log('VITE_APPWRITE_STAFF_PROFILES_COLLECTION_ID=staff_profiles');
    console.log('VITE_APPWRITE_CLIENT_PROFILES_COLLECTION_ID=client_profiles');
    console.log('VITE_APPWRITE_AUDIT_LOGS_COLLECTION_ID=audit_logs\n');

    console.log('🎉 Setup complete! Your RBAC system is ready.\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupCollections();
