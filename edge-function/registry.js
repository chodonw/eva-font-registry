const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_SECONDS = 12 * 60 * 60;
const SESSION_COOKIE = 'eva_font_session';

const STATIC_FILES = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/login', 'login.html'],
  ['/login.html', 'login.html'],
  ['/admin', 'admin.html'],
  ['/admin.html', 'admin.html'],
  ['/styles.css', 'styles.css'],
  ['/site.js', 'site.js'],
  ['/login.js', 'login.js'],
  ['/admin.js', 'admin.js'],
  ['/og.svg', 'og.svg'],
]);

function runtimeEnv() {
  return typeof env === 'object' && env ? env : {};
}

function setting(name, fallback = '') {
  const value = runtimeEnv()[name];
  return typeof value === 'string' && value ? value : fallback;
}

function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function text(payload, status = 200, extraHeaders = {}) {
  return new Response(payload, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function methodNotAllowed(allow) {
  return json({ detail: 'Method not allowed' }, 405, { Allow: allow });
}

function allowedUser(identifier) {
  const id = String(identifier || '').trim().toLowerCase();
  if (id === 'wxd') return { id, role: 'owner' };
  if (id === 'lyn') return { id, role: 'editor' };
  return null;
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function signature(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function createSession(user, secret) {
  const payload = base64Url(encoder.encode(JSON.stringify({
    sub: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })));
  return `${payload}.${await signature(payload, secret)}`;
}

function cookieValue(request, name) {
  const cookie = request.headers.get('cookie') || '';
  const prefix = `${name}=`;
  const match = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return match ? match.slice(prefix.length) : '';
}

async function readSession(request, secret) {
  if (!secret) return null;
  const token = cookieValue(request, SESSION_COOKIE);
  const [payload, sentSignature, extra] = token.split('.');
  if (!payload || !sentSignature || extra) return null;
  if (!safeEqual(sentSignature, await signature(payload, secret))) return null;

  try {
    const data = JSON.parse(decoder.decode(decodeBase64Url(payload)));
    const user = allowedUser(data.sub);
    if (!user || user.role !== data.role || Number(data.exp) <= Math.floor(Date.now() / 1000)) return null;
    return user;
  } catch {
    return null;
  }
}

function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

async function readJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) return null;
  return request.json().catch(() => null);
}

async function sendCode(request) {
  if (request.method !== 'POST') return methodNotAllowed('POST');
  if (!sameOrigin(request)) return json({ detail: 'Invalid origin' }, 403);
  const payload = await readJson(request);
  if (!payload) return json({ detail: 'Invalid JSON request' }, 400);
  const identifier = String(payload.identifier || '').trim().toLowerCase();
  if (!allowedUser(identifier)) return json({ detail: '无权限' }, 403);

  const baseUrl = setting('EVA_AUTH_BASE_URL', 'https://design.evainc.cn').replace(/\/$/, '');
  const upstream = await fetch(`${baseUrl}/eva-auth/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, application: setting('EVA_OTP_APPLICATION', 'penpot') }),
  });
  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return json({ detail: result.detail || '验证码发送失败' }, upstream.status);
  return json({ cooldown: Number(result.cooldown) || 60 });
}

async function verifyCode(request) {
  if (request.method !== 'POST') return methodNotAllowed('POST');
  if (!sameOrigin(request)) return json({ detail: 'Invalid origin' }, 403);
  const secret = setting('EVA_SESSION_SECRET');
  if (!secret) return json({ detail: '登录服务尚未配置' }, 503);
  const payload = await readJson(request);
  if (!payload) return json({ detail: 'Invalid JSON request' }, 400);

  const identifier = String(payload.identifier || '').trim().toLowerCase();
  const code = String(payload.code || '').trim();
  const user = allowedUser(identifier);
  if (!user) return json({ detail: '无权限' }, 403);
  if (!/^\d{6}$/.test(code)) return json({ detail: '请输入 6 位验证码' }, 400);

  const baseUrl = setting('EVA_AUTH_BASE_URL', 'https://design.evainc.cn').replace(/\/$/, '');
  const upstream = await fetch(`${baseUrl}/eva-auth/penpot-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, code }),
  });
  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return json({ detail: result.detail || '验证码无效或已过期' }, upstream.status);

  const token = await createSession(user, secret);
  return json({ ok: true, user }, 200, { 'Set-Cookie': sessionCookie(token) });
}

