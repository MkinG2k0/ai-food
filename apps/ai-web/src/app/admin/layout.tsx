import { AdminProviders } from '@/components/AdminProviders';
import { AdminShell } from '@/components/AdminShell';

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminProviders>
      <AdminShell>{children}</AdminShell>
    </AdminProviders>
  );
}
