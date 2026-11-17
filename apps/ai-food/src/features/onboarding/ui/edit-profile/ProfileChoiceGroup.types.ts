import type { ProfileChoiceOption } from './profileFieldOptions';

export interface ProfileChoiceGroupProps<T extends string> {
  label: string;
  value: T;
  options: ProfileChoiceOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}
