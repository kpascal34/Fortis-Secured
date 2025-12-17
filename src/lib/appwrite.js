import { Client, Account, Databases } from 'appwrite';

// Environment variables with fallbacks
const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || 'demo-project';
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'demo-database';

// Demo mode flag
const isDemoMode = import.meta.env.VITE_ENABLE_DEMO_MODE !== 'false';

const client = new Client();

// Only initialize Appwrite if valid credentials are provided and not in demo mode
if (endpoint && projectId && !isDemoMode) {
  try {
    client.setEndpoint(endpoint).setProject(projectId);
  } catch (error) {
    console.warn('Appwrite initialization failed, running in demo mode:', error);
  }
}

export const account = !isDemoMode ? new Account(client) : null;
export const databases = !isDemoMode ? new Databases(client) : null;

export const config = {
  endpoint,
  projectId,
  databaseId,
  isDemoMode,
  clientsCollectionId: import.meta.env.VITE_APPWRITE_CLIENTS_COLLECTION_ID,
  guardsCollectionId: import.meta.env.VITE_APPWRITE_GUARDS_COLLECTION_ID,
  sitesCollectionId: import.meta.env.VITE_APPWRITE_SITES_COLLECTION_ID,
  postsCollectionId: import.meta.env.VITE_APPWRITE_POSTS_COLLECTION_ID,
  shiftsCollectionId: import.meta.env.VITE_APPWRITE_SHIFTS_COLLECTION_ID,
  shiftAssignmentsCollectionId: import.meta.env.VITE_APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID,
  incidentsCollectionId: import.meta.env.VITE_APPWRITE_INCIDENTS_COLLECTION_ID,
  assetsCollectionId: import.meta.env.VITE_APPWRITE_ASSETS_COLLECTION_ID,
};
