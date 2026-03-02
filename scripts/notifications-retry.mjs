#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { Client, Databases, Query } from 'node-appwrite';

const PAGE_SIZE = 50;
const MAX_ATTEMPTS = 3;

loadDotenv();

const env = {
  endpoint: process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID,
  outboxCollectionId:
    process.env.APPWRITE_NOTIFICATION_OUTBOX_COLLECTION_ID ||
    process.env.VITE_APPWRITE_NOTIFICATION_OUTBOX_COLLECTION_ID ||
    'notification_outbox',
  notifySecret: process.env.NOTIFY_SECRET,
  notifyUrl: process.env.NOTIFY_URL || (process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, '')}/api/notify` : ''),
};

validateEnv(env);

const client = new Client().setEndpoint(env.endpoint).setProject(env.projectId).setKey(env.apiKey);
const databases = new Databases(client);

(async () => {
  const pendingDocs = await listRetryCandidates();

  if (pendingDocs.length === 0) {
    console.log('No pending/failed outbox notifications eligible for retry.');
    return;
  }

  console.log(`Found ${pendingDocs.length} outbox notifications to retry.`);

  let sent = 0;
  let failed = 0;

  for (const doc of pendingDocs) {
    try {
      const response = await fetch(env.notifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-notify-secret': env.notifySecret,
        },
        body: JSON.stringify({ outboxId: doc.$id }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`notify API returned ${response.status}: ${body}`);
      }

      sent += 1;
      console.log(`✓ retried ${doc.$id}`);
    } catch (error) {
      failed += 1;
      console.error(`✗ failed ${doc.$id}: ${error.message || String(error)}`);
    }
  }

  console.log('\nRetry summary');
  console.table([{ attempted: pendingDocs.length, sent, failed }]);

  if (failed > 0) {
    process.exit(1);
  }
})();

async function listRetryCandidates() {
  const all = [];
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments(env.databaseId, env.outboxCollectionId, [
      Query.equal('status', ['pending', 'failed']),
      Query.lessThan('attempts', MAX_ATTEMPTS),
      Query.orderAsc('createdAt'),
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
    ]);

    all.push(...response.documents);

    if (response.documents.length < PAGE_SIZE) break;
    if (response.total && all.length >= response.total) break;

    offset += PAGE_SIZE;
  }

  return all;
}

function loadDotenv() {
  const files = ['.env.local', '.env.production', '.env.development', '.env'];
  for (const file of files) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: false });
    }
  }
}

function validateEnv(envValues) {
  const missing = [];
  if (!envValues.endpoint) missing.push('APPWRITE_ENDPOINT');
  if (!envValues.projectId) missing.push('APPWRITE_PROJECT_ID');
  if (!envValues.apiKey) missing.push('APPWRITE_API_KEY');
  if (!envValues.databaseId) missing.push('APPWRITE_DATABASE_ID');
  if (!envValues.notifySecret) missing.push('NOTIFY_SECRET');
  if (!envValues.notifyUrl) missing.push('NOTIFY_URL (or APP_URL)');

  if (missing.length > 0) {
    console.error('Missing required environment variables for notifications retry:');
    for (const key of missing) {
      console.error(`- ${key}`);
    }
    process.exit(1);
  }
}
