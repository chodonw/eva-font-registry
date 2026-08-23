import { NextResponse } from 'next/server';
import { evaAuthBaseUrl, evaOtpApplication, resolveAllowedEvaId } from '@/app/lib/registry-auth';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as { identifier?: string } | null;
  const identifier = payload?.identifier?.trim() || '';
  if (!identifier || !(await resolveAllowedEvaId(identifier))) return NextResponse.json({ detail: '无权限' }, { status: 403 });
  const upstream = await fetch(`${evaAuthBaseUrl()}/eva-auth/send-code`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, application: evaOtpApplication() }),
  });
  const result = await upstream.json().catch(() => ({})) as { cooldown?: number; detail?: string };
  if (!upstream.ok) return NextResponse.json({ detail: result.detail || '验证码发送失败' }, { status: upstream.status });
  return NextResponse.json({ cooldown: Number(result.cooldown) || 60 });
}
