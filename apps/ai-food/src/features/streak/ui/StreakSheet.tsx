import { Flame, Shield, Target } from 'lucide-react';
import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from 'framer-motion';
import type { StreakSnapshot, StreakTrackSnapshot, StreakWeekDay } from '@/entities/streak';
import { streakDaysLabel } from '@/entities/streak';
import { cn, useAnimatedNumber } from '@/shared/lib';
import { BottomSheet, Button, RING_COLORS } from '@/shared/ui';

const LOGGING_FILL = RING_COLORS.kcal;
const CALORIE_FILL = RING_COLORS.protein;

const TRACK = {
  logging: {
    title: 'Дневник',
    short: 'Еда',
    rule: 'Хотя бы одна запись еды за день',
    accent: LOGGING_FILL,
    Icon: Flame,
  },
  calorie: {
    title: 'Норма калорий',
    short: 'Норма',
    rule: 'Калории за день в пределах вашей нормы',
    accent: CALORIE_FILL,
    Icon: Target,
  },
} as const;

type TrackKind = keyof typeof TRACK;

export interface StreakSheetProps {
  open: boolean;
  onClose: () => void;
  snapshot: StreakSnapshot;
}

const EASE_OUT: Transition['ease'] = [0.22, 1, 0.36, 1];
const STAGGER = 0.09;

function formatStartDate(date: Date | null): string {
  if (!date) return 'Ещё не началась';
  return `С ${date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })}`;
}

function freezeHint(count: number): string {
  if (count <= 0) {
    return 'Появится за длинную серию — тогда можно пропустить день';
  }
  return `Можно пропустить ${count} ${streakDaysLabel(count)} — серия сохранится`;
}

function buildVariants(reducedMotion: boolean | null): {
  container: Variants;
  item: Variants;
  day: Variants;
  progress: Transition;
} {
  if (reducedMotion) {
    return {
      container: {},
      item: {},
      day: {},
      progress: { duration: 0 },
    };
  }

  return {
    container: {
      hidden: {},
      show: {
        transition: { staggerChildren: STAGGER, delayChildren: 0.12 },
      },
    },
    item: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { duration: 0.5, ease: EASE_OUT },
      },
    },
    day: {
      hidden: { opacity: 0, scale: 0.55 },
      show: (i: number) => ({
        opacity: 1,
        scale: 1,
        transition: {
          delay: 0.28 + i * 0.04,
          type: 'spring',
          stiffness: 420,
          damping: 22,
        },
      }),
    },
    progress: { duration: 0.95, delay: 0.55, ease: EASE_OUT },
  };
}

function HeroTile({
  kind,
  length,
  reducedMotion,
}: {
  kind: TrackKind;
  length: number;
  reducedMotion: boolean | null;
}) {
  const meta = TRACK[kind];
  const Icon = meta.Icon;
  const animated = useAnimatedNumber(length, {
    skipInitial: false,
    duration: 1.15,
    delay: 0.25,
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-2xl border bg-card px-3 py-4 text-center shadow-sm">
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.35, rotate: -18 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 16 }}
      >
        <Icon className="h-6 w-6" style={{ color: meta.accent }} aria-hidden />
      </motion.div>
      <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight">
        {animated}
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {streakDaysLabel(length)} подряд
      </p>
      <p className="mt-2 text-sm font-medium leading-tight">{meta.title}</p>
    </div>
  );
}

function WeekDot({
  filled,
  accent,
  label,
}: {
  filled: boolean;
  accent: string;
  label: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto h-7 w-7 rounded-full',
        filled ? '' : 'border border-muted bg-transparent',
      )}
      style={filled ? { backgroundColor: accent } : undefined}
      aria-label={label}
    />
  );
}

