import { requireRegistryUser } from '@/app/lib/registry-auth';
import Link from 'next/link';
import LogoutButton from './logout-button';

const stages = [
  ['Raw archive', '1,399 个文件正在写入 COS raw/icloud-fonts/'],
  ['License review', '默认待复核；只允许明确授权的字体继续'],
  ['WOFF2 build', 'FontTools 转换，FontBakery 质量门禁'],
  ['Public release', '审批后才写入 public/* 并生成 CSS'],
];

export default async function AdminPage() {
  const user = await requireRegistryUser();
  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand" href="/"><span className="brand-mark">e:</span><span>Font Registry</span></Link>
        <nav className="admin-nav" aria-label="后台导航">
          <a className="active" href="#overview">概览</a>
          <a href="#pipeline">发布流水线</a>
          <a href="/font-manifest.json">公开清单</a>
          <a href="/fonts.css">Web CSS</a>
        </nav>
        <div className="admin-user">
          <span className="user-avatar">{user.id.slice(0, 1).toUpperCase()}</span>
          <span><strong>{user.id}</strong><small>{user.role}</small></span>
          <LogoutButton />
        </div>
      </aside>
      <section className="admin-content">
        <header className="admin-heading" id="overview">
          <div><p className="eyebrow">Private console</p><h1>字体资产概览</h1></div>
          <span className="system-status"><i /> 私有 bucket 正常</span>
        </header>
        <div className="metric-grid">
          <article><span>原始文件</span><strong>1,399</strong><small>4.45 GiB · raw 私有</small></article>
          <article><span>有效字体</span><strong>1,298</strong><small>1,579 个可识别字面</small></article>
          <article><span>开放授权信号</span><strong>255</strong><small>仍需人工确认</small></article>
          <article><span>公开字体</span><strong>0</strong><small>未正式发布</small></article>
        </div>
        <section className="admin-pipeline" id="pipeline">
          <div className="admin-section-title"><div><p className="eyebrow">Release guard</p><h2>发布流水线</h2></div><span>审批优先</span></div>
          <div className="stage-list">
            {stages.map((stage, index) => <article key={stage[0]}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{stage[0]}</strong><p>{stage[1]}</p></div><i className={index === 0 ? 'running' : ''}>{index === 0 ? '上传中' : '待处理'}</i></article>)}
          </div>
        </section>
      </section>
    </main>
  );
}
