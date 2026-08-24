export const COS_ORIGIN = 'https://eva-fonts-prod-assets-1302538683.cos.ap-guangzhou.myqcloud.com';

export async function proxyPublic(pathname) {
  if (!pathname.startsWith('/public/') || pathname.includes('..')) return new Response('Not found', { status: 404 });
  const upstream = await fetch(`${COS_ORIGIN}${pathname}`);
  const headers = new Headers();
  for (const name of ['content-type', 'content-length', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  headers.set('Cache-Control', pathname.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
  return new Response(upstream.body, { status: upstream.status, headers });
}
