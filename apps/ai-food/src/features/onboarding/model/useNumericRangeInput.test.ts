import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useNumericRangeInput } from './useNumericRangeInput';

describe('useNumericRangeInput', () => {
  it('allows clearing the field without snapping to min', () => {
    const { result } = renderHook(() => useNumericRangeInput(15, 80, 25));

    act(() => {
      result.current.handleTextChange('');
    });

    expect(result.current.inputText).toBe('');
    expect(result.current.value).toBe(25);
  });

  it('updates value only when typed number is within range', () => {
    const { result } = renderHook(() => useNumericRangeInput(15, 80, 25));

    act(() => {
      result.current.handleTextChange('3');
    });

    expect(result.current.inputText).toBe('3');
    expect(result.current.value).toBe(25);

    act(() => {
      result.current.handleTextChange('35');
    });

    expect(result.current.value).toBe(35);
  });

  it('clamps on blur and commit', () => {
    const { result } = renderHook(() => useNumericRangeInput(15, 80, 25));

    act(() => {
      result.current.handleTextChange('9');
      result.current.handleTextBlur('9');
    });

    expect(result.current.inputText).toBe('15');
    expect(result.current.getCommittedValue()).toBe(15);
  });

  it('allows replacing min value by clearing and typing a new number', () => {
    const { result } = renderHook(() => useNumericRangeInput(140, 220, 140));

    act(() => {
      result.current.handleTextChange('');
    });
    expect(result.current.inputText).toBe('');

    act(() => {
      result.current.handleTextChange('175');
    });

    expect(result.current.inputText).toBe('175');
    expect(result.current.value).toBe(175);
    expect(result.current.getCommittedValue()).toBe(175);
  });

  it('strips non-digit characters while typing', () => {
    const { result } = renderHook(() => useNumericRangeInput(140, 220, 170));

    act(() => {
      result.current.handleTextChange('18a5');
    });

    expect(result.current.inputText).toBe('185');
    expect(result.current.value).toBe(185);
  });

  it('syncs slider and text input', () => {
    const { result } = renderHook(() => useNumericRangeInput(15, 80, 25));

    act(() => {
      result.current.handleSliderChange(40);
    });

    expect(result.current.value).toBe(40);
    expect(result.current.inputText).toBe('40');
  });

  it('accepts one decimal place when enabled', () => {
    const { result } = renderHook(() =>
      useNumericRangeInput(1, 500, 70, { decimalPlaces: 1 }),
    );

    act(() => {
      result.current.handleTextChange('61.5');
    });

    expect(result.current.inputText).toBe('61.5');
    expect(result.current.value).toBe(61.5);
    expect(result.current.getCommittedValue()).toBe(61.5);
  });

  it('accepts comma as decimal separator', () => {
    const { result } = renderHook(() =>
      useNumericRangeInput(1, 500, 70, { decimalPlaces: 1 }),
    );

    act(() => {
      result.current.handleTextChange('65,2');
    });

    expect(result.current.inputText).toBe('65.2');
    expect(result.current.value).toBe(65.2);
  });

  it('keeps a trailing decimal while typing', () => {
    const { result } = renderHook(() =>
      useNumericRangeInput(1, 500, 70, { decimalPlaces: 1 }),
    );

    act(() => {
      result.current.handleTextChange('61.');
    });

    expect(result.current.inputText).toBe('61.');
    expect(result.current.value).toBe(61);
  });
});
