#!/usr/bin/env node
/**
 * Setup script for staff_numbers collection
 * Run: node scripts/create_staff_numbers_collection.mjs
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
const collectionId = process.env.VITE_APPWRITE_STAFF_NUMBERS_COLLECTION_ID || 'staff_numbers';

async function createStaffNumbersCollection() {
  try {
    console.log('Creating staff_numbers collection...');

    // Create collection
    await databases.createCollection(
      databaseId,
      collectionId,
      'Staff Numbers',
      [
        'read("users")', // Any authenticated user can read
        'create("users")', // Any authenticated user can create (control via app logic)
        'update("users")',
        'delete("users")',
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

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'employeeNumber',
      50,
      true // required
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'prefix',
      10,
      false
    );

    await databases.createIntegerAttribute(
      databaseId,
      collectionId,
      'sequence',
      false
    );

    await databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      'issuedAt',
      true
    );

    await databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      'createdAt',
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
        'staffId_unique',
        'unique',
        ['staffId'],
        ['asc']
      );
      console.log('✓ Unique staffId index created');
    } catch (error) {
      console.log('Note: staffId index may already exist:', error.message);
    }

    try {
      await databases.createIndex(
        databaseId,
        collectionId,
        'employeeNumber_unique',
        'unique',
        ['employeeNumber'],
        ['asc']
      );
      console.log('✓ Unique employeeNumber index created');
    } catch (error) {
      console.log('Note: employeeNumber index may already exist:', error.message);
    }

    console.log('\n✅ Setup complete!');
    console.log('\nCollection ID:', collectionId);
    console.log('\nCollection Structure:');
    console.log('- staffId (string, required): Staff member ID');
    console.log('- employeeNumber (string, required): Generated employee number (unique)');
    console.log('- prefix (string, optional): Department/type prefix');
    console.log('- sequence (integer, optional): Sequential counter');
    console.log('- issuedAt (datetime, required): When number was issued');
    console.log('- createdAt (datetime, required): Record creation timestamp');
    console.log('\nNext steps:');
    console.log('1. Add to Vercel environment variables:');
    console.log(`   VITE_APPWRITE_STAFF_NUMBERS_COLLECTION_ID=${collectionId}`);
    console.log('2. Restart your dev server or redeploy');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 409) {
      console.log('\nNote: Collection may already exist. Check your Appwrite console.');
    }
    process.exit(1);
  }
}

createStaffNumbersCollection();
