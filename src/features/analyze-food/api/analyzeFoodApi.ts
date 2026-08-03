import type {
  AnalyzeFoodResponse,
  ApiError,
  DietType,
  NutritionResult,
} from '@ai-food/shared-types';
import { compressImageForAi } from '@/shared/lib';
import { getQuotaHeaders } from '@/features/auth';
import { isGeminiModel, temperatureForModel } from '@/features/settings';
import {
  applyAnalyzeFeaturesToPrompt,
  DEFAULT_ANALYZE_FEATURES,
  GEMINI_SINGLE_ITEM_COMPOSITION_RULE,
  maskNutritionResultByFeatures,
  SINGLE_ITEM_COMPOSITION_RULE,
  type AnalyzeFeatures,
} from './analyzeFeatures';
import {
  GEMINI_MICRONUTRIENTS_PROMPT_RULE,
  GEMINI_NO_FOOD_PROMPT_RULE,
  isNoFoodResult,
  MICRONUTRIENTS_PROMPT_RULE,
  NO_FOOD_PROMPT_RULE,
  normalizeMicronutrients,
} from './nutritionResultSchema';
import {
  noFoodResultToXml,
  legacyNutritionResultToXml,
  parseNutritionXml,
  parsePartialNutritionXml,
  type PartialNutritionXml,
} from './parseNutritionXml';
import { streamChatCompletions } from './streamChatCompletions';

export type { AnalyzeFeatures };
export {
  DEFAULT_ANALYZE_FEATURES,
  SINGLE_ITEM_COMPOSITION_RULE,
  GEMINI_SINGLE_ITEM_COMPOSITION_RULE,
};

/** Prompt rule: dish-level foodName ≠ composition list in items[].name */
export const FOOD_NAME_PROMPT_RULE =
  'foodName — краткое название всего блюда/приёма (например «Свежий овощной салат»); никогда comma-separated ingredient list. Запрещено писать перечень состава в foodName. items/item/name — отдельные видимые компоненты состава (Помидоры, Огурцы, …), не дублируй foodName как список.';

/** Prompt rule: compound dishes → ingredient/layer items, not a single dish-level item */
export const COMPOSITION_PROMPT_RULE =
  'Состав (items): составные/слойные блюда (бургер, сэндвич, ролл, шаурма, пицца с начинкой, салат-сборка) всегда разбивай на видимые ингредиенты/слои. Пример: бургер → отдельные item «Булка», «Котлета», «Сыр», «Салат», «Помидор» — не оставляй один item «Гамбургер»/«Бургер», когда на фото видны слои. Простые однородные продукты (картофель фри, яблоко, стакан сока, йогурт/сок/молоко в упаковке, батончик) — один item допустим; не разбивай упакованный продукт на ингредиенты с этикетки. foodName = название всего приёма; item/name = атомарные компоненты — не дублируй название составного блюда как единственный item, если видны части.';

/**
 * itemCount = countable edible units (rolls, wings, nuggets…), not “one plate = 1”.
 * Non-countable plated dishes (salad, pasta, stew) stay itemCount = 1.
 * Top-level KBJU/grams are always totals for all visible units.
 */
export const ITEM_COUNT_PROMPT_RULE = `itemCount — число съедобных единиц, которые обычно считают ПОШТУЧНО (не «одна тарелка = 1»).
Считай поштучно, если продукт принято считать штуками — даже когда все лежат на одной тарелке/в одной миске: роллы/суши/онигири, крылышки, наггетсы, пельмени/вареники/гёдза, печенье, яйца, бургеры, сосиски, яблоки. Пример: 5 роллов на тарелке → itemCount=5; 8 крылышек → itemCount=8; 6 наггетсов → itemCount=6.
КБЖУ, fiber, totalGrams и grams в items — всегда на ВСЕ видимые штуки целиком (сумма), НЕ на одну штуку.
itemCount = 1, если блюдо НЕ считают поштучно: салат, паста, рагу, суп, каша, пюре, мясо/рыба кусками в соусе как одно блюдо, гарнир дольками, однородное содержимое миски/контейнера.
itemCount = 1 для одной упаковки продукта (стаканчик йогурта, бутылка/пакет сока, батончик) — даже если упаковка закрыта.
НЕ равно длине массива items (items = состав/ингредиенты/слои, не штуки). НЕ считай слои ролла, листья салата, дольки гарнира как itemCount.`;

