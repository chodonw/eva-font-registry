import { allowedUser, createSession, json, sessionCookie } from '../../_lib/auth.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ detail: 'Method not allowed' }, 405, { Allow: 'POST' });
  if (!env.EVA_SESSION_SECRET) return json({ detail: '登录服务尚未配置' }, 503);
  const payload = await request.json().catch(() => ({}));
  const identifier = String(payload.identifier || '').trim().toLowerCase();
  const code = String(payload.code || '').trim();
  const user = allowedUser(identifier);
  if (!user) return json({ detail: '无权限' }, 403);
  if (!/^\d{6}$/.test(code)) return json({ detail: '请输入 6 位验证码' }, 400);
  const upstream = await fetch(`${env.EVA_AUTH_BASE_URL || 'https://design.evainc.cn'}/eva-auth/penpot-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, code })
  });
  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return json({ detail: result.detail || '验证码无效或已过期' }, upstream.status);
  const session = await createSession(user, env.EVA_SESSION_SECRET);
  return json({ ok: true, user }, 200, { 'Set-Cookie': sessionCookie(session) });
}
