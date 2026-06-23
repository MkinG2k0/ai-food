import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImageStore } from './useImageStore';

describe('useImageStore', () => {
  beforeEach(() => {
    useImageStore.setState({ selectedImage: null, previewUrl: null });
  });

  it('starts with no image', () => {
    const { result } = renderHook(() => useImageStore());
    expect(result.current.selectedImage).toBeNull();
    expect(result.current.previewUrl).toBeNull();
  });

  it('sets image and creates a blob preview URL', () => {
    const { result } = renderHook(() => useImageStore());
    const file = new File(['data'], 'food.jpg', { type: 'image/jpeg' });

    act(() => result.current.setImage(file));

    expect(result.current.selectedImage).toBe(file);
    expect(result.current.previewUrl).toMatch(/^blob:/);
  });

  it('clears image and preview URL', () => {
    const { result } = renderHook(() => useImageStore());
    const file = new File(['data'], 'food.jpg', { type: 'image/jpeg' });

    act(() => result.current.setImage(file));
    act(() => result.current.clear());

    expect(result.current.selectedImage).toBeNull();
    expect(result.current.previewUrl).toBeNull();
  });
});
