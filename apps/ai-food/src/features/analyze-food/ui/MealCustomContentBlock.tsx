import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ApiError } from '@ai-food/shared-types';
import { cn } from '@/shared/lib';
import { Button, Skeleton, Textarea } from '@/shared/ui';
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
  const {
    slides,
    activeSlide,
    activeIndex,
    canGoPrev,
    canGoNext,
    goPrev,
    goNext,
    isLoading,
    isError,
    refetch,
    askQuestion,
    isAsking,
  } = useMealCustomContent(mealId);

  const [question, setQuestion] = useState('');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [activeIndex]);

  async function handleAsk(e: FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isAsking) return;
    try {
      await askQuestion(trimmed);
      setQuestion('');
    } catch (error) {
      const apiError = error as Partial<ApiError>;
      toast.error(apiError.message ?? 'Не удалось получить ответ.');
    }
  }

  async function handleCopy() {
    if (!activeSlide?.content) return;
    try {
      await navigator.clipboard.writeText(activeSlide.content);
      setCopied(true);
      toast.success('Ответ скопирован');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Не удалось скопировать');
    }
  }

  return (
    <section className="space-y-3" aria-label="Спросить о блюде">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="font-semibold text-foreground flex items-center gap-2 min-w-0 text-left"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-controls="meal-custom-content-body"
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              !expanded && '-rotate-90',
            )}
          />
          Спросить о блюде
          {(isLoading || isAsking) && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </button>
        {expanded && slides.length > 1 && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!canGoPrev}
              onClick={goPrev}
              aria-label="Предыдущий ответ"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums min-w-[2.5rem] text-center">
              {activeIndex + 1}/{slides.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!canGoNext}
              onClick={goNext}
              aria-label="Следующий ответ"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {expanded && (
        <div id="meal-custom-content-body" className="space-y-3">
          {isError && slides.length === 0 && (
            <div className="space-y-2">
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
            </div>
          )}

          {isLoading && slides.length === 0 && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[83%]" />
              <Skeleton className="h-4 w-[66%]" />
            </div>
          )}

          {activeSlide && (
            <div className="relative rounded-lg border border-border bg-muted/30 px-3 py-3 pb-10 space-y-2">
              {activeSlide.question && (
                <p className="text-xs text-muted-foreground">
                  Вопрос: {activeSlide.question}
                </p>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {activeSlide.content}
              </ReactMarkdown>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute bottom-1.5 right-1.5 h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => void handleCopy()}
                aria-label="Скопировать ответ"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          <form onSubmit={(e) => void handleAsk(e)} className="space-y-2">
            <label htmlFor="meal-custom-question" className="sr-only">
              Вопрос по блюду
            </label>
            <Textarea
              id="meal-custom-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Например: как приготовить это блюдо?"
              className="min-h-20"
              disabled={isAsking}
              maxLength={500}
            />
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={isAsking || !question.trim()}
            >
              {isAsking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ищем ответ…
                </>
              ) : (
                'Узнать'
              )}
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
