import { Client, Account, Databases } from 'appwrite';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

const client = new Client();

if (endpoint && projectId) {
  client.setEndpoint(endpoint).setProject(projectId);
}

export const account = new Account(client);
export const databases = new Databases(client);

export const config = {
  endpoint,
  projectId,
  databaseId,
  incidentsCollectionId: import.meta.env.VITE_APPWRITE_INCIDENTS_COLLECTION_ID,
  assetsCollectionId: import.meta.env.VITE_APPWRITE_ASSETS_COLLECTION_ID,
  shiftsCollectionId: import.meta.env.VITE_APPWRITE_SHIFTS_COLLECTION_ID,
};
