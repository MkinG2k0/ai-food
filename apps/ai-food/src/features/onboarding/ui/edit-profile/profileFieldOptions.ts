import type {
  ActivityLevel,
  DietType,
  Goal,
  UserProfile,
} from '@ai-food/shared-types';

export interface ProfileChoiceOption<T extends string> {
  value: T;
  label: string;
}

export const GENDER_OPTIONS: ProfileChoiceOption<UserProfile['gender']>[] = [
  { value: 'male', label: 'Мужской' },
  { value: 'female', label: 'Женский' },
];

export const ACTIVITY_OPTIONS: ProfileChoiceOption<ActivityLevel>[] = [
  { value: 'low', label: 'Низкая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'high', label: 'Высокая' },
];

export const GOAL_OPTIONS: ProfileChoiceOption<Goal>[] = [
  { value: 'lose', label: 'Похудеть' },
  { value: 'maintain', label: 'Поддержать вес' },
  { value: 'gain', label: 'Набрать массу' },
];

export const DIET_OPTIONS: ProfileChoiceOption<DietType>[] = [
  { value: 'none', label: 'Без ограничений' },
  { value: 'halal', label: 'Халяль' },
  { value: 'vegan', label: 'Веган' },
  { value: 'vegetarian', label: 'Вегетарианство' },
];