/** Packaged retail foods (yogurt, juice, milk, bars) — analyze, do not noFood. */
export const PACKAGED_FOOD_PROMPT_RULE = `## Упакованные продукты (йогурт, сок, молоко, творожок, батончик, консервы, чипсы и т.п.)
Закрытая или открытая упаковка с пищевым продуктом / напитком — это ЕДА, НЕ noFood.
Приоритет данных:
1. Если на этикетке читается таблица КБЖУ / «Пищевая ценность» / Nutrition Facts (на 100 г или на порцию) — используй OCR этикетки и масштабируй на порцию на фото.
2. Если виден вес/объём нетто (125 г, 330 мл, 0.5 л, 1 л) — бери его для grams/totalGrams (для жидкостей: 1 мл ≈ 1 г, если плотность неочевидна).
3. Если КБЖУ/вес нечитаемы — определи тип продукта по виду/бренду/надписям и оцени типичные значения; не выдумывай бренд, которого нет на упаковке.
4. Один однородный продукт в упаковке → ровно один item; foodName: тип + вкус/бренд + объём/вес, если видно (например «Йогурт клубничный 125 г», «Сок апельсиновый 1 л»).
5. Порция = то, что на фото (целая упаковка / частично съеденная / налито в стакан).
noFood для упаковки ТОЛЬКО если: пустая/выброшенная упаковка без продукта; меню/скриншот без продукта; явно непищевой предмет.`;

const GEMINI_FOOD_NAME_PROMPT_RULE =
  'foodName — краткое название всего блюда/приёма целиком. items — отдельные атомарные компоненты.';

const GEMINI_COMPOSITION_PROMPT_RULE =
  'Составные/слойные блюда (бургеры, салаты, супы, боулы) всегда разбивай на видимые ингредиенты/слои, не оставляй их одной строкой. Упакованные однородные продукты (йогурт, сок, молоко, батончик) — один item, не разбивай по составу с этикетки.';

export {
  GEMINI_MICRONUTRIENTS_PROMPT_RULE,
  GEMINI_NO_FOOD_PROMPT_RULE,
  MICRONUTRIENTS_PROMPT_RULE,
  NO_FOOD_PROMPT_RULE,
};

const LEGACY_NUTRITION_XML_SCHEMA = `<analysis>
  <foodName>краткое название всего блюда/приёма на русском, например «Свежий овощной салат» — НЕ перечень ингредиентов через запятую</foodName>
  <itemCount>число поштучных единиц (роллы/крылышки/наггетсы…): 5 роллов → 5; салат/паста/рагу → 1. НЕ равно числу items; КБЖУ на все штуки</itemCount>
  <totalGrams>оценка веса всего блюда в граммах (сумма items[].grams); только число</totalGrams>
  <calories>суммарные килокалории всего приёма (число)</calories>
  <protein>grams, сумма по составу (число)</protein>
  <carbs>grams, сумма по составу (число)</carbs>
  <fat>grams, сумма по составу (число)</fat>
  <fiber>grams, сумма по составу (число)</fiber>
  <healthiness>целое 1–10</healthiness>
  <items>
    <item>
      <name>атомарный видимый ингредиент/слой на русском</name>
      <calories>число</calories>
      <protein>число</protein>
      <carbs>число</carbs>
      <fat>число</fat>
      <grams>REQUIRED — оценка веса в граммах; только число</grams>
      <fiber>optional число</fiber>
    </item>
  </items>
  <micronutrients>
    <micronutrient>
      <id>vitaminA|vitaminC|vitaminD|vitaminB12|iron|calcium|folate|magnesium</id>
      <amount>число</amount>
      <unit>mg|µg</unit>
    </micronutrient>
  </micronutrients>
</analysis>`;

