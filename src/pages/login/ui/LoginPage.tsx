import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  GUEST_FREE_USAGE_LIMIT,
  isAuthMockEnabled,
  signInWithMockTelegram,
  signOut,
  TelegramLoginButton,
  useAuthStore,
} from '@/features/auth';
import { Button, SubpageShell } from '@/shared/ui';

export function LoginPage() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const mockEnabled = isAuthMockEnabled();

  const handleMockSignIn = () => {
    if (!mockEnabled) {
      toast.message('Демо-вход выключен (VITE_AUTH_MOCK=false)');
      return;
    }
    signInWithMockTelegram();
    navigate('/', { replace: true });
  };

  const handleSignOut = () => {
    signOut();
    toast.success('Вы вышли');
  };

  const handleTelegramSuccess = () => {
    toast.success('Вход выполнен');
    navigate('/', { replace: true });
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
            Гостям доступно {GUEST_FREE_USAGE_LIMIT} бесплатных
            анализов/дополнений. После лимита войдите через Telegram, затем
            при необходимости оформите годовую лицензию. Дневник, ручной ввод и
            статистика работают без оплаты.
          </p>

          <div className="rounded-md border border-border bg-card px-4 py-5">
            <p className="mb-3 text-center text-sm font-medium">Telegram</p>
            <TelegramLoginButton
              onSuccess={handleTelegramSuccess}
              onError={(message) => toast.error(message)}
            />
          </div>

          {mockEnabled && (
            <Button variant="outline" className="w-full" onClick={handleMockSignIn}>
              Войти (демо, без сервера)
            </Button>
          )}
        </section>
      )}
    </SubpageShell>
  );
}
