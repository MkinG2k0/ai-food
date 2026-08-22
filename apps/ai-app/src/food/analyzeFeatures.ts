/** Feature flags that shape analyze/refine prompts (mirrors frontend). */
export interface AnalyzeFeatures {
  vitamins: boolean;
  healthiness: boolean;
  composition: boolean;
}

export const DEFAULT_ANALYZE_FEATURES: AnalyzeFeatures = {
  vitamins: true,
  healthiness: true,
  composition: true,
};

/** When composition is off — one item for the whole dish, no layer breakdown. */
export const SINGLE_ITEM_COMPOSITION_RULE =
  'Не разбивай блюдо на ингредиенты/слои — ровно один item с name = foodName на всё блюдо.';

/**
 * Strip optional sections from a built system prompt when features are off.
 * Relies on stable markers already present in analyze/refine prompts.
 */
export function applyAnalyzeFeaturesToPrompt(
  prompt: string,
  features: AnalyzeFeatures,
  compositionOnRule: string,
  compositionOffRule: string,
): string {
  let result = prompt;

  if (!features.composition) {
    result = result.includes(compositionOnRule)
      ? result.split(compositionOnRule).join(compositionOffRule)
      : `${result}\n\n## Состав\n${compositionOffRule}`;
  }

  if (!features.healthiness) {
    result = result
      .replace(/\n## healthiness[^\n]*\n[\s\S]*?(?=\n## )/g, '\n')
      .replace(/[ \t]*<healthiness\b[^>]*>[\s\S]*?<\/healthiness>\n?/gi, '')
      .replace(/[ \t]*"healthiness"\s*:\s*number[^,\n]*,?\n?/gi, '')
      .replace(/[ \t]*"healthinessReason"\s*:\s*string[^,\n]*,?\n?/gi, '');
  }

  if (!features.vitamins) {
    result = result
      .replace(/\n## Микронутриенты\n[\s\S]*?(?=\n## )/g, '\n')
      .replace(/[ \t]*<micronutrients\b[\s\S]*?<\/micronutrients>\n?/gi, '')
      .replace(/- Все микронутриенты[^\n]*\n/g, '')
      .replace(
        /\. В реальных ответах всегда возвращай все \d+ micronutrients; в примере массив может быть опущен/g,
        '',
      )
      .replace(/[ \t]*"micronutrients"\s*:\s*\[[\s\S]*?\],?\n?/g, '')
      .replace(/micronutrients —[^\n]*(?:\n(?![A-ZА-Я#])[^\n]*)*/gi, '');
  }

  return result.replace(/\n{3,}/g, '\n\n').trim();
}
