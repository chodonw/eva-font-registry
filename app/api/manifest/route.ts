import { proxyCosPublicObject } from '@/app/lib/cos-public';

export function GET(request: Request) { return proxyCosPublicObject(request, 'font-manifest.json'); }