function DualWeek({
  loggingDays,
  calorieDays,
  variants,
}: {
  loggingDays: StreakWeekDay[];
  calorieDays: StreakWeekDay[];
  variants: ReturnType<typeof buildVariants>;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-foreground">Эта неделя</p>
      <p className="mb-3 text-xs text-muted-foreground">
        Две отдельные серии — заполненный кружок значит, что день засчитан
      </p>
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] items-center gap-x-1 gap-y-2.5">
        <span aria-hidden />
        {loggingDays.map((day) => (
          <span
            key={`label-${day.label}`}
            className="text-center text-[11px] text-muted-foreground"
          >
            {day.label}
          </span>
        ))}

        <span className="flex items-center gap-1 text-[11px] font-medium text-foreground">
          <Flame className="h-3 w-3 shrink-0" style={{ color: LOGGING_FILL }} aria-hidden />
          {TRACK.logging.short}
        </span>
        {loggingDays.map((day, index) => (
          <motion.div key={`log-${day.label}`} variants={variants.day} custom={index}>
            <WeekDot
              filled={day.filled}
              accent={LOGGING_FILL}
              label={`${TRACK.logging.title}, ${day.label}: ${day.filled ? 'да' : 'нет'}`}
            />
          </motion.div>
        ))}

        <span className="flex items-center gap-1 text-[11px] font-medium text-foreground">
          <Target className="h-3 w-3 shrink-0" style={{ color: CALORIE_FILL }} aria-hidden />
          {TRACK.calorie.short}
        </span>
        {calorieDays.map((day, index) => (
          <motion.div key={`cal-${day.label}`} variants={variants.day} custom={index}>
            <WeekDot
              filled={day.filled}
              accent={CALORIE_FILL}
              label={`${TRACK.calorie.title}, ${day.label}: ${day.filled ? 'да' : 'нет'}`}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function NextGoalBar({
  track,
  accent,
  reducedMotion,
  progress,
}: {
  track: StreakTrackSnapshot;
  accent: string;
  reducedMotion: boolean | null;
  progress: Transition;
}) {
  const previousMilestone =
    track.achieved100 || track.nextMilestone === null
      ? 100
      : track.nextMilestone - track.remainingDays;
  const animatedRemaining = useAnimatedNumber(track.remainingDays, {
    skipInitial: false,
    duration: 0.75,
    delay: 0.58,
  });
  const goal = track.nextMilestone ?? previousMilestone;

  return (
    <div>
      {track.achieved100 ? (
        <p className="text-sm font-medium text-foreground">100 дней достигнуто</p>
      ) : (
        <p className="text-sm font-medium text-foreground">
          Ещё {animatedRemaining} {streakDaysLabel(track.remainingDays)} до {goal}
        </p>
      )}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: accent }}
          initial={{
            width: reducedMotion
              ? `${Math.round(track.progress01 * 100)}%`
              : '0%',
          }}
          animate={{ width: `${Math.round(track.progress01 * 100)}%` }}
          transition={progress}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">следующая цель</p>
    </div>
  );
}

function TrackCard({
  kind,
  track,
  reducedMotion,
  progress,
}: {
  kind: TrackKind;
  track: StreakTrackSnapshot;
  reducedMotion: boolean | null;
  progress: Transition;
}) {
  const meta = TRACK[kind];
  const Icon = meta.Icon;
  const animatedBest = useAnimatedNumber(track.bestStreak, {
    skipInitial: false,
    duration: 0.85,
    delay: 0.5,
  });

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: meta.accent }} aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{meta.title}</p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {meta.rule}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Серия</p>
          <p className="mt-0.5 text-sm font-medium">
            {formatStartDate(track.startDate)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Личный рекорд</p>
          <p
            className="mt-0.5 text-sm font-semibold tabular-nums"
            style={{ color: meta.accent }}
          >
            {animatedBest} {streakDaysLabel(track.bestStreak)}
          </p>
        </div>
      </div>

      <NextGoalBar
        track={track}
        accent={meta.accent}
        reducedMotion={reducedMotion}
        progress={progress}
      />

      <div className="flex items-start justify-between gap-3 border-t pt-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            Страховка
            {track.freezeCount > 0 ? ` · ${track.freezeCount}` : ''}
          </p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {freezeHint(track.freezeCount)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {[0, 1].map((slot) => (
            <motion.div
              key={`${kind}-freeze-${slot}`}
              initial={reducedMotion ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.65 + slot * 0.1,
                type: 'spring',
                stiffness: 380,
                damping: 20,
              }}
            >
              <Shield
                className={cn(
                  'h-5 w-5',
                  slot < track.freezeCount
                    ? 'text-foreground'
                    : 'text-muted-foreground/35',
                )}
                aria-hidden
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StreakSheetContent({
  snapshot,
  onClose,
}: {
  snapshot: StreakSnapshot;
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const variants = buildVariants(reducedMotion);

  return (
    <div className="max-h-[min(92dvh,56rem)] overflow-x-hidden overflow-y-auto px-1 pb-4">
      <motion.div
        className="space-y-4 overflow-hidden"
        variants={variants.container}
        initial="hidden"
        animate="show"
      >
        <motion.div className="pt-1" variants={variants.item}>
          <p className="mb-3 text-center text-sm text-muted-foreground">
            Считаются две серии — отдельно дневник и норма калорий
          </p>
          <div className="flex gap-3">
            <HeroTile
              kind="logging"
              length={snapshot.currentLength}
              reducedMotion={reducedMotion}
            />
            <HeroTile
              kind="calorie"
              length={snapshot.calorie.currentLength}
              reducedMotion={reducedMotion}
            />
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl border bg-card p-4 shadow-sm"
          variants={variants.item}
        >
          <DualWeek
            loggingDays={snapshot.weekDays}
            calorieDays={snapshot.calorie.weekDays}
            variants={variants}
          />
        </motion.div>

        <motion.div variants={variants.item}>
          <TrackCard
            kind="logging"
            track={snapshot}
            reducedMotion={reducedMotion}
            progress={variants.progress}
          />
        </motion.div>

        <motion.div variants={variants.item}>
          <TrackCard
            kind="calorie"
            track={snapshot.calorie}
            reducedMotion={reducedMotion}
            progress={variants.progress}
          />
        </motion.div>

        <motion.div variants={variants.item}>
          <Button
            type="button"
            className="h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
            onClick={onClose}
          >
            Продолжить
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function StreakSheet({ open, onClose, snapshot }: StreakSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      className="pb-[env(safe-area-inset-bottom)]"
    >
      {open ? <StreakSheetContent snapshot={snapshot} onClose={onClose} /> : null}
    </BottomSheet>
  );
}
