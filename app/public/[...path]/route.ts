import { proxyCosPublicObject, publicCorsOptions } from '@/app/lib/cos-public';

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxyPublicObject(request: Request, context: RouteContext, method: 'GET' | 'HEAD') {
  const { path } = await context.params;
  if (!path?.length) {
    return new Response('Invalid public object path', { status: 400 });
  }
  return proxyCosPublicObject(request, path.join('/'), method);
}

export function GET(request: Request, context: RouteContext) { return proxyPublicObject(request, context, 'GET'); }
export function HEAD(request: Request, context: RouteContext) { return proxyPublicObject(request, context, 'HEAD'); }
export function OPTIONS() { return publicCorsOptions(); }
