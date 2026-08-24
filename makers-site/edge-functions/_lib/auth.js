const encoder = new TextEncoder();
const SESSION_SECONDS = 12 * 60 * 60;

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signature(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

export function allowedUser(identifier) {
  const id = String(identifier || '').trim().toLowerCase();
  if (id === 'wxd') return { id, role: 'owner' };
  if (id === 'lyn') return { id, role: 'editor' };
  return null;
}

export async function createSession(user, secret) {
  const payload = base64Url(encoder.encode(JSON.stringify({ sub: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })));
  return `${payload}.${await signature(payload, secret)}`;
}

export async function readSession(request, secret) {
  if (!secret) return null;
  const cookie = request.headers.get('cookie') || '';
  const token = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('eva_font_session='))?.slice('eva_font_session='.length);
  if (!token) return null;
  const [payload, sentSignature, extra] = token.split('.');
  if (!payload || !sentSignature || extra) return null;
  if (!safeEqual(sentSignature, await signature(payload, secret))) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)));
    const user = allowedUser(data.sub);
    return user && user.role === data.role && Number(data.exp) > Math.floor(Date.now() / 1000) ? user : null;
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  return `eva_font_session=${token}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return 'eva_font_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax';
}

export function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}
