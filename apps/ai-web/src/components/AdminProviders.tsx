'use client';

import { useState } from 'react';
import { App, ConfigProvider, theme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={ruRU} theme={{ algorithm: theme.darkAlgorithm }}>
        <App className="admin-app">{children}</App>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
