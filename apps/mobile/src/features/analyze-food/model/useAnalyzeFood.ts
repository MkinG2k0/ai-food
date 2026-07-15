import { useQuery } from '@tanstack/react-query';
import type { AnalyzeFoodResponse } from '@ai-food/shared-types';
import { useSettingsStore } from '@/features/settings';
import { analyzeFoodApi } from '../api/analyzeFoodApi';

export function useAnalyzeFood(image: File | null) {
  const customInstructions = useSettingsStore((s) => s.customInstructions);

  return useQuery<AnalyzeFoodResponse, Error>({
    queryKey: [
      'analyze-food',
      image?.name,
      image?.size,
      image?.lastModified,
      customInstructions,
    ],
    queryFn: () =>
      analyzeFoodApi(image!, { customInstructions }),
    enabled: image !== null,
    staleTime: 0,
    retry: 2,
    gcTime: 5 * 60 * 1000,
  });
}
