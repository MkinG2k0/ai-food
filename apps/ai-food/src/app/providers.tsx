import { type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AnalyzeJobsResume } from '@/features/save-meal';
import { AppDebugBridge } from '@/features/debug';
import { queryClient } from '@/shared/lib';
import { DiarySyncOnAuthHydrate } from './DiarySyncOnAuthHydrate';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AnalyzeJobsResume />
      <AppDebugBridge />
      <DiarySyncOnAuthHydrate />
      {children}
      <Toaster
        position="top-center"
        richColors
        offset={{ top: 'max(1rem, env(safe-area-inset-top))' }}
        mobileOffset={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      />
    </QueryClientProvider>
  );
}