const EXAMPLE_A_XML = legacyNutritionResultToXml({
  foodName: 'Бургер с сыром',
  itemCount: 1,
  totalGrams: 225,
  calories: 520,
  protein: 28,
  carbs: 42,
  fat: 26,
  fiber: 3,
  healthiness: 4,
  items: [
    { name: 'Булка', calories: 180, protein: 6, carbs: 34, fat: 3, grams: 80, fiber: 2 },
    { name: 'Котлета', calories: 250, protein: 18, carbs: 2, fat: 18, grams: 120, fiber: 0 },
    { name: 'Сыр', calories: 90, protein: 4, carbs: 1, fat: 7, grams: 25, fiber: 0 },
  ],
});

const EXAMPLE_B_XML = noFoodResultToXml('На фото человек, еды нет');

const EXAMPLE_C_XML = legacyNutritionResultToXml({
  foodName: 'Йогурт клубничный 125 г',
  itemCount: 1,
  totalGrams: 125,
  calories: 90,
  protein: 4,
  carbs: 14,
  fat: 2,
  fiber: 0,
  healthiness: 6,
  items: [
    {
      name: 'Йогурт клубничный',
      calories: 90,
      protein: 4,
      carbs: 14,
      fat: 2,
      grams: 125,
      fiber: 0,
    },
  ],
});

const LEGACY_SYSTEM_PROMPT = `Ты ассистент по анализу питания по фото. Верни ТОЛЬКО один XML-документ — без markdown и без текста снаружи.

## Если еды нет
${NO_FOOD_PROMPT_RULE}

## Если еда или напиток есть
Верни ТОЛЬКО XML с этими тегами:
${LEGACY_NUTRITION_XML_SCHEMA}

## Правила названия и состава
${FOOD_NAME_PROMPT_RULE}
${COMPOSITION_PROMPT_RULE}

${PACKAGED_FOOD_PROMPT_RULE}

## Порция и граммы (обязательно)
- grams обязателен для каждого item (только число в граммах).
${ITEM_COUNT_PROMPT_RULE}
- totalGrams — оценка веса ВСЕГО блюда в граммах (обычно ≈ сумма items[].grams).
- Якоря масштаба: тарелка ≈ 22–27 см; столовая ложка; банка; бутылка 0.5 л; вес/объём с этикетки упаковки.
- Оценивай видимую порцию на фото, а не «стандартную порцию из меню».
- Top-level calories/protein/carbs/fat/fiber = сумма соответствующих полей items (и fiber items, где задан).

## Способ приготовления
Учитывай масло, корочку, панировку, гриль, сырое vs приготовленное. Если способ неочевиден — типичный для блюда.

## healthiness (целое 1–10, не медсовет)
- 1–3: ультрапереработанное / жареное / фастфуд
- 4–6: смешанное
- 7–10: цельные продукты, минимальная обработка
Это оценка полезности блюда, не медицинский совет.

## Краевые случаи
- Еда + человек на фото → анализируй еду (не noFood).
- Упаковка еды/напитка (йогурт, сок, молоко и т.п.) → анализируй продукт (см. раздел упакованных продуктов), НЕ noFood.
- Меню / скриншот / пустая упаковка без продукта → noFood.
- Несколько блюд → все компоненты в items; foodName = название всего приёма.
- Размытое / еды нет → noFood.

## Микронутриенты
${MICRONUTRIENTS_PROMPT_RULE}

## Язык и формат
Текстовые поля (foodName, item/name, reason) — на русском. Числа — только числа. Только XML, без markdown.

## Примеры
Пример A (бургер → состав с grams; макросы ≥ 0). В реальных ответах всегда возвращай все 8 micronutrients; в примере массив может быть опущен:
${EXAMPLE_A_XML}

Пример B (человек / селфи без еды → noFood):
${EXAMPLE_B_XML}

Пример C (йогурт в упаковке 125 г → один item, НЕ noFood; КБЖУ с этикетки если читается):
${EXAMPLE_C_XML}`;

