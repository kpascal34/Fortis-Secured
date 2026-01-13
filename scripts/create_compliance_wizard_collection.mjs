#!/usr/bin/env node
/**
 * Setup script for compliance_wizard_steps collection
 * Run: node scripts/create_compliance_wizard_collection.mjs
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
const collectionId = process.env.VITE_APPWRITE_COMPLIANCE_WIZARD_COLLECTION_ID || 'compliance_wizard_steps';

async function createComplianceWizardCollection() {
  try {
    console.log('Creating compliance_wizard_steps collection...');

    // Create collection
    await databases.createCollection(
      databaseId,
      collectionId,
      'Compliance Wizard Steps',
      [
        // Permissions for staff to read/write their own steps, admins to read all
        'read("label:staff")',
        'read("label:admin")',
        'create("label:staff")',
        'update("label:staff")',
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
      'stepNumber',
      true, // required
      1,
      7
    );

    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'stepData',
      65535, // Max length for JSON data
      true // required
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
        'stepNumber_idx',
        'key',
        ['stepNumber'],
        ['asc']
      );
      console.log('✓ stepNumber index created');
    } catch (error) {
      console.log('Note: stepNumber index may already exist or attribute not ready:', error.message);
    }

    try {
      await databases.createIndex(
        databaseId,
        collectionId,
        'staffId_stepNumber_idx',
        'unique',
        ['staffId', 'stepNumber'],
        ['asc', 'asc']
      );
      console.log('✓ Combined unique index created');
    } catch (error) {
      console.log('Note: Combined index may already exist or attributes not ready:', error.message);
    }

    console.log('\n✅ Setup complete!');
    console.log('\nCollection ID:', collectionId);
    console.log('\nNext steps:');
    console.log('1. Add to Vercel environment variables:');
    console.log(`   VITE_APPWRITE_COMPLIANCE_WIZARD_COLLECTION_ID=${collectionId}`);
    console.log('2. Restart your dev server or redeploy');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 409) {
      console.log('\nNote: Collection may already exist. Check your Appwrite console.');
    }
    process.exit(1);
  }
}

createComplianceWizardCollection();
