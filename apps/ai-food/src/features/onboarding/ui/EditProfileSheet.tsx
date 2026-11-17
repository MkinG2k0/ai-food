import { BottomSheet, Button } from '@/shared/ui';
import { cn } from '@/shared/lib';
import { useEditProfileForm } from '../model/useEditProfileForm';
import {
  ACTIVITY_OPTIONS,
  DIET_OPTIONS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
  ProfileChoiceGroup,
  ProfileNumberField,
} from './edit-profile';
import type { EditProfileSheetProps } from './EditProfileSheet.types';

export function EditProfileSheet({
  open,
  profile,
  onClose,
  className,
}: EditProfileSheetProps) {
  const { canSave, draft, setDraft, save } = useEditProfileForm({
    open,
    profile,
    onSaved: onClose,
  });

  return (
    <BottomSheet open={open} onClose={onClose} className={className}>
      <div className="max-h-[min(78vh,36rem)] space-y-4 overflow-y-auto px-2 py-1">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Изменить профиль
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            КБЖУ не пересчитываются — измените их через «Изменить КБЖУ».
          </p>
        </div>

        <ProfileChoiceGroup
          label="Пол"
          value={draft.gender}
          options={GENDER_OPTIONS}
          onChange={(gender) => setDraft({ gender })}
        />
        <div className="grid grid-cols-2 gap-3">
          <ProfileNumberField
            label="Возраст"
            unit="лет"
            min={1}
            max={120}
            value={draft.age}
            onChange={(age) => setDraft({ age })}
          />
          <ProfileNumberField
            label="Рост"
            unit="см"
            min={50}
            max={300}
            value={draft.height}
            onChange={(height) => setDraft({ height })}
          />
          <ProfileNumberField
            label="Вес"
            unit="кг"
            min={1}
            max={500}
            step={0.1}
            value={draft.weight}
            onChange={(weight) => setDraft({ weight })}
          />
          <ProfileNumberField
            label="Желаемый вес"
            unit="кг"
            min={20}
            max={300}
            step={0.1}
            value={draft.targetWeight}
            onChange={(targetWeight) => setDraft({ targetWeight })}
          />
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs text-muted-foreground">Срок цели</span>
          <input
            type="date"
            aria-label="Срок цели"
            className={cn(
              'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
            value={draft.targetWeightDate}
            onChange={(e) => setDraft({ targetWeightDate: e.target.value })}
          />
        </label>
        <ProfileChoiceGroup
          label="Активность"
          value={draft.activity}
          options={ACTIVITY_OPTIONS}
          onChange={(activity) => setDraft({ activity })}
        />
        <ProfileChoiceGroup
          label="Цель"
          value={draft.goal}
          options={GOAL_OPTIONS}
          onChange={(goal) => setDraft({ goal })}
        />
        <ProfileChoiceGroup
          label="Тип питания"
          value={draft.dietType}
          options={DIET_OPTIONS}
          onChange={(dietType) => setDraft({ dietType })}
        />

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Отмена
          </Button>
          <Button className="flex-1" disabled={!canSave} onClick={save}>
            Сохранить
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
