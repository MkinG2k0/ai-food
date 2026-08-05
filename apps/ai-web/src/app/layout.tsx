import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Lora, Manrope } from 'next/font/google';

import './globals.css';

const lora = Lora({
  subsets: ['cyrillic', 'latin', 'latin-ext'],
  variable: '--font-lp-display',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['cyrillic', 'latin', 'latin-ext'],
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
    <html lang="ru" className={`${lora.variable} ${manrope.variable}`}>
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
