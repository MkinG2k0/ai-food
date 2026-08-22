import { BootSplash } from './BootSplash';
import { Providers } from './providers';
import { AppRouter } from './router';

export function App() {
  return (
    <Providers>
      <BootSplash>
        <AppRouter />
      </BootSplash>
    </Providers>
  );
}
