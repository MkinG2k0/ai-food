import { type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AnalyzeJobsResume } from '@/features/save-meal';
import { AppDebugBridge } from '@/features/debug';
import { useThemeStore } from '@/features/settings';
import { isDarkResolved, queryClient } from '@/shared/lib';
import { DiarySyncOnAuthHydrate } from './DiarySyncOnAuthHydrate';
import { ThemeSync } from './ThemeSync';

function ThemedToaster() {
  const resolved = useThemeStore((s) => s.resolved);
  return (
    <Toaster
      theme={isDarkResolved(resolved) ? 'dark' : 'light'}
      position="top-center"
      richColors
      offset={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      mobileOffset={{ top: 'max(1rem, env(safe-area-inset-top))' }}
    />
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <AnalyzeJobsResume />
      <AppDebugBridge />
      <DiarySyncOnAuthHydrate />
      {children}
      <ThemedToaster />
    </QueryClientProvider>
  );
}
