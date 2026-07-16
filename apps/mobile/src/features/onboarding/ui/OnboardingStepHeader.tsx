interface OnboardingStepHeaderProps {
  emoji: string;
  title: string;
}

export function OnboardingStepHeader({ emoji, title }: OnboardingStepHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="text-4xl leading-none" aria-hidden="true">
        {emoji}
      </span>
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
  );
}
