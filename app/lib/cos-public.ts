const COS_PUBLIC_ORIGIN = 'https://eva-fonts-prod-assets-1302538683.cos.ap-guangzhou.myqcloud.com/public';

export async function proxyCosPublicObject(request: Request, objectPath: string, method: 'GET' | 'HEAD' = 'GET') {
  const segments = objectPath.split('/');
  if (!segments.length || segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\'))) {
    return new Response('Invalid public object path', { status: 400 });
  }
  const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join('/');
  const upstreamHeaders = new Headers();
  const range = request.headers.get('range');
  if (range) upstreamHeaders.set('range', range);
  const upstream = await fetch(`${COS_PUBLIC_ORIGIN}/${encodedPath}`, { method, headers: upstreamHeaders });
  const headers = new Headers();
  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  headers.set('Cache-Control', encodedPath.endsWith('.woff2') ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
  return new Response(method === 'HEAD' ? null : upstream.body, { status: upstream.status, headers });
}

export function publicCorsOptions() {
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
