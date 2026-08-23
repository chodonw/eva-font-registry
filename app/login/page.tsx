import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getRegistryUser } from '@/app/lib/registry-auth';
import LoginForm from './login-form';

export default async function LoginPage() {
  if (await getRegistryUser()) redirect('/admin');
  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <Link className="brand auth-brand" href="/" aria-label="返回 Eva Font Registry 首页">
          <span className="brand-mark" aria-hidden="true">e:</span>
          <span>Font Registry</span>
        </Link>
        <div>
          <p className="eyebrow">Eva ID access</p>
          <h1>字体发布的<br />最后一道门。</h1>
          <p>沿用 design.evainc.cn 的 Eva ID 与手机验证码。本站只建立独立的 12 小时管理会话。</p>
        </div>
        <p className="auth-footnote">仅 wxd 与 lyn 可登录 · 原始字体不会从后台公开下载</p>
      </section>
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-card">
          <p className="auth-step">01 / 02</p>
          <h2 id="login-title">管理登录</h2>
          <p className="auth-help">输入 Eva ID。验证码将发到该 ID 当前绑定的手机号。</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
