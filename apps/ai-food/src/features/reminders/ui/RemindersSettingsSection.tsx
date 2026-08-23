import { useEffect, useState, type ReactNode } from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib';
import { Checkbox } from '@/shared/ui';
import {
  checkNotificationPermission,
  isNativeRemindersSupported,
  requestNotificationPermission,
} from '../model/localNotificationsNative';
import { queueRescheduleReminders } from '../model/rescheduleReminders';
import type { MealSlotReminderSettings, ReminderSettings } from '../model/types';

interface RemindersSettingsSectionProps {
  reminders: ReminderSettings;
  setRemindersEnabled: (value: boolean) => void;
  setMealSlot: (
    slot: 'breakfast' | 'lunch' | 'dinner',
    patch: Partial<MealSlotReminderSettings>,
  ) => void;
  setStreakAtRisk: (value: boolean) => void;
  setWeightWeekly: (value: boolean) => void;
}

function formatTime(time: { hour: number; minute: number }): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

function parseTimeInput(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function reminderStatusSummary(reminders: ReminderSettings): string {
  if (!reminders.enabled) return 'Выключено';

  const parts: string[] = [];
  if (reminders.breakfast.enabled) {
    parts.push(`завтрак ${formatTime(reminders.breakfast.time)}`);
  }
  if (reminders.lunch.enabled) {
    parts.push(`обед ${formatTime(reminders.lunch.time)}`);
  }
  if (reminders.dinner.enabled) {
    parts.push(`ужин ${formatTime(reminders.dinner.time)}`);
  }
  if (reminders.streakAtRisk) parts.push('серия');
  if (reminders.weightWeekly) parts.push('вес');

  return parts.length > 0 ? parts.join(' · ') : 'Включено';
}

function ToggleRow({
  checked,
  onChange,
  title,
  description,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
        <Checkbox
          className="mt-0.5"
          checked={checked}
          onCheckedChange={(value) => onChange(value === true)}
        />
        <span className="min-w-0 space-y-0.5">
          <span className="block text-sm font-medium leading-tight">{title}</span>
          {description ? (
            <span className="block text-xs text-muted-foreground">{description}</span>
          ) : null}
        </span>
      </label>
      {children}
    </div>
  );
}

function MealSlotRow({
  label,
  slot,
  settings,
  onChange,
}: {
  label: string;
  slot: 'breakfast' | 'lunch' | 'dinner';
  settings: MealSlotReminderSettings;
  onChange: RemindersSettingsSectionProps['setMealSlot'];
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <Checkbox
          checked={settings.enabled}
          onCheckedChange={(value) =>
            onChange(slot, { enabled: value === true })
          }
        />
        <span className="text-sm">{label}</span>
      </label>
      <input
        type="time"
        className={cn(
          'w-[5.5rem] shrink-0 rounded-md border border-input bg-background px-2 py-1 text-sm tabular-nums',
          'disabled:cursor-not-allowed disabled:opacity-40',
        )}
        value={formatTime(settings.time)}
        disabled={!settings.enabled}
        aria-label={`Время: ${label}`}
        onChange={(e) => {
          const parsed = parseTimeInput(e.target.value);
          if (parsed) onChange(slot, { time: parsed });
        }}
      />
    </div>
  );
}

export function RemindersSettingsSection({
  reminders,
  setRemindersEnabled,
  setMealSlot,
  setStreakAtRisk,
  setWeightWeekly,
}: RemindersSettingsSectionProps) {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt'>(
    'prompt',
  );

  useEffect(() => {
    if (!isNativeRemindersSupported()) {
      setPermission('granted');
      return;
    }
    void checkNotificationPermission().then(setPermission);
  }, [reminders.enabled]);

  const handleMasterToggle = async (enabled: boolean) => {
    setRemindersEnabled(enabled);
    if (enabled && isNativeRemindersSupported()) {
      const state = await requestNotificationPermission();
      setPermission(state);
    }
    queueRescheduleReminders();
  };

  const summary = reminderStatusSummary(reminders);
  const nativeOnly = isNativeRemindersSupported();

  return (
    <section className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium leading-none">Напоминания</h2>
          {!open ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">{summary}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {nativeOnly
              ? 'Локально на этом устройстве, не синхронизируются.'
              : 'Работают в Android-приложении. В браузере настройки сохраняются, уведомления не приходят.'}
          </p>

          {permission === 'denied' && nativeOnly ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              Уведомления запрещены в системе. Включите их для AI Food в настройках
              Android.
            </p>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <div className="border-b border-border px-3">
              <ToggleRow
                checked={reminders.enabled}
                onChange={(v) => void handleMasterToggle(v)}
                title="Напоминания о еде"
                description="Завтрак, обед, ужин, серия и вес"
              />
            </div>

            {reminders.enabled ? (
              <>
                <div className="border-b border-border px-3">
                  <p className="pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Приёмы пищи
                  </p>
                  <MealSlotRow
                    label="Завтрак"
                    slot="breakfast"
                    settings={reminders.breakfast}
                    onChange={setMealSlot}
                  />
                  <MealSlotRow
                    label="Обед"
                    slot="lunch"
                    settings={reminders.lunch}
                    onChange={setMealSlot}
                  />
                  <MealSlotRow
                    label="Ужин"
                    slot="dinner"
                    settings={reminders.dinner}
                    onChange={setMealSlot}
                  />
                </div>

                <div className="px-3 pb-1">
                  <p className="pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Другое
                  </p>
                  <ToggleRow
                    checked={reminders.streakAtRisk}
                    onChange={(v) => {
                      setStreakAtRisk(v);
                      queueRescheduleReminders();
                    }}
                    title="Не потерять серию"
                    description="Вечером, если сегодня ничего не записано"
                  />
                  <ToggleRow
                    checked={reminders.weightWeekly}
                    onChange={(v) => {
                      setWeightWeekly(v);
                      queueRescheduleReminders();
                    }}
                    title="Запись веса"
                    description="Раз в неделю, если давно не взвешивались"
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                <Bell className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                <span>Включите, чтобы настроить слоты и напоминания</span>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
