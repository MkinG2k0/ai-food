import type { UserProfile } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';
import { useNumericRangeInput } from '../../model/useNumericRangeInput';
import { NumericRangeInput } from '../NumericRangeInput';
import { OnboardingStepHeader } from '../OnboardingStepHeader';

const MIN = 15;
const MAX = 80;

interface StepAgeProps {
  onNext: (data: Pick<UserProfile, 'age'>) => void;
}

export function StepAge({ onNext }: StepAgeProps) {
  const {
    value,
    inputText,
    handleTextChange,
    handleTextBlur,
    handleSliderChange,
    getCommittedValue,
  } = useNumericRangeInput(MIN, MAX, 25);

  return (
    <div className="flex flex-col gap-6">
      <OnboardingStepHeader emoji="🎂" title="Ваш возраст" />
      <NumericRangeInput
        min={MIN}
        max={MAX}
        value={value}
        inputText={inputText}
        rangeSuffix="лет"
        onTextChange={handleTextChange}
        onTextBlur={handleTextBlur}
        onSliderChange={handleSliderChange}
      />
      <Button onClick={() => onNext({ age: getCommittedValue() })}>Далее</Button>
    </div>
  );
}
