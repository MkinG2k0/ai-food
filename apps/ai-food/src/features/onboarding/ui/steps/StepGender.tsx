import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@ai-food/shared-types';
import { toast } from 'sonner';
import {
  TelegramBotLoginButton,
  useAuthStore,
} from '@/features/auth';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { reconcileNutritionProfileAfterLogin } from '../../model/reconcileNutritionProfileAfterLogin';
import { OnboardingStepHeader } from '../OnboardingStepHeader';

interface StepGenderProps {
  onNext: (data: Pick<UserProfile, 'gender'>) => void;
}

const OPTIONS: { value: UserProfile['gender']; label: string; emoji: string }[] = [
  { value: 'male', label: 'Мужской', emoji: '👨' },
  { value: 'female', label: 'Женский', emoji: '👩' },
];

export function StepGender({ onNext }: StepGenderProps) {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const [selected, setSelected] = useState<UserProfile['gender'] | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <OnboardingStepHeader emoji="👤" title="Ваш пол" />
      <div className="flex gap-4">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={cn(
              'flex flex-1 flex-col items-center gap-2 rounded-xl border-2 py-6 text-base font-medium transition-colors',
              selected === opt.value
                ? 'border-primary bg-primary/10'
                : 'border-border bg-background text-foreground',
            )}
          >
            <span className="text-3xl leading-none" aria-hidden="true">
              {opt.emoji}
            </span>
            {opt.label}
          </button>
        ))}
      </div>
      <Button disabled={!selected} onClick={() => selected && onNext({ gender: selected })}>
        Далее
      </Button>
      {session ? (
        <p className="text-center text-sm text-muted-foreground">
          Вы вошли как {session.name}
          {session.username ? ` (@${session.username})` : ''}
        </p>
      ) : (
        <>
          <div className="relative flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">или</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <TelegramBotLoginButton
            onSuccess={(result) => {
              const source = reconcileNutritionProfileAfterLogin(result);
              if (source === 'remote' || source === 'local-uploaded') {
                toast.success(
                  source === 'remote' ? 'С возвращением' : 'Вход выполнен',
                );
                navigate('/', { replace: true });
                return;
              }
              toast.success('Вы вошли — заполните профиль');
            }}
            onError={(message) => toast.error(message)}
          />
        </>
      )}
    </div>
  );
}
