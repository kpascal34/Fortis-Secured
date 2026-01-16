#!/usr/bin/env node

/**
 * Creates Appwrite collections for Admin Grading System
 * Run: node scripts/create_admin_grading_collections.mjs
 */

import { Client, Databases, Permission, Role, ID } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const dbId = process.env.VITE_APPWRITE_DATABASE_ID;

async function createGradingCollections() {
  console.log('🔧 Setting up Admin Grading Collections...\n');

  try {
    // 1. Admin Grading Collection (main grading records)
    console.log('Creating admin_grading collection...');
    const gradingCollection = await databases.createCollection(
      dbId,
      ID.unique(),
      'admin_grading',
      [
        Permission.read(Role.user('[USER_ID]')), // Staff can read their own
        Permission.create(Role.label('admin')),
        Permission.update(Role.label('admin')),
        Permission.read(Role.label('admin')),
        Permission.read(Role.label('manager')),
        Permission.update(Role.label('manager')),
      ],
      true, // Document security
      true  // Enabled
    );
    
    console.log(`✅ Created: ${gradingCollection.$id}\n`);
    console.log(`Add to .env: VITE_APPWRITE_ADMIN_GRADING_COLLECTION_ID=${gradingCollection.$id}\n`);

    // Attributes for admin_grading
    const gradingAttrs = [
      { key: 'staffId', type: 'string', size: 255, required: true },
      { key: 'staffName', type: 'string', size: 255, required: false },
      { key: 'staffEmail', type: 'string', size: 255, required: false },
      { key: 'grade', type: 'integer', required: false }, // 1-5 or null for pending
      { key: 'criteria', type: 'string', size: 5000, required: false }, // JSON: {punctuality: 4, reliability: 5, ...}
      { key: 'comment', type: 'string', size: 5000, required: false },
      { key: 'gradedBy', type: 'string', size: 255, required: false }, // Admin ID
      { key: 'gradedByName', type: 'string', size: 255, required: false },
      { key: 'gradedAt', type: 'datetime', required: false },
      { key: 'createdAt', type: 'datetime', required: false },
      { key: 'updatedAt', type: 'datetime', required: false },
      { key: 'status', type: 'string', size: 50, required: false, default: 'pending' }, // pending, graded
      { key: 'daysWithoutGrading', type: 'integer', required: false, default: 0 },
    ];

    console.log('Creating attributes for admin_grading...');
    for (const attr of gradingAttrs) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            dbId,
            gradingCollection.$id,
            attr.key,
            attr.size,
            attr.required,
            attr.default,
            false
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            dbId,
            gradingCollection.$id,
            attr.key,
            attr.required,
            undefined,
            undefined,
            attr.default
          );
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(
            dbId,
            gradingCollection.$id,
            attr.key,
            attr.required
          );
        }
        console.log(`  ✓ ${attr.key}`);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Rate limit
      } catch (err) {
        if (err.code === 409) {
          console.log(`  ⚠ ${attr.key} already exists`);
        } else {
          throw err;
        }
      }
    }

    // Create indexes
    console.log('\nCreating indexes...');
    try {
      await databases.createIndex(
        dbId,
        gradingCollection.$id,
        'idx_staffId',
        'key',
        ['staffId'],
        ['ASC']
      );
      console.log('  ✓ idx_staffId');
    } catch (err) {
      if (err.code === 409) console.log('  ⚠ idx_staffId already exists');
    }

    try {
      await databases.createIndex(
        dbId,
        gradingCollection.$id,
        'idx_status',
        'key',
        ['status'],
        ['ASC']
      );
      console.log('  ✓ idx_status');
    } catch (err) {
      if (err.code === 409) console.log('  ⚠ idx_status already exists');
    }

    try {
      await databases.createIndex(
        dbId,
        gradingCollection.$id,
        'idx_gradedAt',
        'key',
        ['gradedAt'],
        ['DESC']
      );
      console.log('  ✓ idx_gradedAt');
    } catch (err) {
      if (err.code === 409) console.log('  ⚠ idx_gradedAt already exists');
    }

    console.log('\n✅ All grading collections created successfully!\n');
    console.log('📋 Environment Variables to Add:\n');
    console.log(`VITE_APPWRITE_ADMIN_GRADING_COLLECTION_ID=${gradingCollection.$id}`);
    console.log('\n✅ Setup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 409) {
      console.log('\n⚠️  Some collections may already exist. Check your database.');
    }
    process.exit(1);
  }
}

createGradingCollections();
