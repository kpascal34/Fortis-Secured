#!/usr/bin/env node
/**
 * Setup script for admin_grading collection
 * Run: node scripts/create_admin_grading_collection.mjs
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
const collectionId = process.env.VITE_APPWRITE_ADMIN_GRADING_COLLECTION_ID || 'admin_grading';

async function createAdminGradingCollection() {
  try {
    console.log('Creating admin_grading collection...');

    // Create collection
    await databases.createCollection(
      databaseId,
      collectionId,
      'Admin Grading',
      [
        'read("users")', // Any authenticated user can read
        'create("users")', // Any authenticated user can create (control via app logic)
        'update("users")', // Any authenticated user can update (control via app logic)
        'delete("users")', // Any authenticated user can delete (control via app logic)
      ]
    );

    console.log('✓ Collection created');

    // Create attributes
    console.log('Creating attributes...');

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'staffId',
      255,
      true // required
    );

    await databases.createIntegerAttribute(
      databaseId,
      collectionId,
      'grade',
      false, // not required - null means pending
      1,
      5
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'categories',
      65535, // Max length for JSON
      false
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'notes',
      1024,
      false
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'gradedBy',
      255,
      false
    );

    await databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      'gradedAt',
      false
    );

    await databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      'createdAt',
      true
    );

    await databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      'updatedAt',
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
        'staffId_idx',
        'key',
        ['staffId'],
        ['asc']
      );
      console.log('✓ staffId index created');
    } catch (error) {
      console.log('Note: staffId index may already exist or attribute not ready:', error.message);
    }

    try {
      await databases.createIndex(
        databaseId,
        collectionId,
        'grade_idx',
        'key',
        ['grade'],
        ['asc']
      );
      console.log('✓ grade index created');
    } catch (error) {
      console.log('Note: grade index may already exist or attribute not ready:', error.message);
    }

    try {
      await databases.createIndex(
        databaseId,
        collectionId,
        'gradedAt_idx',
        'key',
        ['gradedAt'],
        ['desc']
      );
      console.log('✓ gradedAt index created');
    } catch (error) {
      console.log('Note: gradedAt index may already exist or attribute not ready:', error.message);
    }

    try {
      await databases.createIndex(
        databaseId,
        collectionId,
        'staff_grade_unique',
        'unique',
        ['staffId'],
        ['asc']
      );
      console.log('✓ Unique staffId index created');
    } catch (error) {
      console.log('Note: Unique index may already exist:', error.message);
    }

    console.log('\n✅ Setup complete!');
    console.log('\nCollection ID:', collectionId);
    console.log('\nCollection Structure:');
    console.log('- staffId (string, required): Staff member ID');
    console.log('- grade (integer, optional): 1-5 rating, null means pending');
    console.log('- categories (string, optional): JSON object with category ratings');
    console.log('- notes (string, optional): Admin notes');
    console.log('- gradedBy (string, optional): Admin user ID who graded');
    console.log('- gradedAt (datetime, optional): When grade was submitted');
    console.log('- createdAt (datetime): When record was created');
    console.log('- updatedAt (datetime): Last update timestamp');
    console.log('\nQuery Examples:');
    console.log('- Pending grades: Query.isNull("grade")');
    console.log('- Graded staff: Query.isNotNull("grade")');
    console.log('- By grade range: Query.greaterThanOrEqual("grade", 4)');
    console.log('\nNext steps:');
    console.log('1. Add to Vercel environment variables:');
    console.log(`   VITE_APPWRITE_ADMIN_GRADING_COLLECTION_ID=${collectionId}`);
    console.log('2. Restart your dev server or redeploy');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 409) {
      console.log('\nNote: Collection may already exist. Check your Appwrite console.');
    }
    process.exit(1);
  }
}

createAdminGradingCollection();
