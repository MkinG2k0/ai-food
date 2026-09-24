import { Outlet } from 'react-router-dom';
import { KbjuWidgetSync } from '@/features/kbju-widget';
import { ReminderLifecycle } from '@/features/reminders';
import { StreakWidgetSync } from '@/features/streak-widget';
import { BackButtonHandler } from './BackButtonHandler';
import { DeepLinkHandler } from './DeepLinkHandler';
import { StatusBarBootstrap } from './StatusBarBootstrap';

/** Centers a phone-width column on desktop; full-bleed on small screens. */
export function AppShell() {
  return (
    <div className="min-h-dvh bg-muted">
      <StatusBarBootstrap />
      <BackButtonHandler />
      <DeepLinkHandler />
      <ReminderLifecycle />
      <KbjuWidgetSync />
      <StreakWidgetSync />
      <div className="relative mx-auto min-h-dvh w-full max-w-md overflow-x-clip bg-background shadow-[0_0_0_1px_hsl(var(--border)),0_8px_40px_hsl(var(--foreground)/0.08)]">
        <Outlet />
      </div>
    </div>
  );
}
