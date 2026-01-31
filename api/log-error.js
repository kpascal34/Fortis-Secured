// Vercel Serverless Function: POST /api/log-error
// Used by the frontend error boundary to report client-side crashes.
// Keep this intentionally lightweight (no secrets, no PII).

export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(204).end();
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Vercel parses JSON automatically when Content-Type is application/json
    const payload = req.body || {};

    // Minimal logging (visible in Vercel Function Logs)
    // Avoid logging full stack traces if they might contain PII.
    const safe = {
      message: payload?.message,
      name: payload?.name,
      route: payload?.route,
      timestamp: payload?.timestamp || new Date().toISOString(),
    };

    // eslint-disable-next-line no-console
    console.warn('[client-error]', JSON.stringify(safe));

    return res.status(204).end();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('log-error handler failed:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
