/**
 * Appwrite Database Schema Migration
 * Creates/updates all collections for interim Fortis platform
 * 
 * Run: APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... APPWRITE_DATABASE_ID=... node scripts/migrate-appwrite-interim.js
 */

import { Client, Databases } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const dbId = process.env.APPWRITE_DATABASE_ID;

async function createOrUpdate() {
  console.log('🔄 Running Appwrite schema migration...\n');

  try {
    // =====================
    // EXISTING COLLECTIONS (from previous setup)
    // =====================
    // users, admin_profiles, manager_profiles, staff_profiles, client_profiles, audit_logs
    // (Already exist from earlier setup—no changes needed)

    // =====================
    // NEW COLLECTIONS FOR INTERIM PLATFORM
    // =====================

    // 1. staff_invites: Single-use invite tokens
    console.log('📋 Setting up staff_invites collection...');
    await createCollection('staff_invites', [
      { key: 'invite_code', type: 'string', size: 32, required: true },
      { key: 'email', type: 'email', size: 320, required: true },
      { key: 'created_by', type: 'string', size: 255, required: true }, // admin user ID
      { key: 'used_by', type: 'string', size: 255, required: false }, // staff user ID after signup
      { key: 'used_at', type: 'datetime', required: false },
      { key: 'expires_at', type: 'datetime', required: true }, // 30 days from creation
      { key: 'status', type: 'string', size: 50, required: true }, // active, used, expired
    ]);
    await createIndex('staff_invites', 'invite_code_idx', 'unique', ['invite_code']);
    await createIndex('staff_invites', 'email_idx', 'key', ['email']);
    await createIndex('staff_invites', 'status_idx', 'key', ['status']);

    // 2. staff_numbers: Employee number allocation
    console.log('📋 Setting up staff_numbers collection...');
    await createCollection('staff_numbers', [
      { key: 'staff_id', type: 'string', size: 255, required: true }, // user ID
      { key: 'employee_number', type: 'string', size: 20, required: true }, // FS-000123
      { key: 'allocated_at', type: 'datetime', required: true },
    ]);
    await createIndex('staff_numbers', 'staff_id_idx', 'unique', ['staff_id']);
    await createIndex('staff_numbers', 'employee_number_idx', 'unique', ['employee_number']);

    // 3. staff_compliance: Multi-step compliance wizard progress
    console.log('📋 Setting up staff_compliance collection...');
    await createCollection('staff_compliance', [
      { key: 'staff_id', type: 'string', size: 255, required: true },
      { key: 'step_1_identity', type: 'string', size: 50000, required: false }, // JSON: personal details, address history
      { key: 'step_1_files', type: 'string', size: 5000, required: false }, // JSON array of {file_id, name, type}
      { key: 'step_2_employment', type: 'string', size: 50000, required: false }, // JSON: 5-year history
      { key: 'step_3_evidence', type: 'string', size: 5000, required: false }, // JSON array of evidence uploads
      { key: 'step_4_references', type: 'string', size: 10000, required: false }, // JSON: 2 references
      { key: 'step_5_criminal', type: 'string', size: 5000, required: false }, // JSON: file_id, upload_date
      { key: 'step_6_sia', type: 'string', size: 500, required: false }, // JSON: licence_number, expiry_date
      { key: 'step_7_video', type: 'string', size: 5000, required: false }, // JSON: file_id, duration, upload_date
      { key: 'current_step', type: 'integer', required: true }, // 1-7, 0 = not started
      { key: 'completed_at', type: 'datetime', required: false },
      { key: 'status', type: 'string', size: 50, required: true }, // in_progress, submitted, approved, rejected
      { key: 'rejection_reason', type: 'string', size: 1000, required: false },
    ]);
    await createIndex('staff_compliance', 'staff_id_idx', 'unique', ['staff_id']);
    await createIndex('staff_compliance', 'status_idx', 'key', ['status']);

    // 4. staff_grades: Staff grading (1-5 overall + category breakdowns)
    console.log('📋 Setting up staff_grades collection...');
    await createCollection('staff_grades', [
      { key: 'staff_id', type: 'string', size: 255, required: true },
      { key: 'overall_grade', type: 'integer', required: false }, // 1-5, null = not graded
      { key: 'categories', type: 'string', size: 5000, required: false }, // JSON: {reliability: 4, punctuality: 5, ...}
      { key: 'graded_by', type: 'string', size: 255, required: false }, // admin ID
      { key: 'graded_at', type: 'datetime', required: false },
      { key: 'notes', type: 'string', size: 2000, required: false },
    ]);
    await createIndex('staff_grades', 'staff_id_idx', 'unique', ['staff_id']);
    await createIndex('staff_grades', 'overall_grade_idx', 'key', ['overall_grade']);

    // 5. shifts: Shift templates/postings
    console.log('📋 Setting up shifts collection...');
    await createCollection('shifts', [
      { key: 'client_id', type: 'string', size: 255, required: true }, // scoped
      { key: 'site_id', type: 'string', size: 255, required: true },
      { key: 'position_title', type: 'string', size: 255, required: true }, // e.g., "Site Supervisor"
      { key: 'date', type: 'datetime', required: true }, // shift date
      { key: 'start_time', type: 'string', size: 20, required: true }, // HH:MM 24h format
      { key: 'end_time', type: 'string', size: 20, required: true },
      { key: 'minimum_grade_required', type: 'integer', required: false }, // 1-5, null = no requirement
      { key: 'positions_open', type: 'integer', required: true }, // how many staff needed
      { key: 'assignments', type: 'string', size: 10000, required: false }, // JSON array of {staff_id, status}
      { key: 'status', type: 'string', size: 50, required: true }, // open, filled, cancelled
      { key: 'created_by', type: 'string', size: 255, required: true }, // manager/admin
      { key: 'special_requirements', type: 'string', size: 2000, required: false },
    ]);
    await createIndex('shifts', 'client_id_idx', 'key', ['client_id']);
    await createIndex('shifts', 'site_id_idx', 'key', ['site_id']);
    await createIndex('shifts', 'date_idx', 'key', ['date']);
    await createIndex('shifts', 'status_idx', 'key', ['status']);

    // 6. shift_applications: Staff applying for shifts
    console.log('📋 Setting up shift_applications collection...');
    await createCollection('shift_applications', [
      { key: 'shift_id', type: 'string', size: 255, required: true },
      { key: 'staff_id', type: 'string', size: 255, required: true },
      { key: 'applied_at', type: 'datetime', required: true },
      { key: 'status', type: 'string', size: 50, required: true }, // pending, accepted, rejected, cancelled
      { key: 'eligibility_check', type: 'string', size: 500, required: true }, // JSON: {compliant: bool, grade_eligible: bool, reasons: []}
    ]);
    await createIndex('shift_applications', 'shift_id_idx', 'key', ['shift_id']);
    await createIndex('shift_applications', 'staff_id_idx', 'key', ['staff_id']);
    await createIndex('shift_applications', 'status_idx', 'key', ['status']);

    // 7. compliance_uploads: File metadata for Google Drive sync
    console.log('📋 Setting up compliance_uploads collection...');
    await createCollection('compliance_uploads', [
      { key: 'staff_id', type: 'string', size: 255, required: true },
      { key: 'file_id', type: 'string', size: 255, required: true }, // Appwrite file ID
      { key: 'file_name', type: 'string', size: 500, required: true },
      { key: 'file_type', type: 'string', size: 50, required: true }, // identity, employment, criminal, sia, video, etc.
      { key: 'appwrite_file_id', type: 'string', size: 255, required: true },
      { key: 'google_drive_file_id', type: 'string', size: 255, required: false },
      { key: 'google_drive_folder_id', type: 'string', size: 255, required: false },
      { key: 'uploaded_at', type: 'datetime', required: true },
      { key: 'sync_status', type: 'string', size: 50, required: true }, // pending, synced, failed
      { key: 'sync_attempts', type: 'integer', required: true }, // retry counter
      { key: 'sync_error', type: 'string', size: 1000, required: false },
      { key: 'last_sync_attempt', type: 'datetime', required: false },
    ]);
    await createIndex('compliance_uploads', 'staff_id_idx', 'key', ['staff_id']);
    await createIndex('compliance_uploads', 'appwrite_file_id_idx', 'unique', ['appwrite_file_id']);
    await createIndex('compliance_uploads', 'sync_status_idx', 'key', ['sync_status']);

    // 8. google_drive_folders: Per-staff Google Drive folders
    console.log('📋 Setting up google_drive_folders collection...');
    await createCollection('google_drive_folders', [
      { key: 'staff_id', type: 'string', size: 255, required: true },
      { key: 'folder_id', type: 'string', size: 255, required: true }, // Google Drive folder ID
      { key: 'folder_name', type: 'string', size: 255, required: true },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'parent_folder_id', type: 'string', size: 255, required: false }, // Parent shared folder
    ]);
    await createIndex('google_drive_folders', 'staff_id_idx', 'unique', ['staff_id']);
    await createIndex('google_drive_folders', 'folder_id_idx', 'unique', ['folder_id']);

    // Update existing audit_logs to include google_drive metadata
    console.log('📋 Checking audit_logs for drive_sync field...');
    try {
      await databases.createStringAttribute(dbId, 'audit_logs', 'drive_sync_status', 50, false);
      console.log('✅ Added drive_sync_status to audit_logs');
    } catch (e) {
      if (!String(e.message).includes('already exists')) throw e;
      console.log('ℹ️  drive_sync_status already exists');
    }

    console.log('\n✅ Migration complete!\n');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

async function createCollection(name, attributes) {
  try {
    await databases.createCollection(dbId, name, name);
    console.log(`  ✓ Created collection: ${name}`);
  } catch (err) {
    if (String(err.message).includes('already exists')) {
      console.log(`  ℹ️  Collection exists: ${name}`);
    } else {
      throw err;
    }
  }

  for (const attr of attributes) {
    try {
      if (attr.type === 'email') {
        await databases.createEmailAttribute(dbId, name, attr.key, attr.required);
      } else if (attr.type === 'datetime') {
        await databases.createDatetimeAttribute(dbId, name, attr.key, attr.required);
      } else if (attr.type === 'integer') {
        await databases.createIntegerAttribute(dbId, name, attr.key, attr.required);
      } else {
        await databases.createStringAttribute(dbId, name, attr.key, attr.size || 255, attr.required);
      }
    } catch (e) {
      if (!String(e.message).includes('already exists')) throw e;
    }
  }
}

async function createIndex(collection, indexId, type, keys) {
  try {
    await databases.createIndex(dbId, collection, indexId, type, keys);
  } catch (err) {
    if (!String(err.message).includes('already exists')) throw err;
  }
}

createOrUpdate();
