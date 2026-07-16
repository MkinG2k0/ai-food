import { useState } from 'react';

function clampValue(raw: number, min: number, max: number): number {
  if (Number.isNaN(raw)) return min;
  return Math.min(max, Math.max(min, raw));
}

export function useNumericRangeInput(min: number, max: number, initial: number) {
  const [value, setValue] = useState(initial);
  const [inputText, setInputText] = useState(String(initial));

  function handleTextChange(text: string) {
    const digitsOnly = text.replace(/\D/g, '');
    setInputText(digitsOnly);
    if (digitsOnly === '') return;

    const raw = Number(digitsOnly);
    if (raw >= min && raw <= max) {
      setValue(raw);
    }
  }

  function handleTextBlur(text: string) {
    const clamped = clampValue(text === '' ? value : Number(text), min, max);
    setValue(clamped);
    setInputText(String(clamped));
  }

  function handleSliderChange(raw: number) {
    setValue(raw);
    setInputText(String(raw));
  }

  function getCommittedValue(): number {
    return clampValue(inputText === '' ? value : Number(inputText), min, max);
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
