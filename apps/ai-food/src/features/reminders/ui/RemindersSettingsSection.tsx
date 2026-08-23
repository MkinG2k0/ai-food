import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
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
    <div className="flex flex-wrap items-center gap-3 pl-7">
      <label className="flex items-center gap-2 cursor-pointer min-w-[7rem]">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={settings.enabled}
          onChange={(e) => onChange(slot, { enabled: e.target.checked })}
        />
        <span className="text-sm">{label}</span>
      </label>
      <input
        type="time"
        className="rounded-md border border-input bg-background px-2 py-1 text-sm tabular-nums"
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
  const [open, setOpen] = useState(true);
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

  return (
    <section className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <h2 className="text-sm font-medium leading-none">Напоминания</h2>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <>
          <p className="text-sm text-muted-foreground">
            Локальные напоминания на этом устройстве. Не синхронизируются между
            телефонами.
          </p>
          {permission === 'denied' && isNativeRemindersSupported() ? (
            <p className="text-sm text-destructive">
              Уведомления запрещены в системе. Включите их для AI Food в
              настройках Android, чтобы получать напоминания.
            </p>
          ) : null}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-input"
              checked={reminders.enabled}
              onChange={(e) => void handleMasterToggle(e.target.checked)}
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">
                Напоминания о еде
              </span>
              <span className="block text-sm text-muted-foreground">
                Завтрак, обед, ужин, серия и вес
              </span>
            </span>
          </label>
          {reminders.enabled ? (
            <div className="space-y-3 rounded-md border border-border px-3 py-3">
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
              <label className="flex items-start gap-3 cursor-pointer pl-7">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={reminders.streakAtRisk}
                  onChange={(e) => {
                    setStreakAtRisk(e.target.checked);
                    queueRescheduleReminders();
                  }}
                />
                <span className="text-sm">Не потерять серию</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer pl-7">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={reminders.weightWeekly}
                  onChange={(e) => {
                    setWeightWeekly(e.target.checked);
                    queueRescheduleReminders();
                  }}
                />
                <span className="text-sm">Запись веса (раз в неделю)</span>
              </label>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
