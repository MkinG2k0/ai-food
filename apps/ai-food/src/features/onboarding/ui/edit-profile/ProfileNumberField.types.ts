export interface ProfileNumberFieldProps {
  label: string;
  value: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: string) => void;
  className?: string;
}
