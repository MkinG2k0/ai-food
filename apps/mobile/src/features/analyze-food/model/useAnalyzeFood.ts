import { useQuery } from '@tanstack/react-query';
import { analyzeFoodApi } from '../api/analyzeFoodApi';
import type { AnalyzeFoodResponse } from '@ai-food/shared-types';

export function useAnalyzeFood(image: File | null) {
  return useQuery<AnalyzeFoodResponse, Error>({
    queryKey: ['analyze-food', image?.name, image?.size, image?.lastModified],
    queryFn: () => analyzeFoodApi(image!),
    enabled: image !== null,
    staleTime: 30_000,
    retry: 2,
    gcTime: 5 * 60 * 1000,
  });
}
