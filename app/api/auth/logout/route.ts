import { NextResponse } from 'next/server';
import { clearSessionCookie, revokeCurrentSession } from '@/app/lib/registry-auth';

export async function POST(request: Request) {
  await revokeCurrentSession();
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response, new URL(request.url).protocol === 'https:');
  return response;
}
