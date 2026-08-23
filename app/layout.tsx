import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://font.evainc.cn'),
  title: 'Eva Font Registry',
  description: 'Eva Inc. 字体资产、授权审核与 Web 发布注册中心。',
  openGraph: {
    title: 'Eva Font Registry',
    description: '原件私有，发布可控。',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Eva Font Registry' }],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
