import { Navigate } from 'react-router-dom';
import type { UserProfile } from '@ai-food/shared-types';
import { useOnboarding } from '../model/useOnboarding';
import { useProfileStore } from '../model/useProfileStore';
import { useProfileHydrated } from '../model/useProfileHydrated';
import { calculateTargets } from '../model/calculateTargets';
import { StepGender } from './steps/StepGender';
import { StepAge } from './steps/StepAge';
import { StepHeight } from './steps/StepHeight';
import { StepWeight } from './steps/StepWeight';
import { StepActivity } from './steps/StepActivity';
import { StepGoal } from './steps/StepGoal';
import { StepTargetWeight } from './steps/StepTargetWeight';
import { StepDiet } from './steps/StepDiet';
import { OnboardingResult } from './OnboardingResult';

const TOTAL_STEPS = 8;

export function OnboardingPage() {
  const hydrated = useProfileHydrated();
  const isComplete = useProfileStore((s) => s.isComplete());
  const { step, draft, next, back, finish, skip } = useOnboarding();

  if (!hydrated) return null;
  if (isComplete) return <Navigate to="/" replace />;

  const isResult = step > TOTAL_STEPS;
  const targets = isResult ? calculateTargets(draft as UserProfile) : null;

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background px-6 py-8">
      {!isResult && (
        <div className="mb-8 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            {step > 1 && (
              <button
                type="button"
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
            <button
              type="button"
              onClick={() => void skip()}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Пропустить
            </button>
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        {step === 1 && <StepGender onNext={next} />}
        {step === 2 && <StepAge onNext={next} />}
        {step === 3 && <StepHeight onNext={next} />}
        {step === 4 && <StepWeight onNext={next} />}
        {step === 5 && <StepActivity onNext={next} />}
        {step === 6 && <StepGoal onNext={next} />}
        {step === 7 && (
          <StepTargetWeight
            onNext={next}
            currentWeight={draft.weight!}
          />
        )}
        {step === 8 && <StepDiet onNext={next} />}
        {isResult && targets && (
          <OnboardingResult targets={targets} onStart={finish} />
        )}
      </div>
    </div>
  );
}
