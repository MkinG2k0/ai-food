import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/shared/lib';
import { Button } from './button';

export interface SubpageShellProps {
  title: string;
  onBack: () => void;
  children: ReactNode;
  actions?: ReactNode;
  mainClassName?: string;
  headerClassName?: string;
  footer?: ReactNode;
}

/** Единый каркас внутренних страниц: отступы как на главной (bg-zinc-50, px-4, pt-safe-header). */
export function SubpageShell({
  title,
  onBack,
  children,
  actions,
  mainClassName,
  headerClassName,
  footer,
}: SubpageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50">
      <header
        className={cn(
          'flex items-center px-4 pt-safe-header pb-3',
          headerClassName,
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="ml-2 min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
          {title}
        </h1>
        {actions}
      </header>
      <main className={cn('flex-1 px-4 py-4', mainClassName)}>{children}</main>
      {footer}
    </div>
  );
}
