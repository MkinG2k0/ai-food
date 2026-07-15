import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSettingsStore } from '@/features/settings';
import { Button, Textarea } from '@/shared/ui';

export function SettingsPage() {
  const navigate = useNavigate();
  const customInstructions = useSettingsStore((s) => s.customInstructions);
  const setCustomInstructions = useSettingsStore((s) => s.setCustomInstructions);

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

      <main className="flex-1 px-4 py-6 space-y-3">
        <div className="space-y-2">
          <label
            htmlFor="custom-instructions"
            className="text-sm font-medium leading-none"
          >
            Кастомные инструкции
          </label>
          <p className="text-sm text-muted-foreground">
            Укажите предпочтения для анализа еды: диета, единицы измерения,
            стиль ответа. Например: «веган», «всегда в граммах», «низкий
            гликемический индекс».
          </p>
          <Textarea
            id="custom-instructions"
            value={customInstructions}
            maxLength={2000}
            placeholder="Например: я веган, считай всё в граммах"
            onChange={(e) => setCustomInstructions(e.target.value)}
            className="min-h-32"
          />
          <p className="text-xs text-muted-foreground text-right">
            {customInstructions.length}/2000
          </p>
        </div>
      </main>
    </div>
  );
}
