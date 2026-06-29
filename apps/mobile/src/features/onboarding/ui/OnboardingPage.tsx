import { useOnboarding } from '../model/useOnboarding';
import { calculateTargets } from '../model/calculateTargets';
import { StepGender } from './steps/StepGender';
import { StepAge } from './steps/StepAge';
import { StepHeight } from './steps/StepHeight';
import { StepWeight } from './steps/StepWeight';
import { StepActivity } from './steps/StepActivity';
import { StepGoal } from './steps/StepGoal';
import { OnboardingResult } from './OnboardingResult';
import type { UserProfile } from '@ai-food/shared-types';

const TOTAL_STEPS = 6;

export function OnboardingPage() {
  const { step, draft, next, back, finish } = useOnboarding();

  const isResult = step > TOTAL_STEPS;
  const targets = isResult ? calculateTargets(draft as UserProfile) : null;

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 py-8">
      {!isResult && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {step > 1 && (
              <button
                onClick={back}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Назад"
              >
                ← Назад
              </button>
            )}
            <span className="ml-auto text-sm text-muted-foreground">
              {step} / {TOTAL_STEPS}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1">
        {step === 1 && <StepGender onNext={next} />}
        {step === 2 && <StepAge onNext={next} />}
        {step === 3 && <StepHeight onNext={next} />}
        {step === 4 && <StepWeight onNext={next} />}
        {step === 5 && <StepActivity onNext={next} />}
        {step === 6 && <StepGoal onNext={next} />}
        {isResult && targets && (
          <OnboardingResult targets={targets} onStart={finish} />
        )}
      </div>
    </div>
  );
}
