import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAnalyzeFood } from './useAnalyzeFood';
import * as analyzeFoodApiModule from '../api/analyzeFoodApi';
import type { AnalyzeFoodResponse } from '@ai-food/shared-types';

vi.mock('../api/analyzeFoodApi');

const mockResponse: AnalyzeFoodResponse = {
  result: {
    foodName: 'Test Food',
    calories: 300,
    protein: 20,
    carbs: 30,
    fat: 10,
    fiber: 5,
    confidence: 0.92,
    healthiness: 7,
    items: [],
  },
  processingTime: 2000,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useAnalyzeFood', () => {
  beforeEach(() => {
    vi.mocked(analyzeFoodApiModule.analyzeFoodApi).mockResolvedValue(mockResponse);
  });

  it('is in idle state when image is null', () => {
    const { result } = renderHook(() => useAnalyzeFood(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('fetches nutrition data when image is provided', async () => {
    const file = new File(['data'], 'food.jpg', { type: 'image/jpeg' });
    const { result } = renderHook(() => useAnalyzeFood(file), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(analyzeFoodApiModule.analyzeFoodApi).toHaveBeenCalledWith(file, {
      customInstructions: '',
      dietType: 'none',
      model: expect.any(String),
      features: {
        vitamins: true,
        healthiness: true,
        composition: true,
      },
    });
  });
});