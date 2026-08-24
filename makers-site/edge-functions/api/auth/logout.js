import { clearSessionCookie, json } from '../../_lib/auth.js';

export function onRequest({ request }) {
  if (request.method !== 'POST') return json({ detail: 'Method not allowed' }, 405, { Allow: 'POST' });
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}