const EXAMPLE_A_TEXT_XML = legacyNutritionResultToXml({
  foodName: 'Бургер с сыром',
  itemCount: 1,
  totalGrams: 225,
  calories: 520,
  protein: 28,
  carbs: 42,
  fat: 26,
  fiber: 3,
  healthiness: 4,
  items: [
    { name: 'Булка', calories: 180, protein: 6, carbs: 34, fat: 3, grams: 80, fiber: 2 },
    { name: 'Котлета', calories: 250, protein: 18, carbs: 2, fat: 18, grams: 120, fiber: 0 },
    { name: 'Сыр', calories: 90, protein: 4, carbs: 1, fat: 7, grams: 25, fiber: 0 },
  ],
});

const LEGACY_TEXT_SYSTEM_PROMPT = `Ты ассистент по анализу питания по текстовому описанию (текст). Верни ТОЛЬКО один XML-документ — без markdown и без текста снаружи.

## Если еды нет в описании
Если пользователь не описал съедобную еду или напиток — верни ТОЛЬКО XML:
${noFoodResultToXml('В описании нет еды')}
НЕ придумывай блюдо.

## Если еда или напиток описаны
Верни ТОЛЬКО XML с этими тегами:
${LEGACY_NUTRITION_XML_SCHEMA}

## Правила названия и состава
${FOOD_NAME_PROMPT_RULE}
${COMPOSITION_PROMPT_RULE}

${PACKAGED_FOOD_PROMPT_RULE}

## Порция и граммы (обязательно)
- grams обязателен для каждого item (только число в граммах).
${ITEM_COUNT_PROMPT_RULE}
- totalGrams — оценка веса ВСЕГО блюда в граммах (обычно ≈ сумма items[].grams).
- Если размер порции в описании неясен — оцени типичную порцию.
- Якоря: тарелка ≈ 22–27 см; столовая ложка; банка; бутылка 0.5 л; вес/объём с упаковки если указан.
- Top-level calories/protein/carbs/fat/fiber = сумма соответствующих полей items.

## Способ приготовления
Учитывай масло, корочку, панировку, гриль, сырое vs приготовленное, если упомянуто или типично. Если неочевидно — типичный способ.

## healthiness (целое 1–10, не медсовет)
- 1–3: ультрапереработанное / жареное / фастфуд
- 4–6: смешанное
- 7–10: цельные продукты, минимальная обработка
Это оценка полезности блюда, не медицинский совет.

## Краевые случаи
- Несколько блюд в описании → все компоненты в items; foodName = название всего приёма.
- Упакованный продукт в описании (йогурт, сок и т.п.) → анализируй как продукт, один item.
- Пустое / бессмысленное описание без еды → noFood.

## Микронутриенты
${MICRONUTRIENTS_PROMPT_RULE}

## Язык и формат
Текстовые поля — на русском. Числа — только числа. Только XML, без markdown.

## Примеры
Пример A (бургер → состав с grams; макросы ≥ 0). В реальных ответах всегда возвращай все 8 micronutrients; в примере массив может быть опущен:
${EXAMPLE_A_TEXT_XML}

Пример B (описание без еды → noFood):
${noFoodResultToXml('В описании нет еды')}`;

const GEMINI_NUTRITION_XML_SCHEMA = `<analysis>
  <foodName>краткое название всего блюда/приёма на русском</foodName>

  <itemCount>число поштучных единиц (роллы/крылышки/наггетсы…): 5 роллов → 5; салат/паста/рагу → 1. НЕ равно числу items; КБЖУ на все штуки</itemCount>

  <totalGrams>оценка веса всего блюда в граммах (сумма items[].grams); только число</totalGrams>

  <portionReference>какой якорь использован для оценки размера порции (тарелка/ложка/банка/бутылка), или "явный референс отсутствует, оценка приблизительная"</portionReference>

  <totals>
    <calories unit="kcal">число</calories>
    <protein unit="g">число</protein>
    <carbs unit="g">число</carbs>
    <addedSugar unit="g">число — доля добавленного/свободного сахара внутри carbs, 0 если его нет</addedSugar>
    <fat unit="g">число</fat>
    <fiber unit="g">число</fiber>
  </totals>

  <healthiness value="целое 1–10">короткое пояснение на русском, почему такая оценка</healthiness>

  <items>
    <item>
      <name>атомарный видимый ингредиент/слой на русском</name>
      <grams>REQUIRED — оценка веса в граммах, число без единиц в тексте</grams>
      <calories unit="kcal">число</calories>
      <protein unit="g">число</protein>
      <carbs unit="g">число</carbs>
      <fat unit="g">число</fat>
      <fiber unit="g">число</fiber>
    </item>
  </items>

  <micronutrients>
    <nutrient name="vitaminA" amount_mg="число"/>
    <nutrient name="vitaminC" amount_mg="число"/>
    <nutrient name="vitaminD" amount_mg="число"/>
    <nutrient name="vitaminB12" amount_mg="число"/>
    <nutrient name="iron" amount_mg="число"/>
    <nutrient name="calcium" amount_mg="число"/>
    <nutrient name="folate" amount_mg="число"/>
    <nutrient name="magnesium" amount_mg="число"/>
  </micronutrients>

  <disclaimers>
    <disclaimer>скрытые калории, невидимые компоненты (соус под гарниром, масло на сковороде, начинка внутри), низкая точность оценки веса из-за отсутствия референса и т.д. — один тег на каждый пункт, тег отсутствует полностью если предупреждений нет</disclaimer>
  </disclaimers>
</analysis>`;

