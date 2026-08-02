import type { UserProfile } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';
import { useNumericRangeInput } from '../../model/useNumericRangeInput';
import { NumericRangeInput } from '../NumericRangeInput';
import { OnboardingStepHeader } from '../OnboardingStepHeader';

const MIN = 1;
const MAX = 500;

interface StepWeightProps {
  onNext: (data: Pick<UserProfile, 'weight'>) => void;
}

export function StepWeight({ onNext }: StepWeightProps) {
  const {
    value,
    inputText,
    handleTextChange,
    handleTextBlur,
    handleSliderChange,
    getCommittedValue,
  } = useNumericRangeInput(MIN, MAX, 70);

  return (
    <div className="flex flex-col gap-6">
      <OnboardingStepHeader emoji="⚖️" title="Ваш вес" />
      <NumericRangeInput
        min={MIN}
        max={MAX}
        value={value}
        inputText={inputText}
        unit="кг"
        onTextChange={handleTextChange}
        onTextBlur={handleTextBlur}
        onSliderChange={handleSliderChange}
      />
      <Button onClick={() => onNext({ weight: getCommittedValue() })}>Далее</Button>
    </div>
  );
}
