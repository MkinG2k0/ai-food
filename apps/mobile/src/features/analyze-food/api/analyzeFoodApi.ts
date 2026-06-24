import { apiClient } from '@/shared/api';
import type { AnalyzeFoodResponse } from '@ai-food/shared-types';

export async function analyzeFoodApi(image: File): Promise<AnalyzeFoodResponse> {
  const formData = new FormData();
  formData.append('image', image);

  const response = await apiClient.post<AnalyzeFoodResponse>('/analyze-food', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}
