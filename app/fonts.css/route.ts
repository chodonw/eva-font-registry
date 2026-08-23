import { proxyCosPublicObject, publicCorsOptions } from '@/app/lib/cos-public';

export function GET(request: Request) { return proxyCosPublicObject(request, 'fonts.css'); }
export function HEAD(request: Request) { return proxyCosPublicObject(request, 'fonts.css', 'HEAD'); }
export function OPTIONS() { return publicCorsOptions(); }
