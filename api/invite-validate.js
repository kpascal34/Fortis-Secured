// Serverless: Validate staff invite code securely on server
// POST JSON: { code }
// Response: { ok: true, invite: { invite_code, email, expires_at, status, used_by } }

import { Client, Databases, Query } from 'node-appwrite';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string' || code.length !== 32) {
      return res.status(400).json({ error: 'Invalid invite code' });
    }

    const endpoint = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID;

    if (!endpoint || !projectId || !apiKey || !databaseId) {
      return res.status(500).json({ error: 'Missing Appwrite configuration' });
    }

    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new Databases(client);

    const invites = await databases.listDocuments(databaseId, 'staff_invites', [
      Query.equal('invite_code', code),
    ]);

    if (invites.total === 0) {
      return res.status(404).json({ error: 'Invite code not found' });
    }

    const invite = invites.documents[0];

    if (invite.status !== 'active') {
      return res.status(400).json({ error: `Invite is ${invite.status}` });
    }

    if (new Date(invite.expires_at) < new Date()) {
      await databases.updateDocument(databaseId, 'staff_invites', invite.$id, { status: 'expired' });
      return res.status(400).json({ error: 'Invite has expired' });
    }

    return res.status(200).json({ ok: true, invite: {
      invite_code: invite.invite_code,
      email: invite.email,
      expires_at: invite.expires_at,
      status: invite.status,
      used_by: invite.used_by || null,
      $id: invite.$id,
    }});
  } catch (err) {
    console.error('invite-validate error:', err);
    return res.status(500).json({ error: err.message || 'Validation failed' });
  }
}
