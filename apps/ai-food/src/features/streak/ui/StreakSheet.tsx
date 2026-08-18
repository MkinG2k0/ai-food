import { Flame, Shield, Target } from 'lucide-react';
import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from 'framer-motion';
import type { StreakSnapshot, StreakTrackSnapshot, StreakWeekDay } from '@/entities/streak';
import { streakDaysLabel } from '@/entities/streak';
import { useAnimatedNumber } from '@/shared/lib';
import { BottomSheet, Button } from '@/shared/ui';

export interface StreakSheetProps {
  open: boolean;
  onClose: () => void;
  snapshot: StreakSnapshot;
}

const EASE_OUT: Transition['ease'] = [0.22, 1, 0.36, 1];
const STAGGER = 0.09;

function formatStartDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

function buildVariants(reducedMotion: boolean | null): {
  container: Variants;
  item: Variants;
  flame: Variants;
  day: Variants;
  filledDay: Variants;
  progress: Transition;
} {
  if (reducedMotion) {
    return {
      container: {},
      item: {},
      flame: {},
      day: {},
      filledDay: {},
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
    flame: {
      hidden: { opacity: 0, scale: 0.35, rotate: -18 },
      show: {
        opacity: 1,
        scale: 1,
        rotate: 0,
        transition: { type: 'spring', stiffness: 280, damping: 16 },
      },
    },
    day: {
      hidden: { opacity: 0, scale: 0.55 },
      show: (i: number) => ({
        opacity: 1,
        scale: 1,
        transition: {
          delay: 0.28 + i * 0.05,
          type: 'spring',
          stiffness: 420,
          damping: 22,
        },
      }),
    },
    filledDay: {
      hidden: { scale: 0 },
      show: {
        scale: [0, 1.25, 1],
        transition: { duration: 0.45, ease: EASE_OUT, delay: 0.08 },
      },
    },
    progress: { duration: 0.95, delay: 0.55, ease: EASE_OUT },
  };
}

function WeekRow({
  label,
  weekDays,
  filledIcon,
  variants,
}: {
  label: string;
  weekDays: StreakWeekDay[];
  filledIcon: 'flame' | 'target';
  variants: ReturnType<typeof buildVariants>;
}) {
  const Icon = filledIcon === 'flame' ? Flame : Target;
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => (
          <motion.div
            key={`${label}-${day.label}`}
            className="flex flex-col items-center gap-2"
            variants={variants.day}
            custom={index}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                day.filled
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted bg-muted/40 text-muted-foreground'
              }`}
            >
              {day.filled ? (
                <motion.div variants={variants.filledDay}>
                  <Icon className="h-4 w-4" aria-hidden />
                </motion.div>
              ) : null}
            </div>
            <span className="text-xs text-muted-foreground">{day.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function NextGoalBar({
  label,
  track,
  reducedMotion,
  progress,
}: {
  label: string;
  track: StreakTrackSnapshot;
  reducedMotion: boolean | null;
  progress: Transition;
}) {
  const previousMilestone =
    track.achieved100 || track.nextMilestone === null
      ? 100
      : track.nextMilestone - track.remainingDays;
  const animatedCurrent = useAnimatedNumber(track.currentLength, {
    skipInitial: false,
    duration: 0.9,
    delay: 0.52,
  });
  const animatedRemaining = useAnimatedNumber(track.remainingDays, {
    skipInitial: false,
    duration: 0.75,
    delay: 0.58,
  });
  const Icon = label === 'Запись' ? Flame : Target;

  return (
    <div className="flex items-center gap-3">
      <div className="flex w-10 shrink-0 flex-col items-center gap-1">
        <Icon className="h-5 w-5 text-primary" aria-hidden />
        <span className="text-sm font-semibold tabular-nums">
          {animatedCurrent}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {track.achieved100 ? (
          <p className="text-sm font-medium text-foreground">
            100 дней достигнуто
          </p>
        ) : (
          <p className="text-sm font-medium text-foreground">
            Ещё {animatedRemaining} {streakDaysLabel(track.remainingDays)}
          </p>
        )}
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{
              width: reducedMotion
                ? `${Math.round(track.progress01 * 100)}%`
                : '0%',
            }}
            animate={{ width: `${Math.round(track.progress01 * 100)}%` }}
            transition={progress}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">до следующей цели</p>
      </div>

      <div className="flex w-10 shrink-0 flex-col items-center gap-1">
        <Icon
          className={`h-5 w-5 ${
            track.nextMilestone ? 'text-muted-foreground' : 'text-primary'
          }`}
          aria-hidden
        />
        <span
          className={`text-sm font-semibold tabular-nums ${
            track.nextMilestone ? 'text-muted-foreground' : 'text-primary'
          }`}
        >
          {track.nextMilestone ?? previousMilestone}
        </span>
      </div>
    </div>
  );
}

function ProtectionRow({
  label,
  freezeCount,
  reducedMotion,
}: {
  label: string;
  freezeCount: number;
  reducedMotion: boolean | null;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-foreground">
          {label}
          {freezeCount > 0 ? ` ×${freezeCount}` : ''}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Сработает автоматически, если пропустите день
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {[0, 1].map((slot) => (
          <motion.div
            key={`${label}-${slot}`}
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
              className={`h-5 w-5 ${
                slot < freezeCount
                  ? 'text-primary'
                  : 'text-muted-foreground/40'
              }`}
              aria-hidden
            />
          </motion.div>
        ))}
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
  const calorie = snapshot.calorie;

  const {
    currentLength,
    startDate,
    weekDays,
    bestStreak,
    freezeCount,
  } = snapshot;

  const animatedCurrent = useAnimatedNumber(currentLength, {
    skipInitial: false,
    duration: 1.15,
    delay: 0.25,
  });
  const animatedBest = useAnimatedNumber(bestStreak, {
    skipInitial: false,
    duration: 0.85,
    delay: 0.5,
  });
  const animatedCalorieBest = useAnimatedNumber(calorie.bestStreak, {
    skipInitial: false,
    duration: 0.85,
    delay: 0.5,
  });

  return (
    <div className="max-h-[min(92dvh,56rem)] overflow-x-hidden overflow-y-auto px-1">
      <motion.div
        className="space-y-5 overflow-hidden"
        variants={variants.container}
        initial="hidden"
        animate="show"
      >
        <motion.div
          className="flex flex-col items-center pt-2 text-center"
          variants={variants.item}
        >
          <motion.div variants={variants.flame}>
            <Flame className="h-14 w-14 text-primary" aria-hidden />
          </motion.div>
          <motion.p
            className="mt-3 text-5xl font-bold tabular-nums tracking-tight"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.2, ease: EASE_OUT }}
          >
            {animatedCurrent}
          </motion.p>
          <motion.p
            className="mt-1 text-base text-muted-foreground"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            {streakDaysLabel(currentLength)} подряд
          </motion.p>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Target className="h-4 w-4" aria-hidden />
            Норма {calorie.currentLength}
          </p>
        </motion.div>

        <motion.div
          className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm"
          variants={variants.item}
        >
          <WeekRow
            label="Запись"
            weekDays={weekDays}
            filledIcon="flame"
            variants={variants}
          />
          <WeekRow
            label="Норма"
            weekDays={calorie.weekDays}
            filledIcon="target"
            variants={variants}
          />
        </motion.div>

        <motion.div className="grid grid-cols-2 gap-3" variants={variants.item}>
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Начало серии</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Запись</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatStartDate(startDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Норма</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatStartDate(calorie.startDate)}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Личный рекорд</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Запись</p>
                <p className="text-lg font-semibold tabular-nums text-primary">
                  {animatedBest}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Норма</p>
                <p className="text-lg font-semibold tabular-nums text-primary">
                  {animatedCalorieBest}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm"
          variants={variants.item}
        >
          <NextGoalBar
            label="Запись"
            track={snapshot}
            reducedMotion={reducedMotion}
            progress={variants.progress}
          />
          <NextGoalBar
            label="Норма"
            track={calorie}
            reducedMotion={reducedMotion}
            progress={variants.progress}
          />
        </motion.div>

        <motion.div
          className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm"
          variants={variants.item}
        >
          <ProtectionRow
            label="Защита записи"
            freezeCount={freezeCount}
            reducedMotion={reducedMotion}
          />
          <ProtectionRow
            label="Защита нормы"
            freezeCount={calorie.freezeCount}
            reducedMotion={reducedMotion}
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
    <BottomSheet open={open} onClose={onClose}>
      {open ? <StreakSheetContent snapshot={snapshot} onClose={onClose} /> : null}
    </BottomSheet>
  );
}
