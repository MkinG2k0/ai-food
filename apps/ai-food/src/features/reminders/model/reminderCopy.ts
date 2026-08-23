import type { MealSlotKind, ReminderKind } from './types';

export type ReminderCopy = {
  title: string;
  body: string;
};

const BREAKFAST: ReminderCopy[] = [
  {
    title: 'Доброе утро',
    body: 'Завтрак задаёт тон дню — отметь, что съел',
  },
  {
    title: 'Время завтрака',
    body: 'Кофе уже есть? Добавь приём в дневник',
  },
  {
    title: 'Утро без пробелов',
    body: 'Запиши завтрак, пока помнишь состав',
  },
  {
    title: 'Старт дня',
    body: 'Пара тапов — и завтрак в дневнике',
  },
  {
    title: 'Завтрак зовёт',
    body: 'Сфотографируй или опиши утренний приём',
  },
  {
    title: 'Не забудь утро',
    body: 'КБЖУ точнее, если завтрак записан вовремя',
  },
  {
    title: 'Утренний чек-ин',
    body: 'Что на тарелке? Зафиксируй завтрак',
  },
  {
    title: 'День начинается',
    body: 'Добавь завтрак — так проще держать норму',
  },
  {
    title: 'Пора на кухню?',
    body: 'Запиши завтрак, даже если он лёгкий',
  },
  {
    title: 'AI Food · завтрак',
    body: 'Утренний приём ещё не в дневнике',
  },
];

const LUNCH: ReminderCopy[] = [
  {
    title: 'Обеденный перерыв',
    body: 'Отметь обед — середина дня под контролем',
  },
  {
    title: 'Время обеда',
    body: 'Что сегодня на обед? Добавь в дневник',
  },
  {
    title: 'Полдень',
    body: 'Быстрый снимок или текст — и обед сохранён',
  },
  {
    title: 'Не пропусти обед',
    body: 'Запись сейчас сэкономит время вечером',
  },
  {
    title: 'Обед ждёт',
    body: 'Зафиксируй приём, пока детали свежи',
  },
  {
    title: 'Середина дня',
    body: 'Обед в дневнике — честная картина КБЖУ',
  },
  {
    title: 'Перекус или полноценный?',
    body: 'Запиши обед как есть — без идеализации',
  },
  {
    title: 'Обеденный чек-ин',
    body: 'Пара секунд — и обед в истории питания',
  },
  {
    title: 'Что на столе?',
    body: 'Опиши обед или сфотографируй тарелку',
  },
  {
    title: 'AI Food · обед',
    body: 'Обеденный приём ещё не записан',
  },
];

const DINNER: ReminderCopy[] = [
  {
    title: 'Вечерний приём',
    body: 'Ужин закрывает день — не забудь дневник',
  },
  {
    title: 'Время ужина',
    body: 'Что на ужин? Добавь, пока не забыл',
  },
  {
    title: 'День почти готов',
    body: 'Запиши ужин — и картина КБЖУ полная',
  },
  {
    title: 'Ужин зовёт',
    body: 'Сфотографируй или опиши вечерний приём',
  },
  {
    title: 'Вечерний чек-ин',
    body: 'Пара тапов — ужин в дневнике',
  },
  {
    title: 'Не оставляй пусто',
    body: 'Даже лёгкий ужин стоит отметить',
  },
  {
    title: 'Перед отдыхом',
    body: 'Зафиксируй ужин — завтра скажешь спасибо',
  },
  {
    title: 'Закрой день',
    body: 'Ужин в дневнике = честный итог по калориям',
  },
  {
    title: 'Что вечером?',
    body: 'Добавь ужин — без перфекционизма',
  },
  {
    title: 'AI Food · ужин',
    body: 'Вечерний приём ещё не в дневнике',
  },
];

const STREAK_RISK: ReminderCopy[] = [
  {
    title: 'Серия под угрозой',
    body: 'Сегодня пусто — запиши любой приём, серия {{days}} дн.',
  },
  {
    title: 'Не оборви серию',
    body: '{{days}} дн. подряд — хватит одного приёма до полуночи',
  },
  {
    title: 'Вечерний сигнал',
    body: 'Серия {{days}} дн. ещё жива — отметь хоть что-то',
  },
  {
    title: 'Почти потерял день',
    body: 'Запиши приём сейчас — сохрани {{days}} дн. серии',
  },
  {
    title: 'Дневник молчит',
    body: 'Сегодня ни одной записи. Серия: {{days}} дн.',
  },
  {
    title: 'Держи ритм',
    body: '{{days}} дн. — жалко терять из‑за забытого приёма',
  },
  {
    title: 'Последний шанс сегодня',
    body: 'Добавь приём — серия {{days}} дн. продолжится',
  },
  {
    title: 'Серия ждёт тебя',
    body: 'Один приём спасёт цепочку из {{days}} дн.',
  },
  {
    title: 'Не дай серии упасть',
    body: 'Пока день не кончился — запиши еду ({{days}} дн.)',
  },
  {
    title: 'AI Food · серия',
    body: 'Пустой день. Сохрани серию {{days}} дн.',
  },
];

