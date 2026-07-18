import { useQuery } from '@tanstack/react-query';
import type { AnalyzeFoodResponse } from '@ai-food/shared-types';
import { useProfileStore } from '@/features/onboarding';
import { useSettingsStore } from '@/features/settings';
import { analyzeFoodApi } from '../api/analyzeFoodApi';

export function useAnalyzeFood(image: File | null) {
  const customInstructions = useSettingsStore((s) => s.customInstructions);
  const aiModel = useSettingsStore((s) => s.aiModel);
  const dietType = useProfileStore((s) => s.profile?.dietType ?? 'none');

  return useQuery<AnalyzeFoodResponse, Error>({
    queryKey: [
      'analyze-food',
      image?.name,
      image?.size,
      image?.lastModified,
      customInstructions,
      dietType,
      aiModel,
    ],
    queryFn: () =>
      analyzeFoodApi(image!, {
        customInstructions,
        dietType,
        model: aiModel,
      }),
    enabled: image !== null,
    staleTime: 0,
    retry: 2,
    gcTime: 5 * 60 * 1000,
  });
}
