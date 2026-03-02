import { Client, Account, Databases, Storage } from 'appwrite';
import { config } from './config.js';

const client = new Client();
const canInitClient = Boolean(config.endpoint && config.projectId && !config.isDemoMode);

if (canInitClient) {
  client.setEndpoint(config.endpoint).setProject(config.projectId);
}

export const account = canInitClient ? new Account(client) : null;
export const databases = canInitClient ? new Databases(client) : null;
export const storage = canInitClient ? new Storage(client) : null;

export { config };

export const DATABASE_ID = config.databaseId;
export const SHIFTS_COLLECTION_ID = config.shiftsCollectionId;
export const APPLICATIONS_COLLECTION_ID = config.applicationsCollectionId;
