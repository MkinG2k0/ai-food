import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import type { DailyTargets, DietType, UserProfile } from '@ai-food/shared-types';
import { recoverStaleAnalyzingMeals, useDiaryStore } from '@/entities/meal';
import { signOut, useAuthStore, useUsage } from '@/features/auth';
import { useBillingStatus } from '@/features/billing';
import { ReferralCodeBlock } from '@/features/referral';
import { useFavoritesStore } from '@/features/favorites';
import {
  syncNutritionProfileToServer,
  useProfileStore,
} from '@/features/onboarding';
import {
  AppDataBackupError,
  buildAppDataExport,
  downloadAppDataJson,
  parseAppDataExport,
  readJsonFile,
  snapshotFromExport,
  useSettingsStore,
  type CalendarRingKey,
} from '@/features/settings';
import {
  flushSettingsSync,
  queueSettingsSync,
  SETTINGS_SYNC_DEBOUNCE_MS,
} from '@/features/settings-sync';
import { NutritionReportSheet } from '@/features/nutrition-report';
import { useWeightStore } from '@/features/stats';
import { cn, getLegalUrl } from '@/shared/lib';
import { BottomSheet, Button, SubpageShell, TextareaWithVoice } from '@/shared/ui';

const CALENDAR_RING_TOGGLES: { key: CalendarRingKey; label: string }[] = [
  { key: 'kcal', label: 'К' },
  { key: 'protein', label: 'Б' },
  { key: 'fat', label: 'Ж' },
  { key: 'carbs', label: 'У' },
];

const GENDER_LABELS: Record<UserProfile['gender'], string> = {
  male: 'Мужской',
  female: 'Женский',
};

const ACTIVITY_LABELS: Record<UserProfile['activity'], string> = {
  low: 'Низкая',
  medium: 'Средняя',
  high: 'Высокая',
};

const GOAL_LABELS: Record<UserProfile['goal'], string> = {
  lose: 'Похудеть',
  maintain: 'Поддержать вес',
  gain: 'Набрать массу',
};

const DIET_LABELS: Record<DietType, string> = {
  none: 'Без ограничений',
  halal: 'Халяль',
  vegan: 'Веган',
  vegetarian: 'Вегетарианство',
};

const targetInputClassName = cn(
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums',
  'ring-offset-background placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
);

