#!/usr/bin/env node

/**
 * Add Drive Sync Status Attribute to compliance_uploads Collection
 *
 * This script adds the required 'drive_sync_status' attribute to the compliance_uploads
 * collection in Appwrite. This attribute is needed for the Drive Sync Status feature.
 *
 * Works in ESM projects (type: module) and supports both APPWRITE_* and VITE_APPWRITE_* env vars.
 *
 * Usage:
 * node scripts/add-drive-sync-attribute.js
 */

import 'dotenv/config';
import { Client, Databases } from 'node-appwrite';

// Configuration with fallbacks to VITE_* variables
const config = {
  endpoint:
    process.env.APPWRITE_ENDPOINT ||
    process.env.VITE_APPWRITE_ENDPOINT ||
    'https://cloud.appwrite.io/v1',
  projectId:
    process.env.APPWRITE_PROJECT_ID ||
    process.env.VITE_APPWRITE_PROJECT_ID,
  apiKey:
    process.env.APPWRITE_API_KEY ||
    process.env.VITE_APPWRITE_API_KEY,
  databaseId:
    process.env.APPWRITE_DATABASE_ID ||
    process.env.VITE_APPWRITE_DATABASE_ID,
  complianceUploadsCollectionId:
    process.env.APPWRITE_COMPLIANCE_UPLOADS_COLLECTION_ID ||
    process.env.VITE_APPWRITE_COMPLIANCE_UPLOADS_COLLECTION_ID ||
    'compliance_uploads',
};

// Validate configuration
if (!config.projectId || !config.apiKey || !config.databaseId) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Required one of:');
  console.error('   - APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID');
  console.error('   - VITE_APPWRITE_PROJECT_ID, VITE_APPWRITE_API_KEY, VITE_APPWRITE_DATABASE_ID');
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);

async function main() {
  try {
    console.log('🔧 Adding Drive Sync Status Attribute...');
    console.log(`📁 Collection: ${config.complianceUploadsCollectionId}`);

    // Add drive_sync_status attribute (enum with pending, failed, success)
    await databases.createEnumAttribute(
      config.databaseId,
      config.complianceUploadsCollectionId,
      'drive_sync_status',
      ['pending', 'failed', 'success'],
      false,
      'pending'
    );

    console.log('✅ Successfully added drive_sync_status attribute!');
    console.log('   Enum values: pending, failed, success');
    console.log('   Default: pending');

    // Optional: Add additional helpful attributes for Drive Sync tracking
    try {
      console.log('\n📝 Adding additional Drive Sync tracking attributes...');

      // Add last_sync_attempt timestamp
      await databases.createDatetimeAttribute(
        config.databaseId,
        config.complianceUploadsCollectionId,
        'last_sync_attempt',
        false
      );
      console.log('   ✅ Added last_sync_attempt (datetime)');
    } catch (err) {
      if (String(err?.message || '').includes('already exists')) {
        console.log('   ℹ️  last_sync_attempt already exists');
      } else {
        console.warn('   ⚠️  Could not add last_sync_attempt:', err?.message || err);
      }
    }

    try {
      // Add sync_error_message for tracking failures
      await databases.createStringAttribute(
        config.databaseId,
        config.complianceUploadsCollectionId,
        'sync_error_message',
        1000,
        false
      );
      console.log('   ✅ Added sync_error_message (string)');
    } catch (err) {
      if (String(err?.message || '').includes('already exists')) {
        console.log('   ℹ️  sync_error_message already exists');
      } else {
        console.warn('   ⚠️  Could not add sync_error_message:', err?.message || err);
      }
    }

    try {
      // Add sync_retry_count for tracking retries
      await databases.createIntegerAttribute(
        config.databaseId,
        config.complianceUploadsCollectionId,
        'sync_retry_count',
        false,
        0
      );
      console.log('   ✅ Added sync_retry_count (integer)');
    } catch (err) {
      if (String(err?.message || '').includes('already exists')) {
        console.log('   ℹ️  sync_retry_count already exists');
      } else {
        console.warn('   ⚠️  Could not add sync_retry_count:', err?.message || err);
      }
    }

    console.log('\n✨ Drive Sync Status setup complete!');
    console.log('   The Drive Sync Status feature is now ready to use.');
  } catch (error) {
    const msg = String(error?.message || error);
    if (msg.includes('already exists')) {
      console.log('✅ drive_sync_status attribute already exists!');
      console.log('   The Drive Sync Status feature is ready to use.');
    } else {
      console.error('❌ Error:', msg);
      console.error('\nTroubleshooting:');
      console.error('1. Verify environment variables are set correctly');
      console.error('2. Ensure the compliance_uploads collection exists in Appwrite');
      console.error('3. Check that the API key has database modification permissions');
      process.exit(1);
    }
  }
}

main();
