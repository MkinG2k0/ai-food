import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  isAuthMockEnabled,
  signInWithMockTelegram,
  signOut,
  useAuthStore,
} from '@/features/auth';
import { Button, SubpageShell } from '@/shared/ui';

export function LoginPage() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const mockEnabled = isAuthMockEnabled();

  const handleMockSignIn = () => {
    if (!mockEnabled) {
      toast.message('Реальный Telegram Login Widget ещё не подключён');
      return;
    }
    signInWithMockTelegram();
    navigate('/', { replace: true });
  };

  const handleSignOut = () => {
    signOut();
    toast.success('Вы вышли');
  };

  return (
    <SubpageShell
      title="Вход"
      onBack={() => navigate(-1)}
      mainClassName="space-y-6"
    >
      {session ? (
        <section className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Вы вошли как {session.name}
            {session.username ? ` (@${session.username})` : ''}.
          </p>
          <Button className="w-full" onClick={() => navigate('/', { replace: true })}>
            На главную
          </Button>
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            Выйти
          </Button>
        </section>
      ) : (
        <section className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Гостям доступно 50 бесплатных анализов/дополнений. После лимита
            войдите через Telegram. Сейчас доступен демо-вход без сервера —
            приложение работает и без авторизации.
          </p>

          <Button
            className="w-full"
            disabled={!mockEnabled}
            onClick={handleMockSignIn}
          >
            Войти через Telegram (демо)
          </Button>

          {!mockEnabled && (
            <p className="text-sm text-muted-foreground">
              Реальный Telegram Login Widget ещё не подключён. Включите
              VITE_AUTH_MOCK=true для демо-входа.
            </p>
          )}

          {/* Future: Telegram Login Widget (domain ai-food-mobile.vercel.app) */}
          <div
            className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-center"
            aria-hidden="true"
          >
            <p className="text-sm text-muted-foreground">
              Здесь появится Telegram Login Widget
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Domain: ai-food-mobile.vercel.app
            </p>
          </div>
        </section>
      )}
    </SubpageShell>
  );
}
