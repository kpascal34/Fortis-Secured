#!/usr/bin/env node
/**
 * Setup script for staff_compliance collection
 * Run: node scripts/create_staff_compliance_collection.mjs
 */

import { Client, Databases, ID } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID;
const collectionId = process.env.VITE_APPWRITE_STAFF_COMPLIANCE_COLLECTION_ID || 'staff_compliance';

async function createStaffComplianceCollection() {
  try {
    console.log('Creating staff_compliance collection...');

    // Create collection
    await databases.createCollection(
      databaseId,
      collectionId,
      'Staff Compliance',
      [
        'read("users")', // Any authenticated user can read
        'create("users")', // Any authenticated user can create
        'update("users")', // Any authenticated user can update
        'delete("users")', // Any authenticated user can delete (control via app logic)
      ]
    );

    console.log('✓ Collection created');

    // Create attributes
    console.log('Creating attributes...');

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'staff_id',
      255,
      true // required
    );

    await databases.createEnumAttribute(
      databaseId,
      collectionId,
      'status',
      ['pending', 'in_progress', 'approved', 'rejected'],
      true, // required
      'pending'
    );

    await databases.createIntegerAttribute(
      databaseId,
      collectionId,
      'current_step',
      true, // required
      1,
      7
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'step_1_identity',
      65535,
      false
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'step_2_employment',
      65535,
      false
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'step_3_evidence',
      65535,
      false
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'step_4_references',
      65535,
      false
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'step_5_criminal',
      255,
      false
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'step_6_sia',
      1024,
      false
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'step_7_video',
      255,
      false
    );

    await databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      'submitted_at',
      false
    );

    await databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      'approved_at',
      false
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'approved_by',
      255,
      false
    );

    await databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      'created_at',
      true
    );

    await databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      'updated_at',
      true
    );

    console.log('✓ Attributes created');

    // Wait for attributes to be ready
    console.log('Waiting for attributes to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Create indexes
    console.log('Creating indexes...');

    try {
      await databases.createIndex(
        databaseId,
        collectionId,
        'staff_id_unique',
        'unique',
        ['staff_id'],
        ['asc']
      );
      console.log('✓ Unique staff_id index created');
    } catch (error) {
      console.log('Note: staff_id index may already exist:', error.message);
    }

    try {
      await databases.createIndex(
        databaseId,
        collectionId,
        'status_idx',
        'key',
        ['status'],
        ['asc']
      );
      console.log('✓ status index created');
    } catch (error) {
      console.log('Note: status index may already exist:', error.message);
    }

    try {
      await databases.createIndex(
        databaseId,
        collectionId,
        'current_step_idx',
        'key',
        ['current_step'],
        ['asc']
      );
      console.log('✓ current_step index created');
    } catch (error) {
      console.log('Note: current_step index may already exist:', error.message);
    }

    try {
      await databases.createIndex(
        databaseId,
        collectionId,
        'updated_at_idx',
        'key',
        ['updated_at'],
        ['desc']
      );
      console.log('✓ updated_at index created');
    } catch (error) {
      console.log('Note: updated_at index may already exist:', error.message);
    }

    console.log('\n✅ Setup complete!');
    console.log('\nCollection ID:', collectionId);
    console.log('\nCollection Structure (BS7858 Compliance):');
    console.log('- staff_id (string, required): Staff member ID');
    console.log('- status (enum, required): pending | in_progress | approved | rejected');
    console.log('- current_step (integer, required): 1-7 wizard steps');
    console.log('- step_1_identity (string, optional): JSON - personal info & 5-year address');
    console.log('- step_2_employment (string, optional): JSON - 5-year employment history');
    console.log('- step_3_evidence (string, optional): JSON - document file IDs');
    console.log('- step_4_references (string, optional): JSON - referee details');
    console.log('- step_5_criminal (string, optional): Criminal record file ID');
    console.log('- step_6_sia (string, optional): JSON - SIA license info');
    console.log('- step_7_video (string, optional): Video introduction file ID');
    console.log('- submitted_at (datetime, optional): When completed');
    console.log('- approved_at (datetime, optional): When approved');
    console.log('- approved_by (string, optional): Admin ID');
    console.log('- created_at (datetime, required)');
    console.log('- updated_at (datetime, required)');
    console.log('\nQuery Examples:');
    console.log('- Pending: Query.equal("status", "pending")');
    console.log('- Approved: Query.equal("status", "approved")');
    console.log('- By step: Query.equal("current_step", 3)');
    console.log('\nNext steps:');
    console.log('1. Add to Vercel environment variables:');
    console.log(`   VITE_APPWRITE_STAFF_COMPLIANCE_COLLECTION_ID=${collectionId}`);
    console.log('2. Restart your dev server or redeploy');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 409) {
      console.log('\nNote: Collection may already exist. Check your Appwrite console.');
    }
    process.exit(1);
  }
}

createStaffComplianceCollection();
