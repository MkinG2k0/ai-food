import type { UserProfile } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';
import { useNumericRangeInput } from '../../model/useNumericRangeInput';
import { NumericRangeInput } from '../NumericRangeInput';
import { OnboardingStepHeader } from '../OnboardingStepHeader';

const MIN = 50;
const MAX = 300;

interface StepHeightProps {
  onNext: (data: Pick<UserProfile, 'height'>) => void;
  initial?: number;
}

export function StepHeight({ onNext, initial }: StepHeightProps) {
  const {
    value,
    inputText,
    handleTextChange,
    handleTextBlur,
    handleSliderChange,
    getCommittedValue,
  } = useNumericRangeInput(MIN, MAX, initial ?? 170);

  return (
    <div className="flex flex-col gap-6">
      <OnboardingStepHeader emoji="📏" title="Ваш рост" />
      <NumericRangeInput
        min={MIN}
        max={MAX}
        value={value}
        inputText={inputText}
        unit="см"
        onTextChange={handleTextChange}
        onTextBlur={handleTextBlur}
        onSliderChange={handleSliderChange}
      />
      <Button onClick={() => onNext({ height: getCommittedValue() })}>Далее</Button>
    </div>
  );
}
