// Shared CORS helper for Vercel serverless functions
// Usage: import { cors } from './_cors.js';
//        if (cors(req, res)) return; // handles OPTIONS preflight

const ALLOWED_ORIGINS = [
  'https://fortissecured.co.uk',
  'https://www.fortissecured.co.uk',
  'https://fortissecured.com',
  'https://www.fortissecured.com',
];

// In development, allow localhost origins
if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173');
}

export function cors(req, res) {
  const origin = req.headers?.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Notify-Secret');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}