const GEMINI_SYSTEM_PROMPT = `Ты ассистент по анализу питания по фото. Верни ТОЛЬКО один XML-документ — без markdown-обёртки (без \`\`\`xml\`\`\`), без текста до или после документа.

## Если еды нет
${GEMINI_NO_FOOD_PROMPT_RULE}

## Если еда или напиток есть

Верни ТОЛЬКО XML:

${GEMINI_NUTRITION_XML_SCHEMA}

## Правила единиц измерения (обязательно)
- Все числовые значения в calories/protein/carbs/fat/fiber/grams — ТОЛЬКО число, без текста единиц измерения внутри самого значения (атрибут unit уже указывает единицу).
- Все микронутриенты приводи к миллиграммам (amount_mg), даже если по нутрициологическим нормам единица другая (витамин A и D обычно в мкг, калий и магний иногда в граммах): 1 мкг = 0.001 мг, 1 г = 1000 мг. Не смешивай единицы внутри одного списка.

## Правила названия и состава
${GEMINI_FOOD_NAME_PROMPT_RULE} ${GEMINI_COMPOSITION_PROMPT_RULE}

${PACKAGED_FOOD_PROMPT_RULE}

## Порция и граммы (обязательно)
- grams обязателен для каждого item.
${ITEM_COUNT_PROMPT_RULE}
- totalGrams — оценка веса ВСЕГО блюда в граммах (обычно ≈ сумма items[].grams).
- Якоря: тарелка ≈ 22–27 см; столовая ложка ≈ 15 мл; банка; бутылка 0.5 л; вес/объём с этикетки упаковки.
- Оценивай видимую порцию на фото, а не «стандартную порцию из меню».
- totals (calories/protein/carbs/fat/fiber) должны быть суммой соответствующих значений по всем items — не считай отдельно от компонентов.

## Способ приготовления
Учитывай видимое масло, корочку, панировку, гриль, соусы — если они меняют калорийность/жирность, но не выделены в отдельный item, отрази это в disclaimers, а не игнорируй.

## healthiness
healthiness (целое 1–10) основан на: соотношении Б/Ж/У, доле добавленного сахара, степени обработки продукта (жарка/фастфуд vs свежие продукты), наличии клетчатки/овощей. Не занижай и не завышай из вежливости — если блюдо нездоровое, скор должен быть низким и honest.

## Краевые случаи
- Еда + человек в кадре → анализируй только еду, игнорируй человека.
- Упаковка еды/напитка (йогурт, сок, молоко и т.п.) → анализируй продукт (см. раздел упакованных продуктов), НЕ noFood.
- Меню / скриншот / пустая упаковка без продукта → noFood.
- Несколько раздельных блюд на фото → включи все компоненты всех блюд в items, foodName опиши как общий приём пищи.

## Микронутриенты
${GEMINI_MICRONUTRIENTS_PROMPT_RULE}

## Язык и формат
Весь текстовый контент на русском. Ответ — только валидный XML, никакого текста снаружи документа.`;

