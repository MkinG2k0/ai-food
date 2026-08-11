interface NumericRangeInputProps {
  min: number;
  max: number;
  value: number;
  inputText: string;
  unit?: string;
  onTextChange: (text: string) => void;
  onTextBlur: (text: string) => void;
  onSliderChange: (value: number) => void;
}

export function NumericRangeInput({
  min,
  max,
  value,
  inputText,
  unit,
  onTextChange,
  onTextBlur,
  onSliderChange,
}: NumericRangeInputProps) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex items-baseline gap-1">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={inputText}
          onChange={(e) => onTextChange(e.target.value)}
          onBlur={(e) => onTextBlur(e.target.value)}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-center text-xl font-bold tabular-nums"
        />
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onSliderChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
