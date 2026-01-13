import { Client, Account, Databases, Storage } from 'appwrite';

// Environment variables with fallbacks
const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || 'demo-project';
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'demo-database';

// Demo mode flag (explicitly opt-in). Defaults to real mode when creds exist.
const isDemoMode = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';
const hasCreds = Boolean(import.meta.env.VITE_APPWRITE_ENDPOINT && import.meta.env.VITE_APPWRITE_PROJECT_ID);

const client = new Client();

// Only initialize Appwrite if valid credentials are provided and not in demo mode
if (hasCreds && !isDemoMode) {
  try {
    client.setEndpoint(endpoint).setProject(projectId);
  } catch (error) {
    console.warn('Appwrite initialization failed, running in demo mode:', error);
  }
}

export const account = !isDemoMode ? new Account(client) : null;
export const databases = !isDemoMode ? new Databases(client) : null;
export const storage = !isDemoMode ? new Storage(client) : null;

export const config = {
  endpoint,
  projectId,
  databaseId,
  isDemoMode,
  // RBAC Collections
  usersCollectionId: import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID,
  adminProfilesCollectionId: import.meta.env.VITE_APPWRITE_ADMIN_PROFILES_COLLECTION_ID,
  managerProfilesCollectionId: import.meta.env.VITE_APPWRITE_MANAGER_PROFILES_COLLECTION_ID,
  staffProfilesCollectionId: import.meta.env.VITE_APPWRITE_STAFF_PROFILES_COLLECTION_ID,
  clientProfilesCollectionId: import.meta.env.VITE_APPWRITE_CLIENT_PROFILES_COLLECTION_ID,
  auditLogsCollectionId: import.meta.env.VITE_APPWRITE_AUDIT_LOGS_COLLECTION_ID,
  // Existing Collections
  clientsCollectionId: import.meta.env.VITE_APPWRITE_CLIENTS_COLLECTION_ID,
  guardsCollectionId: import.meta.env.VITE_APPWRITE_GUARDS_COLLECTION_ID,
  sitesCollectionId: import.meta.env.VITE_APPWRITE_SITES_COLLECTION_ID,
  postsCollectionId: import.meta.env.VITE_APPWRITE_POSTS_COLLECTION_ID,
  shiftsCollectionId: import.meta.env.VITE_APPWRITE_SHIFTS_COLLECTION_ID,
  shiftAssignmentsCollectionId: import.meta.env.VITE_APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID,
  incidentsCollectionId: import.meta.env.VITE_APPWRITE_INCIDENTS_COLLECTION_ID,
  assetsCollectionId: import.meta.env.VITE_APPWRITE_ASSETS_COLLECTION_ID,
  applicationsCollectionId: import.meta.env.VITE_APPWRITE_APPLICATIONS_COLLECTION_ID,
  tasksCollectionId: import.meta.env.VITE_APPWRITE_TASKS_COLLECTION_ID,
  // Staff management collections
  staffInvitesCollectionId: import.meta.env.VITE_APPWRITE_STAFF_INVITES_COLLECTION_ID,
  staffNumbersCollectionId: import.meta.env.VITE_APPWRITE_STAFF_NUMBERS_COLLECTION_ID,
  staffLeaveCollectionId: import.meta.env.VITE_APPWRITE_STAFF_LEAVE_COLLECTION_ID,
  staffTrainingCollectionId: import.meta.env.VITE_APPWRITE_STAFF_TRAINING_COLLECTION_ID,
  staffLicensesCollectionId: import.meta.env.VITE_APPWRITE_STAFF_LICENSES_COLLECTION_ID,
  complianceWizardCollectionId: import.meta.env.VITE_APPWRITE_COMPLIANCE_WIZARD_COLLECTION_ID,
  staffGradesCollectionId: import.meta.env.VITE_APPWRITE_STAFF_GRADES_COLLECTION_ID,
  staffComplianceCollectionId: import.meta.env.VITE_APPWRITE_STAFF_COMPLIANCE_COLLECTION_ID,
};

export const DATABASE_ID = databaseId;
export const SHIFTS_COLLECTION_ID = config.shiftsCollectionId;
export const APPLICATIONS_COLLECTION_ID = config.applicationsCollectionId;
