import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SESSION_COOKIE = 'eva_font_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const ALLOWED_IDS = new Set(['wxd', 'lyn']);

export type RegistryUser = { id: 'wxd' | 'lyn'; role: 'owner' | 'editor' };

export async function ensureRegistrySchema() {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS registry_users (id TEXT PRIMARY KEY, role TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS registry_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES registry_users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_registry_sessions_user ON registry_sessions(user_id)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_registry_sessions_expiry ON registry_sessions(expires_at)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, actor_id TEXT REFERENCES registry_users(id), action TEXT NOT NULL, subject_id TEXT, detail TEXT, created_at INTEGER NOT NULL)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at)'),
    env.DB.prepare('INSERT OR IGNORE INTO registry_users (id, role, enabled, created_at, updated_at) VALUES (?, ?, 1, ?, ?)').bind('wxd', 'owner', now, now),
    env.DB.prepare('INSERT OR IGNORE INTO registry_users (id, role, enabled, created_at, updated_at) VALUES (?, ?, 1, ?, ?)').bind('lyn', 'editor', now, now),
  ]);
}

export async function resolveAllowedEvaId(identifier: string): Promise<RegistryUser['id'] | null> {
  const normalized = identifier.trim().toLowerCase();
  if (ALLOWED_IDS.has(normalized)) return normalized as RegistryUser['id'];
  if (!/^\+?\d{6,20}$/.test(normalized)) return null;
  const digest = await sha256Hex(normalized);
  if (env.EVA_WXD_PHONE_SHA256 && timingSafeEqual(digest, env.EVA_WXD_PHONE_SHA256.toLowerCase())) return 'wxd';
  if (env.EVA_LYN_PHONE_SHA256 && timingSafeEqual(digest, env.EVA_LYN_PHONE_SHA256.toLowerCase())) return 'lyn';
  return null;
}

export function evaAuthBaseUrl() { return (env.EVA_AUTH_BASE_URL || 'https://design.evainc.cn').replace(/\/$/, ''); }
export function evaOtpApplication() { return env.EVA_OTP_APPLICATION || 'penpot'; }

export async function createRegistrySession(userId: RegistryUser['id']) {
  await ensureRegistrySchema();
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_TTL_SECONDS;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM registry_sessions WHERE expires_at <= ?').bind(now),
    env.DB.prepare('INSERT INTO registry_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(tokenHash, userId, expiresAt, now),
    env.DB.prepare('INSERT INTO audit_events (id, actor_id, action, subject_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), userId, 'auth.login', userId, null, now),
  ]);
  return { token, maxAge: SESSION_TTL_SECONDS };
}

export async function getRegistryUser(): Promise<RegistryUser | null> {
  await ensureRegistrySchema();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT u.id, u.role FROM registry_sessions s JOIN registry_users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.enabled = 1 LIMIT 1').bind(tokenHash, now).first<{ id: RegistryUser['id']; role: RegistryUser['role'] }>();
  return row ? { id: row.id, role: row.role } : null;
}

export async function requireRegistryUser(returnTo = '/admin') {
  const user = await getRegistryUser();
  if (user) return user;
  redirect(`/login?returnTo=${encodeURIComponent(returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/admin')}`);
}

export async function revokeCurrentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return;
  await ensureRegistrySchema();
  await env.DB.prepare('DELETE FROM registry_sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
}

export function setSessionCookie(response: Response, token: string, maxAge: number, secure = true) {
  response.headers.append('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax; Max-Age=${maxAge}`);
}
export function clearSessionCookie(response: Response, secure = true) {
  response.headers.append('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax; Max-Age=0`);
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
