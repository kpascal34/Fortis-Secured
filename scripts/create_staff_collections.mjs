import { Client, Databases, ID } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID;

async function createStaffProfilesCollection() {
  console.log('📋 Creating Staff Profiles collection...');
  try {
    const collection = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'staff_profiles',
      [
        {
          key: 'email',
          type: 'string',
          required: true,
        },
        {
          key: 'firstName',
          type: 'string',
          required: true,
        },
        {
          key: 'lastName',
          type: 'string',
          required: true,
        },
        {
          key: 'role',
          type: 'string',
          required: true,
        },
        {
          key: 'department',
          type: 'string',
          required: false,
        },
        {
          key: 'licenseNumber',
          type: 'string',
          required: false,
        },
        {
          key: 'licenseExpiry',
          type: 'datetime',
          required: false,
        },
        {
          key: 'status',
          type: 'string',
          required: true,
        },
        {
          key: 'phone',
          type: 'string',
          required: false,
        },
        {
          key: 'address',
          type: 'string',
          required: false,
        },
        {
          key: 'startDate',
          type: 'datetime',
          required: true,
        },
        {
          key: 'dBSStatus',
          type: 'string',
          required: false,
        },
        {
          key: 'rightToWork',
          type: 'string',
          required: false,
        },
        {
          key: 'emergencyContact',
          type: 'string',
          required: false,
        },
        {
          key: 'emergencyPhone',
          type: 'string',
          required: false,
        },
      ]
    );
    console.log(`✓ Staff Profiles collection created: ${collection.$id}`);
    return collection.$id;
  } catch (error) {
    console.error('Error creating Staff Profiles collection:', error.message);
    throw error;
  }
}

async function createStaffLeaveCollection() {
  console.log('📅 Creating Staff Leave collection...');
  try {
    const collection = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'staff_leave',
      [
        {
          key: 'staffId',
          type: 'string',
          required: true,
        },
        {
          key: 'staffName',
          type: 'string',
          required: true,
        },
        {
          key: 'leaveType',
          type: 'string',
          required: true,
        },
        {
          key: 'startDate',
          type: 'datetime',
          required: true,
        },
        {
          key: 'endDate',
          type: 'datetime',
          required: true,
        },
        {
          key: 'reason',
          type: 'string',
          required: false,
        },
        {
          key: 'status',
          type: 'string',
          required: true,
        },
        {
          key: 'approvedBy',
          type: 'string',
          required: false,
        },
        {
          key: 'approvedDate',
          type: 'datetime',
          required: false,
        },
        {
          key: 'requestedAt',
          type: 'datetime',
          required: true,
        },
      ]
    );
    console.log(`✓ Staff Leave collection created: ${collection.$id}`);
    return collection.$id;
  } catch (error) {
    console.error('Error creating Staff Leave collection:', error.message);
    throw error;
  }
}

async function createStaffTrainingCollection() {
  console.log('🎓 Creating Staff Training collection...');
  try {
    const collection = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'staff_training',
      [
        {
          key: 'trainingName',
          type: 'string',
          required: true,
        },
        {
          key: 'description',
          type: 'string',
          required: false,
        },
        {
          key: 'startDate',
          type: 'datetime',
          required: true,
        },
        {
          key: 'endDate',
          type: 'datetime',
          required: true,
        },
        {
          key: 'duration',
          type: 'string',
          required: false,
        },
        {
          key: 'location',
          type: 'string',
          required: false,
        },
        {
          key: 'trainer',
          type: 'string',
          required: false,
        },
        {
          key: 'category',
          type: 'string',
          required: false,
        },
        {
          key: 'status',
          type: 'string',
          required: true,
        },
      ]
    );
    console.log(`✓ Staff Training collection created: ${collection.$id}`);
    return collection.$id;
  } catch (error) {
    console.error('Error creating Staff Training collection:', error.message);
    throw error;
  }
}

async function createStaffTrainingEnrollmentCollection() {
  console.log('📝 Creating Staff Training Enrollment collection...');
  try {
    const collection = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'staff_training_enrollment',
      [
        {
          key: 'staffId',
          type: 'string',
          required: true,
        },
        {
          key: 'trainingId',
          type: 'string',
          required: true,
        },
        {
          key: 'enrollmentDate',
          type: 'datetime',
          required: true,
        },
        {
          key: 'completionDate',
          type: 'datetime',
          required: false,
        },
        {
          key: 'status',
          type: 'string',
          required: true,
        },
        {
          key: 'grade',
          type: 'string',
          required: false,
        },
        {
          key: 'certificateIssued',
          type: 'boolean',
          required: false,
        },
        {
          key: 'notes',
          type: 'string',
          required: false,
        },
      ]
    );
    console.log(`✓ Staff Training Enrollment collection created: ${collection.$id}`);
    return collection.$id;
  } catch (error) {
    console.error('Error creating Staff Training Enrollment collection:', error.message);
    throw error;
  }
}

async function createStaffLicensesCollection() {
  console.log('🏅 Creating Staff Licenses collection...');
  try {
    const collection = await databases.createCollection(
      DATABASE_ID,
      ID.unique(),
      'staff_licenses',
      [
        {
          key: 'staffId',
          type: 'string',
          required: true,
        },
        {
          key: 'licenseType',
          type: 'string',
          required: true,
        },
        {
          key: 'licenseNumber',
          type: 'string',
          required: true,
        },
        {
          key: 'issuedDate',
          type: 'datetime',
          required: true,
        },
        {
          key: 'expiryDate',
          type: 'datetime',
          required: true,
        },
        {
          key: 'issuer',
          type: 'string',
          required: false,
        },
        {
          key: 'status',
          type: 'string',
          required: true,
        },
      ]
    );
    console.log(`✓ Staff Licenses collection created: ${collection.$id}`);
    return collection.$id;
  } catch (error) {
    console.error('Error creating Staff Licenses collection:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Creating HR & Compliance collections...\n');

  try {
    const staffProfilesId = await createStaffProfilesCollection();
    const staffLeaveId = await createStaffLeaveCollection();
    const staffTrainingId = await createStaffTrainingCollection();
    const staffTrainingEnrollmentId = await createStaffTrainingEnrollmentCollection();
    const staffLicensesId = await createStaffLicensesCollection();

    console.log('\n✅ All collections created successfully!\n');
    console.log('Add these to your .env file:\n');
    console.log(`VITE_APPWRITE_STAFF_PROFILES_COLLECTION_ID=${staffProfilesId}`);
    console.log(`VITE_APPWRITE_STAFF_LEAVE_COLLECTION_ID=${staffLeaveId}`);
    console.log(`VITE_APPWRITE_STAFF_TRAINING_COLLECTION_ID=${staffTrainingId}`);
    console.log(`VITE_APPWRITE_STAFF_TRAINING_ENROLLMENT_COLLECTION_ID=${staffTrainingEnrollmentId}`);
    console.log(`VITE_APPWRITE_STAFF_LICENSES_COLLECTION_ID=${staffLicensesId}`);
  } catch (error) {
    console.error('❌ Error creating collections:', error);
    process.exit(1);
  }
}

main();
