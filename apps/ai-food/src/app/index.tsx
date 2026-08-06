import { Analytics } from '@vercel/analytics/react';
import { Providers } from './providers';
import { AppRouter } from './router';

export function App() {
  return (
    <Providers>
      <AppRouter />
      <Analytics />
    </Providers>
  );
}
