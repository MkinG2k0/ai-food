import type { Metadata } from 'next';

import { AdminProviders } from '@/components/AdminProviders';
import { AdminShell } from '@/components/AdminShell';

export const metadata: Metadata = {
  title: 'Админ',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminProviders>
      <AdminShell>{children}</AdminShell>
    </AdminProviders>
  );
}
