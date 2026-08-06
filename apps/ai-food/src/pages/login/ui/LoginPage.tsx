import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  type AuthLoginResult,
  isAuthMockEnabled,
  signInWithDemo,
  signOut,
  TelegramBotLoginButton,
  useAuthStore,
  useUsage,
} from '@/features/auth';
import {
  applyRemoteNutritionProfile,
  useProfileStore,
} from '@/features/onboarding';
import { Button, SubpageShell } from '@/shared/ui';

export function LoginPage() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const mockEnabled = isAuthMockEnabled();
  const { data: usage } = useUsage();
  const freeLimit = usage.freeGenerationLimit;
  const loginBonus = usage.authLoginGenerationBonus;
  const totalAfterLogin = freeLimit + loginBonus;

  const handleLoginSuccess = (result: AuthLoginResult) => {
    if (result.nutritionProfile) {
      applyRemoteNutritionProfile(result.nutritionProfile);
      toast.success('С возвращением');
      navigate('/', { replace: true });
      return;
    }
    toast.success('Вход выполнен');
    const hasLocal = useProfileStore.getState().profile !== null;
    navigate(hasLocal ? '/' : '/onboarding', { replace: true });
  };

  const handleDemoSignIn = async () => {
    if (!mockEnabled) {
      toast.message('Демо-вход выключен (VITE_AUTH_MOCK=false)');
      return;
    }
    try {
      const result = await signInWithDemo();
      handleLoginSuccess(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Демо-вход не удался');
    }
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
            Гостям доступно {freeLimit} бесплатных анализов/дополнений. После
            входа через Telegram — ещё {loginBonus} (итого {totalAfterLogin}).
            Когда лимит кончится, оформите годовую лицензию. Дневник, ручной
            ввод и статистика работают без оплаты.
          </p>

          <div className="rounded-md border border-border bg-card px-4 py-5">
            <p className="mb-3 text-center text-sm font-medium">Telegram</p>
            <TelegramBotLoginButton
              onSuccess={handleLoginSuccess}
              onError={(message) => toast.error(message)}
            />
          </div>

          {mockEnabled && (
            <Button variant="outline" className="w-full" onClick={() => void handleDemoSignIn()}>
              Войти (демо)
            </Button>
          )}
        </section>
      )}
    </SubpageShell>
  );
}
