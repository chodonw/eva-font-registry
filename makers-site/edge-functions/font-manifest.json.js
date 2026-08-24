import { proxyPublic } from './_lib/cos.js';
export function onRequest() { return proxyPublic('/public/font-manifest.json'); }