function parseTargetValue(raw: string): number {
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

type TargetDraft = {
  kcal: string;
  protein: string;
  fat: string;
  carbs: string;
};

function draftFromTargets(targets: DailyTargets): TargetDraft {
  return {
    kcal: String(targets.kcal),
    protein: String(targets.protein),
    fat: String(targets.fat),
    carbs: String(targets.carbs),
  };
}

export function SettingsPage() {
  const navigate = useNavigate();
  const [redoOpen, setRedoOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editTargetsOpen, setEditTargetsOpen] = useState(false);
  const [targetDraft, setTargetDraft] = useState<TargetDraft | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<ReturnType<
    typeof parseAppDataExport
  > | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const termsUrl = getLegalUrl('/terms');
  const privacyUrl = getLegalUrl('/privacy');
  const refundsUrl = getLegalUrl('/refunds');

  const customInstructions = useSettingsStore((s) => s.customInstructions);
  const setCustomInstructions = useSettingsStore((s) => s.setCustomInstructions);
  const customInstructionsEnabled = useSettingsStore(
    (s) => s.customInstructionsEnabled,
  );
  const setCustomInstructionsEnabled = useSettingsStore(
    (s) => s.setCustomInstructionsEnabled,
  );
  const featureVitamins = useSettingsStore((s) => s.featureVitamins);
  const setFeatureVitamins = useSettingsStore((s) => s.setFeatureVitamins);
  const featureHealthiness = useSettingsStore((s) => s.featureHealthiness);
  const setFeatureHealthiness = useSettingsStore((s) => s.setFeatureHealthiness);
  const featureComposition = useSettingsStore((s) => s.featureComposition);
  const setFeatureComposition = useSettingsStore((s) => s.setFeatureComposition);
  const calendarRings = useSettingsStore((s) => s.calendarRings);
  const setCalendarRing = useSettingsStore((s) => s.setCalendarRing);

  useEffect(() => {
    return () => {
      flushSettingsSync();
    };
  }, []);

  const queueSettingsSoon = () => {
    queueSettingsSync({ debounceMs: SETTINGS_SYNC_DEBOUNCE_MS });
  };

  const profile = useProfileStore((s) => s.profile);
  const targets = useProfileStore((s) => s.targets);
  const updateTargets = useProfileStore((s) => s.updateTargets);
  const resetProfile = useProfileStore((s) => s.resetProfile);

  const session = useAuthStore((s) => s.session);
  const userToken = useAuthStore((s) => s.userToken);
  const { data: usage } = useUsage();
  const { data: billing } = useBillingStatus(Boolean(userToken));

  const handleSignOut = () => {
    signOut();
    toast.success('Вы вышли');
    navigate('/onboarding', { replace: true });
  };

  const handleRedoConfirm = () => {
    resetProfile();
    setRedoOpen(false);
    navigate('/onboarding', { replace: true });
  };

  const handleOpenEditTargets = () => {
    if (!targets) return;
    setTargetDraft(draftFromTargets(targets));
    setEditTargetsOpen(true);
  };

  const handleCloseEditTargets = () => {
    setEditTargetsOpen(false);
    setTargetDraft(null);
  };

  const handleSaveTargets = () => {
    if (!targets || !targetDraft) return;
    const next: DailyTargets = {
      kcal: parseTargetValue(targetDraft.kcal),
      protein: parseTargetValue(targetDraft.protein),
      fat: parseTargetValue(targetDraft.fat),
      carbs: parseTargetValue(targetDraft.carbs),
      fiber: targets.fiber,
    };
    if (next.kcal <= 0) {
      toast.error('Укажите калории больше нуля');
      return;
    }
    updateTargets(next);
    syncNutritionProfileToServer();
    handleCloseEditTargets();
    toast.success('Цели обновлены');
  };

  const handleExport = async () => {
    setBackupBusy(true);
    try {
      const settings = useSettingsStore.getState();
      const profileState = useProfileStore.getState();
      const data = buildAppDataExport({
        meals: useDiaryStore.getState().meals,
        profile: profileState.profile,
        targets: profileState.targets,
        micronutrientTargets: profileState.micronutrientTargets,
        settings: {
          customInstructions: settings.customInstructions,
          customInstructionsEnabled: settings.customInstructionsEnabled,
          aiModel: settings.aiModel,
          featureVitamins: settings.featureVitamins,
          featureHealthiness: settings.featureHealthiness,
          featureComposition: settings.featureComposition,
          calendarRings: settings.calendarRings,
        },
        favorites: useFavoritesStore.getState().favorites,
        weightEntries: useWeightStore.getState().entries,
        weightGoalKg: useWeightStore.getState().goalKg,
      });
      await downloadAppDataJson(data);
      toast.success(
        Capacitor.isNativePlatform()
          ? 'Бэкап сохранён в Документы'
          : 'Бэкап скачан',
      );
    } catch (err) {
      const message =
        err instanceof AppDataBackupError
          ? err.message
          : 'Не удалось экспортировать данные';
      toast.error(message);
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    setBackupBusy(true);
    try {
      const raw = await readJsonFile(file);
      const data = parseAppDataExport(raw);
      setPendingImport(data);
      setImportOpen(true);
    } catch (err) {
      const message =
        err instanceof AppDataBackupError
          ? err.message
          : 'Не удалось прочитать файл';
      toast.error(message);
    } finally {
      setBackupBusy(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handleImportConfirm = () => {
    if (!pendingImport) return;
    const snapshot = snapshotFromExport(pendingImport);

    useDiaryStore.setState({ meals: snapshot.meals });
    recoverStaleAnalyzingMeals();

    useProfileStore.setState({
      profile: snapshot.profile,
      targets: snapshot.targets,
      micronutrientTargets: snapshot.micronutrientTargets,
    });
    syncNutritionProfileToServer();

    useSettingsStore.setState({
      customInstructions: snapshot.settings.customInstructions.slice(0, 2000),
      customInstructionsEnabled: snapshot.settings.customInstructionsEnabled,
      aiModel: snapshot.settings.aiModel,
      featureVitamins: snapshot.settings.featureVitamins,
      featureHealthiness: snapshot.settings.featureHealthiness,
      featureComposition: snapshot.settings.featureComposition,
      calendarRings: snapshot.settings.calendarRings,
      clientUpdatedAt: new Date().toISOString(),
    });
    queueSettingsSync();

    useFavoritesStore.setState({ favorites: snapshot.favorites });
    useWeightStore.setState({
      entries: snapshot.weightEntries,
      goalKg: snapshot.weightGoalKg,
    });

    setImportOpen(false);
    setPendingImport(null);
    toast.success('Данные импортированы');
  };

  return (
    <>
    <SubpageShell
      title="Настройки"
      onBack={() => navigate('/')}
      mainClassName="space-y-8"
    >
        <section className="space-y-3">
          {usage && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {usage.hasActiveSubscription ||
                billing?.hasActiveSubscription ||
                usage.remaining === null
                  ? 'AI-генерации: безлимит (лицензия)'
                  : `Осталось ${usage.remaining} из ${usage.limit} бесплатных генераций`}
              </p>
              {!usage.hasActiveSubscription &&
                !billing?.hasActiveSubscription &&
                usage.remaining !== null &&
                usage.limit > 0 && (
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={usage.limit}
                    aria-valuenow={usage.remaining}
                    aria-label="Остаток бесплатных генераций"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, (usage.remaining / usage.limit) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                )}
            </div>
          )}
          <div className="space-y-3 rounded-md border border-border px-3 py-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Аккаунт</p>
              {userToken ? (
                billing?.hasActiveSubscription ? (
                  <p className="text-sm text-muted-foreground">
                    Лицензия активна
                    {billing.subscriptionExpiresAt
                      ? ` до ${new Date(billing.subscriptionExpiresAt).toLocaleDateString('ru-RU')}`
                      : ''}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Нет активной лицензии — после бесплатного лимита нужен год
                    доступа к AI
                  </p>
                )
              ) : null}
            </div>
            {userToken ? <ReferralCodeBlock /> : null}
            {session ? (
              <>
                <div className="flex items-center gap-3">
                  <img
                    src={session.photo_url}
                    alt={session.name}
                    className="h-10 w-10 rounded-full object-cover bg-muted"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{session.name}</p>
                    {session.username ? (
                      <p className="truncate text-sm text-muted-foreground">
                        @{session.username}
                      </p>
                    ) : null}
                  </div>
                </div>
                {userToken && !billing?.hasActiveSubscription ? (
                  <Button
                    className="w-full"
                    onClick={() => navigate('/subscribe')}
                  >
                    Оформить лицензию
                  </Button>
                ) : null}
                <Button variant="outline" className="w-full" onClick={handleSignOut}>
                  Выйти
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Войти
              </Button>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
          >
            <h2 className="text-sm font-medium leading-none">Профиль</h2>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                profileOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {profileOpen && (
            <>
              {profile ? (
                <>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Пол</dt>
                      <dd className="font-medium text-right">
                        {GENDER_LABELS[profile.gender]}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Возраст</dt>
                      <dd className="font-medium text-right">
                        {profile.age} лет
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Рост</dt>
                      <dd className="font-medium text-right">
                        {profile.height} см
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Вес</dt>
                      <dd className="font-medium text-right">
                        {profile.weight} кг
                      </dd>
                    </div>
                    {profile.targetWeight != null && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Желаемый вес</dt>
                        <dd className="font-medium text-right">
                          {profile.targetWeight} кг
                        </dd>
                      </div>
                    )}
                    {profile.targetWeightDate ? (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Срок</dt>
                        <dd className="font-medium text-right">
                          {new Date(
                            `${profile.targetWeightDate}T12:00:00`,
                          ).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Активность</dt>
                      <dd className="font-medium text-right">
                        {ACTIVITY_LABELS[profile.activity]}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Цель</dt>
                      <dd className="font-medium text-right">
                        {GOAL_LABELS[profile.goal]}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Тип питания</dt>
                      <dd className="font-medium text-right">
                        {DIET_LABELS[profile.dietType ?? 'none']}
                      </dd>
                    </div>
                  </dl>
                  {targets && (
                    <dl className="space-y-2 text-sm pt-2 border-t">
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Калории</dt>
                        <dd className="font-medium text-right">
                          {targets.kcal} ккал
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Белки</dt>
                        <dd className="font-medium text-right">
                          {targets.protein} г
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Жиры</dt>
                        <dd className="font-medium text-right">
                          {targets.fat} г
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Углеводы</dt>
                        <dd className="font-medium text-right">
                          {targets.carbs} г
                        </dd>
                      </div>
                    </dl>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Профиль ещё не заполнен.
                </p>
              )}
              {targets && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleOpenEditTargets}
                >
                  Изменить КБЖУ
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setRedoOpen(true)}
              >
                Пройти онбординг заново
              </Button>
            </>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium leading-none">Кольца календаря</h2>
          <p className="text-sm text-muted-foreground">
            Выберите, какие прогресс-кольца показывать вокруг даты на главной —
            любая комбинация КБЖУ.
          </p>
          <div
            className="flex rounded-lg border border-input p-1 gap-1"
            role="group"
            aria-label="Кольца календаря"
          >
            {CALENDAR_RING_TOGGLES.map((option) => {
              const selected = calendarRings[option.key];
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={selected}
                  className={cn(
                    'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => {
                    setCalendarRing(option.key, !selected);
                    queueSettingsSoon();
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-expanded={analysisOpen}
            onClick={() => setAnalysisOpen((open) => !open)}
          >
            <h2 className="text-sm font-medium leading-none">Анализ еды</h2>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                analysisOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {analysisOpen && (
            <>
              <p className="text-sm text-muted-foreground">
                Включённые опции показываются в приложении и запрашиваются у AI.
                Выключенные — скрыты и не входят в промпт (быстрее и дешевле).
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={featureVitamins}
                  onChange={(e) => {
                    setFeatureVitamins(e.target.checked);
                    queueSettingsSoon();
                  }}
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">
                    Витамины и минералы
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    Микронутриенты в карточке приёма и в статистике
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={featureHealthiness}
                  onChange={(e) => {
                    setFeatureHealthiness(e.target.checked);
                    queueSettingsSoon();
                  }}
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">Полезность</span>
                  <span className="block text-sm text-muted-foreground">
                    Оценка полезности блюда по шкале 1–10
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input"
                  checked={featureComposition}
                  onChange={(e) => {
                    setFeatureComposition(e.target.checked);
                    queueSettingsSoon();
                  }}
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">Состав</span>
                  <span className="block text-sm text-muted-foreground">
                    Разбивка блюда на ингредиенты и слои
                  </span>
                </span>
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-input"
                    checked={customInstructionsEnabled}
                    onChange={(e) => {
                      setCustomInstructionsEnabled(e.target.checked);
                      queueSettingsSoon();
                    }}
                    aria-controls="custom-instructions"
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">
                      Кастомные инструкции
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      Укажите предпочтения для анализа (диета, единицы) и
                      дополнительные запросы к блюду (рецепт, острота и т.п.).
                      Ответ на доп. запросы появится на карточке приёма в
                      формате Markdown. Выключенные инструкции не отправляются
                      в AI; текст сохраняется.
                    </span>
                  </span>
                </label>
                {customInstructionsEnabled && (
                  <>
                    <TextareaWithVoice
                      id="custom-instructions"
                      value={customInstructions}
                      maxLength={2000}
                      placeholder="Например: я веган; дай краткий рецепт"
                      onChange={(e) => {
                        setCustomInstructions(e.target.value);
                        queueSettingsSoon();
                      }}
                      className="min-h-32"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {customInstructions.length}/2000
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium leading-none">Отчёты</h2>
          <p className="text-sm text-muted-foreground">
            PDF со сводкой по калориям, БЖУ, весу и дневником питания за период.
            Генерируется локально на устройстве.
          </p>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setReportOpen(true)}
          >
            Отчёт о питании
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </section>

        <section className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-expanded={dataOpen}
            onClick={() => setDataOpen((open) => !open)}
          >
            <h2 className="text-sm font-medium leading-none">Данные</h2>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                dataOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {dataOpen && (
            <>
              <p className="text-sm text-muted-foreground">
                После входа дневник, профиль, настройки, вес и избранное
                синхронизируются между устройствами. Фото приёмов намеренно
                остаются только на этом устройстве и в облако не уходят.
                Экспорт JSON — ручной бэкап (включая локальные ссылки на
                фото). Импорт полностью заменит текущие данные на устройстве.
              </p>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => void handleImportFile(e.target.files?.[0])}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={backupBusy}
                  onClick={() => void handleExport()}
                >
                  Экспорт JSON
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={backupBusy}
                  onClick={() => importInputRef.current?.click()}
                >
                  Импорт JSON
                </Button>
              </div>
            </>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium leading-none">О приложении</h2>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => navigate('/news')}
          >
            Новости
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
          {termsUrl ? (
            <Button variant="outline" className="w-full justify-between" asChild>
              <a href={termsUrl} target="_blank" rel="noopener noreferrer">
                Условия
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            </Button>
          ) : (
            <Button variant="outline" className="w-full justify-between" disabled>
              Условия
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          )}
          {privacyUrl ? (
            <Button variant="outline" className="w-full justify-between" asChild>
              <a href={privacyUrl} target="_blank" rel="noopener noreferrer">
                Приватность
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            </Button>
          ) : (
            <Button variant="outline" className="w-full justify-between" disabled>
              Приватность
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          )}
          {refundsUrl ? (
            <Button variant="outline" className="w-full justify-between" asChild>
              <a href={refundsUrl} target="_blank" rel="noopener noreferrer">
                Возврат
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            </Button>
          ) : (
            <Button variant="outline" className="w-full justify-between" disabled>
              Возврат
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          )}
          <Button variant="outline" className="w-full justify-between" asChild>
            <a
              href="https://t.me/double_cumboy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Telegram
              <span className="text-muted-foreground">@double_cumboy</span>
            </a>
          </Button>
        </section>

        {import.meta.env.DEV && (
          <section className="space-y-2 pt-2 border-t">
            <h2 className="text-sm font-medium leading-none">Разработка</h2>
            <p className="text-sm text-muted-foreground">
              Сравнение AI-моделей по эталонным фото (КБЖУ).
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/model-test')}
            >
              Тест моделей
            </Button>
          </section>
        )}
    </SubpageShell>

      <BottomSheet open={editTargetsOpen} onClose={handleCloseEditTargets}>
        <div className="w-full space-y-4 px-2 py-2">
          <h2 className="text-lg font-semibold text-foreground">
            Изменить КБЖУ
          </h2>
          <p className="text-sm text-muted-foreground">
            Задайте свои дневные нормы КБЖУ — они заменят рассчитанные
            значения.
          </p>
          {targetDraft && (
            <div className="space-y-3">
              {(
                [
                  ['kcal', 'Калории, ккал'],
                  ['protein', 'Белки, г'],
                  ['fat', 'Жиры, г'],
                  ['carbs', 'Углеводы, г'],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="block space-y-1.5">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    aria-label={label}
                    className={targetInputClassName}
                    value={targetDraft[field]}
                    onChange={(e) =>
                      setTargetDraft((prev) =>
                        prev ? { ...prev, [field]: e.target.value } : prev,
                      )
                    }
                  />
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCloseEditTargets}
            >
              Отмена
            </Button>
            <Button className="flex-1" onClick={handleSaveTargets}>
              Сохранить
            </Button>
          </div>
        </div>
      </BottomSheet>

      <NutritionReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />

      <BottomSheet open={redoOpen} onClose={() => setRedoOpen(false)}>
        <div className="w-full space-y-4 px-2 py-2">
          <h2 className="text-lg font-semibold text-foreground">
            Пройти онбординг заново?
          </h2>
          <p className="text-sm text-muted-foreground">
            Текущие цели будут сброшены и рассчитаны заново после заполнения
            профиля. Дневник приёмов пищи и кастомные инструкции сохранятся.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setRedoOpen(false)}
            >
              Отмена
            </Button>
            <Button className="flex-1" onClick={handleRedoConfirm}>
              Пройти заново
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setPendingImport(null);
        }}
      >
        <div className="w-full space-y-4 px-2 py-2">
          <h2 className="text-lg font-semibold text-foreground">
            Заменить данные?
          </h2>
          <p className="text-sm text-muted-foreground">
            Импорт перезапишет дневник ({pendingImport?.diary.meals.length ?? 0}{' '}
            приёмов), профиль, настройки, избранное (
            {pendingImport?.favorites.favorites.length ?? 0}) и вес. Это
            нельзя отменить.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setImportOpen(false);
                setPendingImport(null);
              }}
            >
              Отмена
            </Button>
            <Button className="flex-1" onClick={handleImportConfirm}>
              Импортировать
            </Button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