const STREAK_MILESTONE: ReminderCopy[] = [
  {
    title: 'Новая веха',
    body: 'Вчера серия выросла до {{days}} дн. — сильный ход',
  },
  {
    title: 'Красивый прогресс',
    body: '{{days}} дн. подряд — так держать',
  },
  {
    title: 'Веха взята',
    body: 'Серия {{days}} дн. вчера. Сегодня можно продолжить',
  },
  {
    title: 'Гордись этим',
    body: '{{days}} дней без пропусков — редкая дисциплина',
  },
  {
    title: 'Milestone!',
    body: 'Вчера ты дошёл до {{days}} дн. серии',
  },
  {
    title: 'Огонь в дневнике',
    body: 'Серия {{days}} дн. — результат привычки, не удачи',
  },
  {
    title: 'Ты в ритме',
    body: '{{days}} дн. подряд. Завтрак — хороший следующий шаг',
  },
  {
    title: 'Отметь победу',
    body: 'Вчерашняя серия: {{days}} дн. Продолжай в том же духе',
  },
  {
    title: 'Новый уровень',
    body: '{{days}} дней ведения дневника — это уже система',
  },
  {
    title: 'AI Food · веха',
    body: 'Вчера серия достигла {{days}} дн.',
  },
];

const WEIGHT_WEEKLY: ReminderCopy[] = [
  {
    title: 'Время взвеситься',
    body: 'Недельный чек-ин веса — минута, и прогресс виден',
  },
  {
    title: 'Воскресный вес',
    body: 'Запиши вес утром — так сравнение честнее',
  },
  {
    title: 'Трекинг веса',
    body: 'Давно не обновлял вес — отметь сегодня',
  },
  {
    title: 'Прогресс на весах',
    body: 'Одна запись веса — и график снова живой',
  },
  {
    title: 'Недельный ритуал',
    body: 'Взвесься и сохрани результат в приложении',
  },
  {
    title: 'Не теряй нить',
    body: 'Вес не обновлялся больше недели — пора',
  },
  {
    title: 'Чек-ин тела',
    body: 'Запиши вес — без оценки, просто данные',
  },
  {
    title: 'Цель ближе с цифрами',
    body: 'Обнови вес, чтобы видеть динамику к цели',
  },
  {
    title: 'Утренние весы',
    body: 'Лучшее время для записи веса — сейчас',
  },
  {
    title: 'AI Food · вес',
    body: 'Добавь вес — прогресс любит регулярность',
  },
];

const ANALYZE_ERROR: ReminderCopy[] = [
  {
    title: 'Разбор не прошёл',
    body: 'Приём не разобрался — нажми, чтобы повторить',
  },
  {
    title: 'Нужен повтор',
    body: 'AI не смог разобрать еду. Открой и попробуй снова',
  },
  {
    title: 'Анализ прервался',
    body: 'Что-то пошло не так. Зайди в приём и перезапусти',
  },
  {
    title: 'Не удалось распознать',
    body: 'Фото или описание зависло — повтори разбор',
  },
  {
    title: 'Ошибка разбора',
    body: 'Приём ждёт тебя: открой и запусти анализ снова',
  },
  {
    title: 'Почти готово',
    body: 'Разбор сорвался. Один тап — и можно повторить',
  },
  {
    title: 'Сбой AI',
    body: 'Не разобрали приём. Зайди и попробуй ещё раз',
  },
  {
    title: 'Дневник неполный',
    body: 'Этот приём без КБЖУ — открой и повтори анализ',
  },
  {
    title: 'Требуется действие',
    body: 'Разбор еды не удался. Нажми, чтобы исправить',
  },
  {
    title: 'AI Food · повтор',
    body: 'Приём с ошибкой — открой и перезапусти разбор',
  },
];

const MEAL_BY_SLOT: Record<MealSlotKind, ReminderCopy[]> = {
  breakfast: BREAKFAST,
  lunch: LUNCH,
  dinner: DINNER,
};

function pickIndex(seed: number, length: number): number {
  if (length <= 0) return 0;
  const n = Math.abs(Math.trunc(seed));
  return n % length;
}

function applyDays(template: string, days: number): string {
  return template.replaceAll('{{days}}', String(days));
}

export function pickMealReminderCopy(
  slot: MealSlotKind,
  seed: number,
): ReminderCopy {
  const list = MEAL_BY_SLOT[slot];
  return list[pickIndex(seed, list.length)]!;
}

export function pickStreakRiskCopy(
  streakLength: number,
  seed: number,
): ReminderCopy {
  const base = STREAK_RISK[pickIndex(seed, STREAK_RISK.length)]!;
  return {
    title: base.title,
    body: applyDays(base.body, streakLength),
  };
}

export function pickStreakMilestoneCopy(
  streakLength: number,
  seed: number,
): ReminderCopy {
  const base = STREAK_MILESTONE[pickIndex(seed, STREAK_MILESTONE.length)]!;
  return {
    title: base.title,
    body: applyDays(base.body, streakLength),
  };
}

export function pickWeightWeeklyCopy(seed: number): ReminderCopy {
  return WEIGHT_WEEKLY[pickIndex(seed, WEIGHT_WEEKLY.length)]!;
}

export function pickAnalyzeErrorCopy(seed: number): ReminderCopy {
  return ANALYZE_ERROR[pickIndex(seed, ANALYZE_ERROR.length)]!;
}

/** Stable hash for meal id / string seeds. */
export function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function reminderCopyPoolSize(kind: ReminderKind | 'meal'): number {
  if (kind === 'meal' || kind.startsWith('meal-')) return 10;
  if (kind === 'streak-risk') return STREAK_RISK.length;
  if (kind === 'streak-milestone') return STREAK_MILESTONE.length;
  if (kind === 'weight-weekly') return WEIGHT_WEEKLY.length;
  if (kind === 'analyze-error') return ANALYZE_ERROR.length;
  return 10;
}