async function currentUser(request) {
  if (request.method !== 'GET') return methodNotAllowed('GET');
  const user = await readSession(request, setting('EVA_SESSION_SECRET'));
  return user ? json({ user }) : json({ detail: '未登录' }, 401);
}

function logout(request) {
  if (request.method !== 'POST') return methodNotAllowed('POST');
  if (!sameOrigin(request)) return json({ detail: 'Invalid origin' }, 403);
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}

function proxyHeaders(upstream, cacheControl, cors = false) {
  const headers = new Headers();
  for (const name of [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'etag',
    'last-modified',
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('Cache-Control', cacheControl);
  headers.set('X-Content-Type-Options', 'nosniff');
  if (cors) {
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
  return headers;
}

async function fetchCos(request, pathname, cacheControl, cors = false) {
  const origin = setting(
    'COS_ORIGIN',
    'https://eva-fonts-prod-assets-1302538683.cos.ap-guangzhou.myqcloud.com',
  ).replace(/\/$/, '');
  const headers = new Headers();
  for (const name of ['if-none-match', 'if-modified-since', 'range']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // COS's anonymous public-prefix policy accepts GET but rejects HEAD. Fetch
  // with GET at the origin and discard the body so HEAD consumers still work
  // without widening the bucket policy.
  const upstreamMethod = request.method === 'HEAD' ? 'GET' : request.method;
  const upstream = await fetch(`${origin}${pathname}`, {
    method: upstreamMethod,
    headers,
  });
  return new Response(request.method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    headers: proxyHeaders(upstream, cacheControl, cors),
  });
}

function safePublicPath(pathname) {
  const lower = pathname.toLowerCase();
  return pathname.startsWith('/public/') && !lower.includes('..') && !lower.includes('%2e');
}

async function publicAsset(request, pathname) {
  if (!['GET', 'HEAD'].includes(request.method)) return methodNotAllowed('GET, HEAD');
  if (!safePublicPath(pathname)) return text('Not found', 404);
  const immutable = pathname.endsWith('.woff2');
  return fetchCos(
    request,
    pathname,
    immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
    true,
  );
}

async function staticAsset(request, pathname) {
  if (!['GET', 'HEAD'].includes(request.method)) return methodNotAllowed('GET, HEAD');
  const file = STATIC_FILES.get(pathname);
  if (!file) return text('Not found', 404);
  const isHtml = file.endsWith('.html');
  return fetchCos(
    request,
    `/public/registry-site/${file}`,
    isHtml ? 'no-store' : 'public, max-age=300',
  );
}

async function handleRequest(request) {
  const { pathname } = new URL(request.url);

  if (pathname === '/api/auth/send-code') return sendCode(request);
  if (pathname === '/api/auth/verify') return verifyCode(request);
  if (pathname === '/api/auth/me') return currentUser(request);
  if (pathname === '/api/auth/logout') return logout(request);

  if (pathname === '/fonts.css') return publicAsset(request, '/public/fonts.css');
  if (pathname === '/font-manifest.json') return publicAsset(request, '/public/font-manifest.json');
  if (pathname.startsWith('/public/')) return publicAsset(request, pathname);
  if (pathname === '/raw' || pathname.startsWith('/raw/')) return text('Not found', 404);
  return staticAsset(request, pathname);
}

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request).catch(() => text('Service unavailable', 503)));
});
