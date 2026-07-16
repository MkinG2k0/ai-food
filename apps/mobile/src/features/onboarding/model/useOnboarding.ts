import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@ai-food/shared-types';
import { useProfileStore } from './useProfileStore';
import { calculateTargets } from './calculateTargets';
import { micronutrientTargetsApi } from '../api/micronutrientTargetsApi';

export function useOnboarding() {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Partial<UserProfile>>({});
  const setProfile = useProfileStore((s) => s.setProfile);
  const setMicronutrientTargets = useProfileStore((s) => s.setMicronutrientTargets);
  const navigate = useNavigate();

  function next(data: Partial<UserProfile>) {
    setDraft((prev) => ({ ...prev, ...data }));
    setStep((s) => s + 1);
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function finish() {
    const required: (keyof UserProfile)[] = [
      'gender',
      'age',
      'height',
      'weight',
      'activity',
      'goal',
      'targetWeight',
      'dietType',
    ];
    if (required.some((k) => draft[k] === undefined)) return;
    const profile = draft as UserProfile;
    const targets = calculateTargets(profile);
    setProfile(profile, targets);
    const micronutrientTargets = await micronutrientTargetsApi(profile);
    setMicronutrientTargets(micronutrientTargets);
    navigate('/');
  }

  return { step, draft, next, back, finish };
}
