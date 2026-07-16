import { useEffect, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { recoverStaleAnalyzingMeals, useDiaryStore } from '@/entities/meal';
import { queryClient } from '@/shared/lib';

function DiaryStaleAnalyzingRecovery() {
  useEffect(() => {
    const run = () => {
      recoverStaleAnalyzingMeals();
    };
    const unsub = useDiaryStore.persist.onFinishHydration(run);
    if (useDiaryStore.persist.hasHydrated()) {
      run();
    }
    return unsub;
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DiaryStaleAnalyzingRecovery />
      {children}
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
