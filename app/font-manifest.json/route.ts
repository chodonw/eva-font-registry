import { proxyCosPublicObject, publicCorsOptions } from '@/app/lib/cos-public';

export function GET(request: Request) { return proxyCosPublicObject(request, 'font-manifest.json'); }
export function HEAD(request: Request) { return proxyCosPublicObject(request, 'font-manifest.json', 'HEAD'); }
export function OPTIONS() { return publicCorsOptions(); }
