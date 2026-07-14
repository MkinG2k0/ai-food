import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImageStore } from './useImageStore';

describe('useImageStore', () => {
  beforeEach(() => {
    useImageStore.setState({ selectedImage: null, previewUrl: null, description: null });
  });

  it('starts with no image and no description', () => {
    const { result } = renderHook(() => useImageStore());
    expect(result.current.selectedImage).toBeNull();
    expect(result.current.previewUrl).toBeNull();
    expect(result.current.description).toBeNull();
  });

  it('sets image and creates a blob preview URL', () => {
    const { result } = renderHook(() => useImageStore());
    const file = new File(['data'], 'food.jpg', { type: 'image/jpeg' });

    act(() => result.current.setImage(file));

    expect(result.current.selectedImage).toBe(file);
    expect(result.current.previewUrl).toMatch(/^blob:/);
  });

  it('sets description without touching image fields', () => {
    const { result } = renderHook(() => useImageStore());

    act(() => result.current.setDescription('cheeseburger with fries'));

    expect(result.current.description).toBe('cheeseburger with fries');
    expect(result.current.selectedImage).toBeNull();
    expect(result.current.previewUrl).toBeNull();
  });

  it('clears image, preview URL, and description', () => {
    const { result } = renderHook(() => useImageStore());
    const file = new File(['data'], 'food.jpg', { type: 'image/jpeg' });

    act(() => result.current.setImage(file));
    act(() => result.current.setDescription('cheeseburger'));
    act(() => result.current.clear());

    expect(result.current.selectedImage).toBeNull();
    expect(result.current.previewUrl).toBeNull();
    expect(result.current.description).toBeNull();
  });
});
