import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@ai-food/shared-types';
import { useProfileStore } from './useProfileStore';
import { calculateTargets } from './calculateTargets';

export function useOnboarding() {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Partial<UserProfile>>({});
  const setProfile = useProfileStore((s) => s.setProfile);
  const navigate = useNavigate();

  function next(data: Partial<UserProfile>) {
    setDraft((prev) => ({ ...prev, ...data }));
    setStep((s) => s + 1);
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  function finish() {
    const required: (keyof UserProfile)[] = ['gender', 'age', 'height', 'weight', 'activity', 'goal'];
    if (required.some((k) => draft[k] === undefined)) return;
    const profile = draft as UserProfile;
    const targets = calculateTargets(profile);
    setProfile(profile, targets);
    navigate('/');
  }

  return { step, draft, next, back, finish };
}
