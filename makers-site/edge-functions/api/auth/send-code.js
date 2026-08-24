import { allowedUser, json } from '../../_lib/auth.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ detail: 'Method not allowed' }, 405, { Allow: 'POST' });
  const payload = await request.json().catch(() => ({}));
  const identifier = String(payload.identifier || '').trim().toLowerCase();
  if (!allowedUser(identifier)) return json({ detail: '无权限' }, 403);
  const upstream = await fetch(`${env.EVA_AUTH_BASE_URL || 'https://design.evainc.cn'}/eva-auth/send-code`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, application: env.EVA_OTP_APPLICATION || 'penpot' })
  });
  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return json({ detail: result.detail || '验证码发送失败' }, upstream.status);
  return json({ cooldown: Number(result.cooldown) || 60 });
}
