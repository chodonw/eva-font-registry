'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function sendCode() {
    if (!identifier.trim()) { setMessage('请输入 wxd 或 lyn'); return; }
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier }),
      });
      const result = await response.json() as { cooldown?: number; detail?: string };
      if (!response.ok) throw new Error(result.detail || '验证码发送失败');
      setCooldown(result.cooldown || 60);
      setMessage('验证码已发送到绑定手机');
    } catch (error) { setMessage(error instanceof Error ? error.message : '验证码发送失败'); }
    finally { setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) { setMessage('请输入 6 位验证码'); return; }
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, code }),
      });
      const result = await response.json() as { detail?: string };
      if (!response.ok) throw new Error(result.detail || '登录失败');
      const requested = searchParams.get('returnTo') || '/admin';
      router.replace(requested.startsWith('/') && !requested.startsWith('//') ? requested : '/admin');
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : '登录失败'); }
    finally { setBusy(false); }
  }

  return (
    <form className="login-form" onSubmit={verify}>
      <label>
        <span>Eva ID</span>
        <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" placeholder="wxd / lyn" disabled={busy || cooldown > 0} />
      </label>
      <label>
        <span>手机验证码</span>
        <span className="otp-field">
          <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6 位数字" />
          <button type="button" onClick={sendCode} disabled={busy || cooldown > 0}>{cooldown > 0 ? `${cooldown}s` : '发送验证码'}</button>
        </span>
      </label>
      <button className="primary-button" type="submit" disabled={busy}>{busy ? '验证中…' : '验证并进入'}</button>
      <p className="form-message" aria-live="polite">{message || '验证码由 design.evainc.cn 的 Eva ID 服务发送与校验。'}</p>
    </form>
  );
}