const GEMINI_TEXT_SYSTEM_PROMPT = `Ты ассистент по анализу питания по текстовому описанию. Верни ТОЛЬКО один XML-документ — без markdown-обёртки (без \`\`\`xml\`\`\`), без текста до или после документа.

## Если еды нет в описании
Если пользователь не описал съедобную еду или напиток — верни ТОЛЬКО:
<analysis>
  <noFood>true</noFood>
  <reason>кратко на русском, почему в описании нет еды</reason>
</analysis>
НЕ придумывай блюдо и НЕ возвращай КБЖУ. Если еда описана — верни обычную схему питания БЕЗ тега noFood.

## Если еда или напиток описаны

Верни ТОЛЬКО XML:

${GEMINI_NUTRITION_XML_SCHEMA}

## Правила единиц измерения (обязательно)
- Все числовые значения в calories/protein/carbs/fat/fiber/grams — ТОЛЬКО число, без текста единиц измерения внутри самого значения (атрибут unit уже указывает единицу).
- Все микронутриенты приводи к миллиграммам (amount_mg): 1 мкг = 0.001 мг, 1 г = 1000 мг. Не смешивай единицы внутри одного списка.

## Правила названия и состава
${GEMINI_FOOD_NAME_PROMPT_RULE} ${GEMINI_COMPOSITION_PROMPT_RULE}

${PACKAGED_FOOD_PROMPT_RULE}

## Порция и граммы (обязательно)
- grams обязателен для каждого item.
${ITEM_COUNT_PROMPT_RULE}
- totalGrams — оценка веса ВСЕГО блюда в граммах (обычно ≈ сумма items[].grams).
- Если размер порции в описании неясен — оцени типичную порцию, укажи это в portionReference.
- Якоря: тарелка ≈ 22–27 см; столовая ложка ≈ 15 мл; банка; бутылка 0.5 л; вес/объём с упаковки если указан.
- totals (calories/protein/carbs/fat/fiber) должны быть суммой соответствующих значений по всем items.

## Способ приготовления
Учитывай масло, корочку, панировку, гриль, соусы — если они меняют калорийность, но не выделены в отдельный item, отрази это в disclaimers.

## healthiness
healthiness (целое 1–10) основан на: Б/Ж/У, добавленном сахаре, степени обработки, клетчатке/овощах. Будь honest.

## Краевые случаи
- Несколько блюд в описании → все компоненты в items; foodName = общий приём пищи.
- Упакованный продукт в описании (йогурт, сок и т.п.) → анализируй как продукт, один item.
- Пустое / бессмысленное описание без еды → noFood.

## Микронутриенты
${GEMINI_MICRONUTRIENTS_PROMPT_RULE}

## Язык и формат
Весь текстовый контент на русском. Ответ — только валидный XML, никакого текста снаружи документа.`;

/** Short fixed user text for vision — rules live in system prompt (cacheable). */
const ANALYSIS_PROMPT =
  'Проанализируй изображение. Если видна упаковка или этикетка с КБЖУ/весом — используй эти данные.';

/** Multi-angle: same dish, several photos in one request. */
const ANALYSIS_PROMPT_MULTI =
  'Это одно блюдо/продукт с разных ракурсов. Проанализируй все изображения вместе как один приём пищи. Если видна этикетка с КБЖУ — используй её.';

function selectAnalyzeSystemPrompt(
  hasImage: boolean,
  model?: string,
  features: AnalyzeFeatures = DEFAULT_ANALYZE_FEATURES,
): string {
  const base = isGeminiModel(model)
    ? hasImage
      ? GEMINI_SYSTEM_PROMPT
      : GEMINI_TEXT_SYSTEM_PROMPT
    : hasImage
      ? LEGACY_SYSTEM_PROMPT
      : LEGACY_TEXT_SYSTEM_PROMPT;

  const compositionOn = isGeminiModel(model)
    ? GEMINI_COMPOSITION_PROMPT_RULE
    : COMPOSITION_PROMPT_RULE;
  const compositionOff = isGeminiModel(model)
    ? GEMINI_SINGLE_ITEM_COMPOSITION_RULE
    : SINGLE_ITEM_COMPOSITION_RULE;

  return applyAnalyzeFeaturesToPrompt(
    base,
    features,
    compositionOn,
    compositionOff,
  );
}

