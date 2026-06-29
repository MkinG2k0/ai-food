import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnboarding } from './useOnboarding';
import { useProfileStore } from './useProfileStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  useProfileStore.setState({ profile: null, targets: null });
});

describe('useOnboarding', () => {
  it('starts at step 1 with empty draft', () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.step).toBe(1);
    expect(result.current.draft).toEqual({});
  });

  it('next() advances step and merges data', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => result.current.next({ gender: 'female' }));
    expect(result.current.step).toBe(2);
    expect(result.current.draft.gender).toBe('female');
  });

  it('back() decrements step (not below 1)', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => result.current.next({ gender: 'male' }));
    act(() => result.current.back());
    expect(result.current.step).toBe(1);
    act(() => result.current.back());
    expect(result.current.step).toBe(1);
  });

  it('finish() calls setProfile and navigates', () => {
    const setProfileSpy = vi.fn();
    useProfileStore.setState({
      profile: null,
      targets: null,
      setProfile: setProfileSpy,
      isComplete: () => false,
    });

    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.next({ gender: 'male' });
      result.current.next({ age: 30 });
      result.current.next({ height: 175 });
      result.current.next({ weight: 75 });
      result.current.next({ activity: 'medium' });
      result.current.next({ goal: 'maintain' });
    });
    act(() => result.current.finish());
    expect(setProfileSpy).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
