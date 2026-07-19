import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { DietType, UserProfile } from '@ai-food/shared-types';
import { useProfileStore } from '@/features/onboarding';
import { useSettingsStore } from '@/features/settings';
import { BottomSheet, Button, Textarea } from '@/shared/ui';

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

export function SettingsPage() {
  const navigate = useNavigate();
  const [redoOpen, setRedoOpen] = useState(false);

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

  const profile = useProfileStore((s) => s.profile);
  const targets = useProfileStore((s) => s.targets);
  const resetProfile = useProfileStore((s) => s.resetProfile);

  const handleRedoConfirm = () => {
    resetProfile();
    setRedoOpen(false);
    navigate('/onboarding', { replace: true });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center px-4 py-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2">Настройки</h1>
      </header>

      <main className="flex-1 px-4 py-6 space-y-8">
        <section className="space-y-3">
          <h2 className="text-sm font-medium leading-none">Профиль</h2>
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
                  <dd className="font-medium text-right">{profile.age} лет</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Рост</dt>
                  <dd className="font-medium text-right">{profile.height} см</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Вес</dt>
                  <dd className="font-medium text-right">{profile.weight} кг</dd>
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
                    <dd className="font-medium text-right">{targets.kcal} ккал</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Белки</dt>
                    <dd className="font-medium text-right">{targets.protein} г</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Жиры</dt>
                    <dd className="font-medium text-right">{targets.fat} г</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Углеводы</dt>
                    <dd className="font-medium text-right">{targets.carbs} г</dd>
                  </div>
                </dl>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Профиль ещё не заполнен.
            </p>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setRedoOpen(true)}
          >
            Пройти анбординг заново
          </Button>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium leading-none">Анализ еды</h2>
          <p className="text-sm text-muted-foreground">
            Включённые опции показываются в приложении и запрашиваются у AI.
            Выключенные — скрыты и не входят в промпт (быстрее и дешевле).
          </p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-input"
              checked={featureVitamins}
              onChange={(e) => setFeatureVitamins(e.target.checked)}
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">Витамины и минералы</span>
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
              onChange={(e) => setFeatureHealthiness(e.target.checked)}
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
              onChange={(e) => setFeatureComposition(e.target.checked)}
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
                onChange={(e) => setCustomInstructionsEnabled(e.target.checked)}
                aria-controls="custom-instructions"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">
                  Кастомные инструкции
                </span>
                <span className="block text-sm text-muted-foreground">
                  Укажите предпочтения для анализа (диета, единицы) и
                  дополнительные запросы к блюду (рецепт, острота и т.п.). Ответ
                  на доп. запросы появится на карточке приёма в формате Markdown.
                  Выключенные инструкции не отправляются в AI; текст сохраняется.
                </span>
              </span>
            </label>
            {customInstructionsEnabled && (
              <>
                <Textarea
                  id="custom-instructions"
                  value={customInstructions}
                  maxLength={2000}
                  placeholder="Например: я веган; дай краткий рецепт"
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="min-h-32"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {customInstructions.length}/2000
                </p>
              </>
            )}
          </div>
        </section>

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
      </main>

      <BottomSheet open={redoOpen} onClose={() => setRedoOpen(false)}>
        <div className="w-full space-y-4 px-2 py-2">
          <h2 className="text-lg font-semibold text-foreground">
            Пройти анбординг заново?
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
    </div>
  );
}