export interface AnalyzeFoodInput {
  /** Single photo (legacy). Ignored when `images` is non-empty. */
  image?: File | null;
  /** Several photos of the same dish (e.g. different angles). */
  images?: File[] | null;
  description?: string | null;
}
export interface AnalyzeFoodOptions {
  customInstructions?: string;
  dietType?: DietType;
  model?: string;
  features?: AnalyzeFeatures;
  /** Called as closed XML tags become available during the stream */
  onPartial?: (partial: PartialNutritionXml) => void;
  /** Cancels the in-flight gateway request (also respects the 30s timeout). */
  signal?: AbortSignal;
}

export type { PartialNutritionXml };

/** Append non-empty trimmed user prefs to a system prompt. */
export function appendCustomInstructions(
  systemPrompt: string,
  customInstructions?: string,
): string {
  const trimmed = customInstructions?.trim();
  if (!trimmed) return systemPrompt;
  return `${systemPrompt}\n\n## User custom instructions\nFollow these user preferences for diet, units, and response style:\n${trimmed}`;
}

const DIET_RULES: Record<Exclude<DietType, 'none'>, string> = {
  halal: [
    'The user follows a Halal (халяль) diet.',
    'Do not identify pork or other non-halal meats as the food on the photo.',
    'If the meat looks like pork (похож на свинину), prefer labeling it as chicken (курица).',
  ].join('\n'),
  vegan: [
    'The user follows a vegan (веган) diet.',
    'Do not identify animal products: no meat, fish, dairy, eggs, or honey.',
  ].join('\n'),
  vegetarian: [
    'The user follows a vegetarian (вегетарианство) diet.',
    'Do not identify meat or fish; dairy and eggs are allowed.',
  ].join('\n'),
};

/** Append structured diet preference rules; pork→chicken bias only for halal. */
export function appendDietPreference(
  systemPrompt: string,
  dietType?: DietType | null,
): string {
  if (!dietType || dietType === 'none') return systemPrompt;
  const rules = DIET_RULES[dietType];
  if (!rules) return systemPrompt;
  return `${systemPrompt}\n\n## User diet preference\n${rules}`;
}

export const NO_FOOD_ERROR_MESSAGE =
  'На фото не обнаружена еда. Сфотографируйте блюдо и попробуйте снова.';

function resolveAnalyzeInput(input: File | AnalyzeFoodInput): {
  images: File[];
  description: string;
} {
  if (input instanceof File) {
    return { images: [input], description: '' };
  }
  const fromList = (input.images ?? []).filter((f): f is File => f instanceof File);
  const images =
    fromList.length > 0 ? fromList : input.image ? [input.image] : [];
  return {
    images,
    description: input.description?.trim() ?? '',
  };
}

function rejectApiError(message: string, code: string, status: number): never {
  const apiError: ApiError = { message, code, status };
  throw apiError;
}

function fileToDataUrl(image: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Не удалось прочитать изображение.'));
        return;
      }
      // FileReader may omit mime for empty-type blobs; normalize fallback
      if (result.startsWith('data:;') || result.startsWith('data:application/octet-stream;')) {
        const mime = image.type || 'image/jpeg';
        resolve(result.replace(/^data:[^;]*;/, `data:${mime};`));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать изображение.'));
    reader.readAsDataURL(image);
  });
}

function partialFingerprint(partial: PartialNutritionXml): string {
  return JSON.stringify(partial);
}

