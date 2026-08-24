import { proxyPublic } from '../_lib/cos.js';
export function onRequest({ request }) { return proxyPublic(new URL(request.url).pathname); }
