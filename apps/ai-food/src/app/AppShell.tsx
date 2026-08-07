import { Outlet } from 'react-router-dom';
import { KbjuWidgetSync } from '@/features/kbju-widget';
import { BackButtonHandler } from './BackButtonHandler';
import { DeepLinkHandler } from './DeepLinkHandler';

/** Centers a phone-width column on desktop; full-bleed on small screens. */
export function AppShell() {
  return (
    <div className="min-h-dvh bg-zinc-200/90">
      <BackButtonHandler />
      <DeepLinkHandler />
      <KbjuWidgetSync />
      <div className="relative mx-auto min-h-dvh w-full max-w-md overflow-x-clip bg-zinc-50 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_8px_40px_rgba(0,0,0,0.08)]">
        <Outlet />
      </div>
    </div>
  );
}
