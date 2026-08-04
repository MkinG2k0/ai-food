import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';

import './globals.css';

export const metadata: Metadata = {
  title: 'AI Food',
  description: 'AI Food — умный помощник по питанию',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
