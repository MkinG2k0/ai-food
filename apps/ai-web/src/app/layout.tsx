import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { DM_Sans, Fraunces } from 'next/font/google';

import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-lp-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-lp-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI Food — калории и БЖУ по фото',
  description:
    'AI Food анализирует еду по фото: калории, белки, жиры и углеводы за секунды. Веб и RuStore.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
