const COS_PUBLIC_ORIGIN = 'https://eva-fonts-prod-assets-1302538683.cos.ap-guangzhou.myqcloud.com/public';

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxyPublicObject(request: Request, context: RouteContext, method: 'GET' | 'HEAD') {
  const { path } = await context.params;
  if (!path?.length || path.some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\'))) {
    return new Response('Invalid public object path', { status: 400 });
  }
  const objectPath = path.map((segment) => encodeURIComponent(segment)).join('/');
  const upstreamHeaders = new Headers();
  const range = request.headers.get('range');
  if (range) upstreamHeaders.set('range', range);
  const upstream = await fetch(`${COS_PUBLIC_ORIGIN}/${objectPath}`, { method, headers: upstreamHeaders });
  const headers = new Headers();
  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  headers.set('Cache-Control', objectPath.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
  return new Response(method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers });
}

export function GET(request: Request, context: RouteContext) { return proxyPublicObject(request, context, 'GET'); }
export function HEAD(request: Request, context: RouteContext) { return proxyPublicObject(request, context, 'HEAD'); }
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Max-Age': '86400',
    },
  });
}
