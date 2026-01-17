#!/usr/bin/env node
/**
 * Setup script for complianceUploads collection
 * Run this to initialize the collection schema and indexes if not already present
 */

import { Client, Databases, ID } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID || 'demo-project');

const databases = new Databases(client);

const DB_ID = process.env.VITE_APPWRITE_DATABASE_ID || 'demo-database';
const COLLECTION_ID = 'compliance_uploads';

async function setupCollection() {
  try {
    console.log('🔧 Setting up complianceUploads collection...');

    // Try to create collection
    try {
      const collection = await databases.createCollection(
        DB_ID,
        COLLECTION_ID,
        'complianceUploads',
        [
          {
            method: 'role',
            role: 'admin',
            type: 'allow',
            resource: 'document',
            permission: 'read'
          },
          {
            method: 'role',
            role: 'admin',
            type: 'allow',
            resource: 'document',
            permission: 'write'
          },
          {
            method: 'role',
            role: 'admin',
            type: 'allow',
            resource: 'document',
            permission: 'delete'
          },
          {
            method: 'role',
            role: 'manager',
            type: 'allow',
            resource: 'document',
            permission: 'read'
          }
        ]
      );
      console.log('✓ Collection created');
    } catch (e) {
      if (e.code === 409) {
        console.log('✓ Collection already exists');
      } else {
        throw e;
      }
    }

    // Create attributes
    const attributes = [
      {
        key: 'staff_id',
        type: 'string',
        required: true,
        xdefault: null
      },
      {
        key: 'file_name',
        type: 'string',
        required: true,
        xdefault: null
      },
      {
        key: 'file_type',
        type: 'string',
        required: false,
        xdefault: null
      },
      {
        key: 'appwrite_file_id',
        type: 'string',
        required: true,
        xdefault: null
      },
      {
        key: 'google_drive_file_id',
        type: 'string',
        required: false,
        xdefault: null
      },
      {
        key: 'drive_sync_status',
        type: 'string',
        required: true,
        xdefault: 'pending'
      },
      {
        key: 'last_sync_attempt',
        type: 'datetime',
        required: false,
        xdefault: null
      },
      {
        key: 'sync_error',
        type: 'string',
        required: false,
        xdefault: null
      },
      {
        key: 'created_at',
        type: 'datetime',
        required: false,
        xdefault: null
      },
      {
        key: 'updated_at',
        type: 'datetime',
        required: false,
        xdefault: null
      }
    ];

    for (const attr of attributes) {
      try {
        await databases.createStringAttribute(
          DB_ID,
          COLLECTION_ID,
          attr.key,
          255,
          attr.required,
          attr.xdefault
        );
        console.log(`✓ Attribute '${attr.key}' created`);
      } catch (e) {
        if (e.code === 409) {
          console.log(`✓ Attribute '${attr.key}' already exists`);
        } else {
          throw e;
        }
      }
    }

    // Create datetime attributes
    const datetimeAttrs = ['last_sync_attempt', 'created_at', 'updated_at'];
    for (const attr of datetimeAttrs) {
      try {
        await databases.createDatetimeAttribute(
          DB_ID,
          COLLECTION_ID,
          attr,
          false,
          null
        );
        console.log(`✓ DateTime attribute '${attr}' created`);
      } catch (e) {
        if (e.code === 409) {
          console.log(`✓ DateTime attribute '${attr}' already exists`);
        }
      }
    }

    // Create indexes
    const indexes = [
      {
        key: 'staff_id_idx',
        type: 'key',
        attributes: ['staff_id']
      },
      {
        key: 'appwrite_file_id_idx',
        type: 'unique',
        attributes: ['appwrite_file_id']
      },
      {
        key: 'sync_status_idx',
        type: 'key',
        attributes: ['drive_sync_status']
      },
      {
        key: 'last_sync_idx',
        type: 'key',
        attributes: ['last_sync_attempt']
      }
    ];

    for (const idx of indexes) {
      try {
        await databases.createIndex(
          DB_ID,
          COLLECTION_ID,
          idx.key,
          idx.type,
          idx.attributes
        );
        console.log(`✓ Index '${idx.key}' created`);
      } catch (e) {
        if (e.code === 409) {
          console.log(`✓ Index '${idx.key}' already exists`);
        } else {
          throw e;
        }
      }
    }

    console.log('\n✅ Collection setup complete!\n');
    console.log('Collection ID: compliance_uploads');
    console.log('Database ID:', DB_ID);

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupCollection();
