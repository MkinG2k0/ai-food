import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2 } from 'lucide-react';
import { Button, Skeleton } from '@/shared/ui';
import { useMealCustomContent } from '../model/useMealCustomContent';

interface MealCustomContentBlockProps {
  mealId: string;
}

const markdownComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h3 className="text-base font-semibold mt-3 mb-1 first:mt-0">{children}</h3>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h3 className="text-base font-semibold mt-3 mb-1 first:mt-0">{children}</h3>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="text-sm text-foreground leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="list-disc pl-5 space-y-1 text-sm mb-2 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="list-decimal pl-5 space-y-1 text-sm mb-2 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="text-sm text-foreground leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ children }: { children?: ReactNode }) => (
    <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>
  ),
};

export function MealCustomContentBlock({ mealId }: MealCustomContentBlockProps) {
  const { instructions, content, isLoading, isError, refetch } =
    useMealCustomContent(mealId);

  if (!instructions) {
    return null;
  }

  if (content !== undefined && content.trim() === '') {
    return null;
  }

  if (content !== undefined && content.trim().length > 0) {
    return (
      <section className="space-y-3" aria-label="Дополнительно">
        <h2 className="font-semibold text-foreground">Дополнительно</h2>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-3">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {content}
          </ReactMarkdown>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="space-y-3" aria-label="Дополнительно">
        <h2 className="font-semibold text-foreground">Дополнительно</h2>
        <p className="text-sm text-muted-foreground">
          Не удалось загрузить доп. ответ.
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void refetch()}
        >
          Повторить
        </Button>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="space-y-3" aria-label="Дополнительно">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          Дополнительно
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </h2>
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[83%]" />
          <Skeleton className="h-4 w-[66%]" />
        </div>
      </section>
    );
  }

  return null;
}
