import Link from 'next/link';

const candidates = [
  { family: 'Lato', sample: '字体让思想拥有声音。', styles: 18, status: '待授权复核', tone: 'review' },
  { family: 'Montserrat Alternates', sample: 'Build quietly. Ship clearly.', styles: 18, status: '待授权复核', tone: 'review' },
  { family: 'Source Han Serif', sample: '山川异域，风月同天。', styles: 7, status: '可进入构建', tone: 'ready' },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Eva Font Registry 首页">
          <span className="brand-mark" aria-hidden="true">e:</span>
          <span>Font Registry</span>
        </Link>
        <nav aria-label="主导航">
          <a className="nav-link active" href="#catalog">字体目录</a>
          <a className="nav-link" href="#pipeline">发布流程</a>
          <a className="login-link" href="/login">管理登录</a>
        </nav>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <p className="eyebrow">Eva Inc. · Typography Infrastructure</p>
          <h1 id="page-title">让每一个字体<br />都有清晰的去处。</h1>
          <p className="hero-intro">从 iCloud 原件、授权审核到 WOFF2 与小程序引用，在一个可追踪的字体注册中心完成。</p>
        </div>
        <div className="hero-status" aria-label="当前字体资产概况">
          <div><strong>1,298</strong><span>有效字体文件</span></div>
          <div><strong>1,579</strong><span>可识别字面</span></div>
          <div><strong>4.78 GB</strong><span>私有原始资产</span></div>
          <div><strong>0</strong><span>已公开字体</span></div>
        </div>
      </section>

      <section className="catalog" id="catalog" aria-labelledby="catalog-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2 id="catalog-title">字体候选目录</h2>
          </div>
          <label className="search-field">
            <span className="sr-only">搜索字体</span>
            <input type="search" placeholder="搜索字体、语言或标签" />
            <kbd>⌘ K</kbd>
          </label>
        </div>

        <div className="catalog-table" role="table" aria-label="待审核字体">
          <div className="table-row table-head" role="row">
            <span role="columnheader">字体与预览</span>
            <span role="columnheader">字面</span>
            <span role="columnheader">状态</span>
          </div>
          {candidates.map((font) => (
            <article className="table-row font-row" role="row" key={font.family}>
              <div role="cell">
                <span className="font-name">{font.family}</span>
                <p className="font-sample">{font.sample}</p>
              </div>
              <span className="style-count" role="cell">{font.styles}</span>
              <span className={`status-pill ${font.tone}`} role="cell">{font.status}</span>
            </article>
          ))}
        </div>
        <p className="catalog-note">目录当前只展示审核候选。字体通过授权确认与构建检查后，才会生成公开 CSS 和下载地址。</p>
      </section>

      <section className="pipeline" id="pipeline" aria-labelledby="pipeline-title">
        <div>
          <p className="eyebrow">Controlled release</p>
          <h2 id="pipeline-title">原件私有，发布可控。</h2>
        </div>
        <ol>
          <li><span>01</span><div><strong>Raw archive</strong><p>原始文件进入 COS 私有 raw/，保留目录与校验值。</p></div></li>
          <li><span>02</span><div><strong>License review</strong><p>人工确认授权范围，商业字体默认不公开。</p></div></li>
          <li><span>03</span><div><strong>Web build</strong><p>生成 WOFF2、字符子集、CSS 与微信小程序配置。</p></div></li>
          <li><span>04</span><div><strong>Public release</strong><p>仅发布到 public/*，其余对象继续保持私有。</p></div></li>
        </ol>
      </section>

      <footer><span>Eva Font Registry</span><span>font.evainc.cn</span></footer>
    </main>
  );
}