export async function analyzeFoodApi(
  input: File | AnalyzeFoodInput,
  options?: AnalyzeFoodOptions,
): Promise<AnalyzeFoodResponse> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL;
  const apiKey = import.meta.env.VITE_AI_GATEWAY_API_KEY;

  if (!gatewayUrl || !apiKey) {
    rejectApiError(
      'Не заданы параметры AI Gateway. Проверьте конфигурацию приложения.',
      'ANALYSIS_FAILED',
      500,
    );
  }

  const { images, description } = resolveAnalyzeInput(input);

  if (images.length === 0 && !description) {
    rejectApiError('Укажите фото или описание еды.', 'INVALID_INPUT', 400);
  }

  const features = options?.features ?? DEFAULT_ANALYZE_FEATURES;
  const hasImage = images.length > 0;

  const systemContent = appendDietPreference(
    appendCustomInstructions(
      selectAnalyzeSystemPrompt(hasImage, options?.model, features),
      options?.customInstructions,
    ),
    options?.dietType,
  );

  const textUserPrompt = features.composition
    ? `Пользователь описал приём пищи текстом: «${description}». Оцени порцию/типичную порцию. Разбей состав на items с обязательными grams. Учти способ приготовления, если упомянут. Не выдумывай еду, если её нет. Верни только XML по схеме.`
    : `Пользователь описал приём пищи текстом: «${description}». Оцени порцию/типичную порцию. Верни ровно один item на всё блюдо (без разбивки на ингредиенты) с обязательными grams. Учти способ приготовления, если упомянут. Не выдумывай еду, если её нет. Верни только XML по схеме.`;

  // Stable system text first + cache_control; images last and never cached.
  let userContent: string | Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >;
  if (hasImage) {
    const imageParts = await Promise.all(
      images.map(async (file) => {
        const compressed = await compressImageForAi(file);
        return {
          type: 'image_url' as const,
          image_url: { url: await fileToDataUrl(compressed) },
        };
      }),
    );
    const basePrompt = images.length > 1 ? ANALYSIS_PROMPT_MULTI : ANALYSIS_PROMPT;
    const visionText = description
      ? `${basePrompt}\n\nУточнение пользователя: «${description}». Учти это при анализе (название, состав, порция, способ приготовления).`
      : basePrompt;
    userContent = [
      {
        type: 'text' as const,
        text: visionText,
      },
      ...imageParts,
    ];
  } else {
    userContent = textUserPrompt;
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  const externalSignal = options?.signal;
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      rejectApiError('Анализ отменён.', 'ANALYSIS_FAILED', 499);
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  let lastPartialKey = '';
  const emitPartial = (accumulated: string) => {
    const partial = parsePartialNutritionXml(accumulated);
    const key = partialFingerprint(partial);
    if (key === '{}' || key === lastPartialKey) return;
    lastPartialKey = key;
    console.log('[analyzeFood] partial xml', partial);
    options?.onPartial?.(partial);
  };

  let rawContent: string;
  try {
    const temperature = temperatureForModel(options?.model);
    rawContent = await streamChatCompletions({
      gatewayUrl,
      apiKey,
      signal: controller.signal,
      onDelta: emitPartial,
      extraHeaders: await getQuotaHeaders('analyze'),
      body: {
        model: options?.model,
        ...(temperature !== undefined ? { temperature } : {}),
        messages: [
          {
            role: 'system',
            content: [
              {
                type: 'text' as const,
                text: systemContent,
                // Block-level only — top-level cache_control is stripped by gateway Zod.
                cache_control: { type: 'ephemeral' as const },
              },
            ],
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
      },
    });
  } finally {
    externalSignal?.removeEventListener('abort', onExternalAbort);
    clearTimeout(timeoutId);
  }

  const processingTime = Date.now() - startTime;
  console.log('[analyzeFood] stream complete', { rawContent, processingTime });

  if (!rawContent || typeof rawContent !== 'string') {
    rejectApiError('Анализ вернул пустой ответ.', 'ANALYSIS_FAILED', 500);
  }

  let parsed: NutritionResult | ReturnType<typeof parseNutritionXml>;
  try {
    parsed = parseNutritionXml(rawContent);
  } catch {
    rejectApiError(
      'Ответ анализа не соответствует ожидаемой схеме.',
      'ANALYSIS_FAILED',
      500,
    );
  }

  if (isNoFoodResult(parsed)) {
    rejectApiError(NO_FOOD_ERROR_MESSAGE, 'NO_FOOD_DETECTED', 422);
  }

  return {
    result: maskNutritionResultByFeatures(
      {
        ...parsed,
        micronutrients: normalizeMicronutrients(parsed.micronutrients),
      },
      features,
    ),
    processingTime,
  };
}
