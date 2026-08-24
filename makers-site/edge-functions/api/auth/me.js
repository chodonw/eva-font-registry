import { json, readSession } from '../../_lib/auth.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') return json({ detail: 'Method not allowed' }, 405, { Allow: 'GET' });
  const user = await readSession(request, env.EVA_SESSION_SECRET);
  return user ? json({ user }) : json({ detail: '未登录' }, 401);
}
