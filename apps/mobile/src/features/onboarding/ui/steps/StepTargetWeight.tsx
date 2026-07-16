import type { Goal, UserProfile } from '@ai-food/shared-types';
import { Button } from '@/shared/ui';
import { useNumericRangeInput } from '../../model/useNumericRangeInput';
import { NumericRangeInput } from '../NumericRangeInput';
import { OnboardingStepHeader } from '../OnboardingStepHeader';

const MIN = 40;
const MAX = 160;

interface StepTargetWeightProps {
  onNext: (data: Pick<UserProfile, 'targetWeight'>) => void;
  currentWeight: number;
  goal: Goal;
}

export function StepTargetWeight({
  onNext,
  currentWeight,
  goal,
}: StepTargetWeightProps) {
  // D-04: maintain → current weight; lose/gain also start from current weight
  const initial = Math.min(
    MAX,
    Math.max(MIN, goal === 'maintain' ? currentWeight : currentWeight),
  );

  const {
    value,
    inputText,
    handleTextChange,
    handleTextBlur,
    handleSliderChange,
    getCommittedValue,
  } = useNumericRangeInput(MIN, MAX, initial);

  return (
    <div className="flex flex-col gap-6">
      <OnboardingStepHeader emoji="🎯" title="Желаемый вес" />
      <NumericRangeInput
        min={MIN}
        max={MAX}
        value={value}
        inputText={inputText}
        unit="кг"
        rangeSuffix="кг"
        onTextChange={handleTextChange}
        onTextBlur={handleTextBlur}
        onSliderChange={handleSliderChange}
      />
      <Button onClick={() => onNext({ targetWeight: getCommittedValue() })}>
        Далее
      </Button>
    </div>
  );
}
