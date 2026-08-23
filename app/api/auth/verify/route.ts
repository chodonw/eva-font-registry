import { NextResponse } from 'next/server';
import { createRegistrySession, evaAuthBaseUrl, resolveAllowedEvaId, setSessionCookie } from '@/app/lib/registry-auth';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as { identifier?: string; code?: string } | null;
  const identifier = payload?.identifier?.trim() || '';
  const code = payload?.code?.trim() || '';
  const userId = await resolveAllowedEvaId(identifier);
  if (!userId) return NextResponse.json({ detail: '无权限' }, { status: 403 });
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ detail: '请输入 6 位验证码' }, { status: 400 });
  const upstream = await fetch(`${evaAuthBaseUrl()}/eva-auth/penpot-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, code }),
  });
  if (!upstream.ok) {
    const result = await upstream.json().catch(() => ({})) as { detail?: string };
    return NextResponse.json({ detail: result.detail || '验证码无效或已过期' }, { status: upstream.status });
  }
  const session = await createRegistrySession(userId);
  const response = NextResponse.json({ ok: true, user: { id: userId } });
  setSessionCookie(response, session.token, session.maxAge, new URL(request.url).protocol === 'https:');
  return response;
}
