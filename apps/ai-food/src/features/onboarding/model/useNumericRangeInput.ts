import { useState } from 'react';

function clampValue(raw: number, min: number, max: number): number {
  if (Number.isNaN(raw)) return min;
  return Math.min(max, Math.max(min, raw));
}

function roundTo(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
}

function sanitizeNumericInput(text: string, decimalPlaces: number): string {
  if (decimalPlaces <= 0) {
    return text.replace(/\D/g, '');
  }

  const normalized = text.replace(/,/g, '.');
  let out = '';
  let seenDot = false;
  let fracCount = 0;
  for (const ch of normalized) {
    if (ch >= '0' && ch <= '9') {
      if (seenDot) {
        if (fracCount >= decimalPlaces) continue;
        fracCount += 1;
      }
      out += ch;
    } else if (ch === '.' && !seenDot) {
      seenDot = true;
      out += '.';
    }
  }
  return out;
}

function parseNumericInput(text: string): number {
  if (text === '' || text === '.') return Number.NaN;
  return Number(text);
}

function formatNumeric(value: number, decimalPlaces: number): string {
  if (decimalPlaces <= 0) return String(Math.round(value));
  const rounded = roundTo(value, decimalPlaces);
  return String(rounded);
}

export interface NumericRangeInputOptions {
  decimalPlaces?: number;
}

export function useNumericRangeInput(
  min: number,
  max: number,
  initial: number,
  options?: NumericRangeInputOptions,
) {
  const decimalPlaces = options?.decimalPlaces ?? 0;
  const [value, setValue] = useState(() =>
    decimalPlaces > 0 ? roundTo(initial, decimalPlaces) : initial,
  );
  const [inputText, setInputText] = useState(() =>
    formatNumeric(initial, decimalPlaces),
  );

  function commit(raw: number) {
    const next =
      decimalPlaces > 0
        ? roundTo(clampValue(raw, min, max), decimalPlaces)
        : clampValue(raw, min, max);
    setValue(next);
    setInputText(formatNumeric(next, decimalPlaces));
    return next;
  }

  function handleTextChange(text: string) {
    const sanitized = sanitizeNumericInput(text, decimalPlaces);
    setInputText(sanitized);
    if (sanitized === '' || sanitized === '.') return;

    const raw = parseNumericInput(
      sanitized.endsWith('.') ? sanitized.slice(0, -1) : sanitized,
    );
    if (raw >= min && raw <= max) {
      setValue(decimalPlaces > 0 ? roundTo(raw, decimalPlaces) : raw);
    }
  }

  function handleTextBlur(text: string) {
    const parsed = parseNumericInput(sanitizeNumericInput(text, decimalPlaces));
    commit(Number.isNaN(parsed) ? value : parsed);
  }

  function handleSliderChange(raw: number) {
    commit(raw);
  }

  function getCommittedValue(): number {
    const parsed = parseNumericInput(inputText);
    const raw = Number.isNaN(parsed) ? value : parsed;
    return decimalPlaces > 0
      ? roundTo(clampValue(raw, min, max), decimalPlaces)
      : clampValue(raw, min, max);
  }

  return {
    value,
    inputText,
    handleTextChange,
    handleTextBlur,
    handleSliderChange,
    getCommittedValue,
  };
}
