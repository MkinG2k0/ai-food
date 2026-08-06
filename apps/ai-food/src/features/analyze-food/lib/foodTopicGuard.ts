import type { ApiError } from '@ai-food/shared-types';

const OFF_TOPIC_ASK_MESSAGE =
  'Вопрос невалиден или не по теме блюда. Задайте вопрос о составе, калориях, приготовлении или ингредиентах.';

const OFF_TOPIC_EDIT_MESSAGE =
  'Уточнение невалидно или не по теме блюда и не меняет состав. Опишите изменение порции, ингредиентов или состава.';

/** Food/portion language that makes digits legitimate (D-04). */
const FOOD_INTENT_RE =
  /грамм|\bг\b|\bгр\b|порци|калор|ингредиент|аллерген|приготов|блюд|рецепт|съел|съела|убер|добав|замен|сниз|увелич|уменьш|белк|жир|углевод|клетчат|соль|сахар|масло|мяс|рыб|овощ|фрукт|суп|салат|напит|кофе|чай|молоч|хлеб|рис|паст|пицц|бургер|рол|сырн|яйц|курин|говяд|свинин|рыбн|морепродукт|веган|халял|диета|полезн|сытост|острот|вкус|готовк|вари|жар|запек|микроволн|духовк|сковор|кастрюл|тарел|порцион|вес\b|ккал|бжу|кбжу|fiber|protein|carb|calorie|ingredient|allergen|cook|recipe|meal|dish|portion|gram/i;

const MATH_RE =
  /\b\d+\s*[+\-*/×÷]\s*\d+\b|сколько\s+будет|посчитай|вычисли|реш[иь]\s+(пример|уравнен)/i;

const IDENTITY_RE =
  /^(кто\s+ты|что\s+ты|who\s+are\s+you|what\s+are\s+you|как\s+тебя\s+зовут)(?:\s*[?.!]*)?$/i;

const CODE_REQUEST_RE =
  /напиши\s+(функци|код|скрипт|программ|класс)|write\s+(a\s+)?(function|code|script|program)|сгенерируй\s+код|generate\s+code|напиши\s+на\s+(python|js|javascript|typescript|java|c\+\+|go|rust)/i;

/** Pure numeric token (optional decimal / percent), optionally with spaces. */
const BARE_NUMBER_RE = /^\s*[\d.,]+\s*%?\s*$/;

/** Mostly punctuation/symbols or very short non-letter noise. */
function isPunctuationOrNoiseDominated(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length <= 2 && !/[а-яёa-z]/i.test(trimmed)) return true;

  const letters = (trimmed.match(/[а-яёa-z]/gi) ?? []).length;
  const digits = (trimmed.match(/\d/g) ?? []).length;
  const other = trimmed.replace(/[\sа-яёa-z0-9]/gi, '').length;

  // Dominated by symbols/punctuation
  if (other >= letters && other >= 2 && letters < 3) return true;

  // Digit-heavy mash with few letters (e.g. "12312фыв")
  if (digits >= 3 && letters > 0 && letters <= 4 && digits >= letters) {
    return true;
  }

  // Very short letter-only noise without food words (e.g. "аы", "фыв")
  if (trimmed.length <= 4 && letters === trimmed.replace(/\s/g, '').length) {
    if (!FOOD_INTENT_RE.test(trimmed) && !/\b(как|что|где|сколько|почему|можно)\b/i.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/**
 * Cheap client heuristic: obvious junk / off-topic before calling the gateway.
 * Digits WITH food/portion language are allowed (D-04).
 */
export function isObviouslyIrrelevantFoodInput(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  if (FOOD_INTENT_RE.test(trimmed)) {
    // Still reject clear math / identity / code even if somehow mixed — but
    // food intent usually wins for portion edits like «порцию 200 г».
    if (MATH_RE.test(trimmed) && !FOOD_INTENT_RE.test(trimmed.replace(MATH_RE, ''))) {
      return true;
    }
    return false;
  }

  if (BARE_NUMBER_RE.test(trimmed)) return true;
  if (IDENTITY_RE.test(trimmed)) return true;
  if (CODE_REQUEST_RE.test(trimmed)) return true;
  if (MATH_RE.test(trimmed)) return true;
  if (isPunctuationOrNoiseDominated(trimmed)) return true;

  return false;
}

/** True when model replied with the OFF_TOPIC sentinel (ask path). */
export function isOffTopicAskResponse(raw: string): boolean {
  return raw.trim() === 'OFF_TOPIC';
}

/** True when refine model returned an off-topic rejection object. */
export function isOffTopicRefinePayload(parsed: unknown): boolean {
  if (parsed == null || typeof parsed !== 'object') return false;
  const obj = parsed as Record<string, unknown>;
  return obj.offTopic === true;
}

/** Stable Russian toast copy for OFF_TOPIC rejects (D-03). */
export function offTopicApiError(kind: 'ask' | 'edit'): ApiError {
  return {
    message: kind === 'ask' ? OFF_TOPIC_ASK_MESSAGE : OFF_TOPIC_EDIT_MESSAGE,
    code: 'OFF_TOPIC',
    status: 400,
  };
}
