import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnboarding } from './useOnboarding';
import { useProfileStore } from './useProfileStore';
import { defaultMicronutrientTargets } from './defaultMicronutrientTargets';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../api/micronutrientTargetsApi', () => ({
  micronutrientTargetsApi: vi.fn(async () => defaultMicronutrientTargets('male')),
}));

beforeEach(() => {
  mockNavigate.mockClear();
  useProfileStore.setState({
    profile: null,
    targets: null,
    micronutrientTargets: null,
  });
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

  it('finish() calls setProfile, sets micronutrient targets, and navigates', async () => {
    const setProfileSpy = vi.fn();
    const setMicronutrientTargetsSpy = vi.fn();
    useProfileStore.setState({
      profile: null,
      targets: null,
      micronutrientTargets: null,
      setProfile: setProfileSpy,
      setMicronutrientTargets: setMicronutrientTargetsSpy,
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
      result.current.next({ targetWeight: 75, targetWeightDate: '2026-10-16' });
      result.current.next({ dietType: 'none' });
    });
    await act(async () => {
      await result.current.finish();
    });
    expect(setProfileSpy).toHaveBeenCalledOnce();
    expect(setProfileSpy.mock.calls[0][0]).toMatchObject({
      dietType: 'none',
      targetWeight: 75,
      targetWeightDate: '2026-10-16',
    });
    expect(setMicronutrientTargetsSpy).toHaveBeenCalledOnce();
    expect(setMicronutrientTargetsSpy.mock.calls[0][0]).toHaveLength(8);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('finish() does not call setProfile without dietType', async () => {
    const setProfileSpy = vi.fn();
    useProfileStore.setState({
      profile: null,
      targets: null,
      micronutrientTargets: null,
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
      result.current.next({ targetWeight: 75, targetWeightDate: '2026-10-16' });
    });
    await act(async () => {
      await result.current.finish();
    });
    expect(setProfileSpy).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('finish() does not call setProfile without targetWeightDate', async () => {
    const setProfileSpy = vi.fn();
    useProfileStore.setState({
      profile: null,
      targets: null,
      micronutrientTargets: null,
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
      result.current.next({ targetWeight: 75 });
      result.current.next({ dietType: 'none' });
    });
    await act(async () => {
      await result.current.finish();
    });
    expect(setProfileSpy).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('finish() does not call setProfile without targetWeight', async () => {
    const setProfileSpy = vi.fn();
    useProfileStore.setState({
      profile: null,
      targets: null,
      micronutrientTargets: null,
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
      result.current.next({ dietType: 'none' });
    });
    await act(async () => {
      await result.current.finish();
    });
    expect(setProfileSpy).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
