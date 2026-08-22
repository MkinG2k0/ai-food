import { Analytics } from '@vercel/analytics/react';
import { BootSplash } from './BootSplash';
import { Providers } from './providers';
import { AppRouter } from './router';

export function App() {
  return (
    <Providers>
      <BootSplash>
        <AppRouter />
      </BootSplash>
      <Analytics />
    </Providers>
  );
}
