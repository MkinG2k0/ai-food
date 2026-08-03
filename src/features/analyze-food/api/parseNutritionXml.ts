import type { MicronutrientEstimate, NutritionItem, NutritionResult } from '@ai-food/shared-types';
import {
  isNoFoodResult,
  isNutritionResult,
  normalizeMicronutrients,
  toAmountMg,
  type NoFoodResult,
} from './nutritionResultSchema';

/** Progressive fields extracted from closed XML tags while streaming. */
export interface PartialNutritionXml {
  foodName?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  confidence?: number;
  healthiness?: number;
  items?: NutritionItem[];
  micronutrients?: MicronutrientEstimate[];
  noFood?: boolean;
  reason?: string;
  itemCount?: number;
  totalGrams?: number;
  portionReference?: string;
  addedSugar?: number;
  confidenceReason?: string;
  healthinessReason?: string;
  disclaimers?: string[];
}

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:xml)?\s*([\s\S]*?)```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

/** Strip nested list/wrapper blocks so top-level scalars aren't confused with nested tags. */
function xmlWithoutNestedLists(xml: string): string {
  return xml
    .replace(/<items\b[\s\S]*?<\/items>/gi, '')
    .replace(/<items\b[\s\S]*$/gi, '')
    .replace(/<micronutrients\b[\s\S]*?<\/micronutrients>/gi, '')
    .replace(/<micronutrients\b[\s\S]*$/gi, '')
    .replace(/<totals\b[\s\S]*?<\/totals>/gi, '')
    .replace(/<totals\b[\s\S]*$/gi, '')
    .replace(/<disclaimers\b[\s\S]*?<\/disclaimers>/gi, '')
    .replace(/<disclaimers\b[\s\S]*$/gi, '');
}

/** First closed `<tag>…</tag>` text content (non-greedy, allows nested siblings only). */
export function extractClosedTag(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(re);
  if (!match) return undefined;
  return decodeXmlEntities(match[1].trim());
}

/** Attribute value from the first opening tag of `tag`. */
export function extractTagAttr(xml: string, tag: string, attr: string): string | undefined {
  const re = new RegExp(`<${tag}\\b([^>]*)>`, 'i');
  const match = xml.match(re);
  if (!match) return undefined;
  const attrs = match[1];
  const attrRe = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, 'i');
  const attrMatch = attrs.match(attrRe);
  if (!attrMatch) return undefined;
  return decodeXmlEntities(attrMatch[1].trim());
}

function extractTopLevelTag(xml: string, tag: string): string | undefined {
  return extractClosedTag(xmlWithoutNestedLists(xml), tag);
}

function parseNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function parseBool(raw: string | undefined): boolean | undefined {
  if (raw === undefined) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return undefined;
}

function parseItemBlock(block: string): NutritionItem | null {
  const name = extractClosedTag(block, 'name');
  const calories = parseNumber(extractClosedTag(block, 'calories'));
  const protein = parseNumber(extractClosedTag(block, 'protein'));
  const carbs = parseNumber(extractClosedTag(block, 'carbs'));
  const fat = parseNumber(extractClosedTag(block, 'fat'));
  if (
    name === undefined ||
    calories === undefined ||
    protein === undefined ||
    carbs === undefined ||
    fat === undefined
  ) {
    return null;
  }
  const item: NutritionItem = { name, calories, protein, carbs, fat };
  const gramsRaw = extractClosedTag(block, 'grams');
  if (gramsRaw !== undefined) {
    const grams = parseNumber(gramsRaw);
    if (grams === undefined) return null;
    item.grams = grams;
  }
  const fiberRaw = extractClosedTag(block, 'fiber');
  if (fiberRaw !== undefined) {
    const fiber = parseNumber(fiberRaw);
    if (fiber === undefined) return null;
    item.fiber = fiber;
  }
  return item;
}

function parseClosedItems(
  xml: string,
  mode: 'strict' | 'partial',
): NutritionItem[] | undefined {
  const itemsBlock = extractClosedTag(xml, 'items');

  if (mode === 'strict') {
    if (itemsBlock === undefined) return undefined;
    const itemRe = /<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi;
    const blocks = itemsBlock.match(itemRe) ?? [];
    if (blocks.length === 0) return [];
    const items: NutritionItem[] = [];
    for (const block of blocks) {
      const item = parseItemBlock(block);
      if (!item) return undefined;
      items.push(item);
    }
    return items;
  }

  // partial: accept closed <item> even before </items>
  const source = itemsBlock ?? xml;
  const itemRe = /<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi;
  const blocks = source.match(itemRe);
  if (!blocks || blocks.length === 0) {
    return itemsBlock !== undefined ? [] : undefined;
  }
  const items: NutritionItem[] = [];
  for (const block of blocks) {
    const item = parseItemBlock(block);
    if (item) items.push(item);
  }
  return items.length > 0 || itemsBlock !== undefined ? items : undefined;
}

function parseClosedMicronutrients(xml: string): MicronutrientEstimate[] | undefined {
  const block = extractClosedTag(xml, 'micronutrients');
  if (block === undefined) return undefined;

  // New format: <nutrient name="vitaminC" amount_mg="45"/>
  const selfClosing = [
    ...block.matchAll(/<nutrient\b([^>]*)\/?\s*>/gi),
  ];
  if (selfClosing.length > 0) {
    const rows: Array<{ name: string; amount_mg: number }> = [];
    for (const m of selfClosing) {
      const attrs = m[1] ?? '';
      const nameMatch = attrs.match(/name\s*=\s*["']([^"']+)["']/i);
      const amountMatch = attrs.match(/amount_mg\s*=\s*["']([^"']+)["']/i);
      if (!nameMatch || !amountMatch) continue;
      const amount = parseNumber(amountMatch[1]);
      if (amount === undefined) continue;
      rows.push({ name: nameMatch[1], amount_mg: amount });
    }
    return normalizeMicronutrients(rows);
  }

  // Legacy format: <micronutrient><id>…</id><amount>…</amount><unit>…</unit></micronutrient>
  const rowRe = /<micronutrient(?:\s[^>]*)?>[\s\S]*?<\/micronutrient>/gi;
  const legacyRows = block.match(rowRe) ?? [];
  const out: Array<{ id: string; amount: number; unit: string }> = [];
  for (const row of legacyRows) {
    const id = extractClosedTag(row, 'id');
    const amount = parseNumber(extractClosedTag(row, 'amount'));
    const unit = extractClosedTag(row, 'unit');
    if (!id || amount === undefined || !unit) continue;
    out.push({ id, amount, unit });
  }
  return normalizeMicronutrients(out);
}

function parseDisclaimers(xml: string): string[] | undefined {
  const block = extractClosedTag(xml, 'disclaimers');
  if (block === undefined) return undefined;
  const re = /<disclaimer(?:\s[^>]*)?>([\s\S]*?)<\/disclaimer>/gi;
  const out: string[] = [];
  for (const m of block.matchAll(re)) {
    const text = decodeXmlEntities(m[1].trim());
    if (text) out.push(text);
  }
  return out.length > 0 ? out : undefined;
}

/** Prefer `<totals>` macros (closed or still-open); fall back to legacy flat top-level tags. */
function parseMacroTotals(xml: string): {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  addedSugar?: number;
} {
  const closedTotals = extractClosedTag(xml, 'totals');
  let scope: string;
  if (closedTotals !== undefined) {
    scope = closedTotals;
  } else {
    const openMatch = xml.match(/<totals\b[^>]*>([\s\S]*)$/i);
    scope = openMatch ? openMatch[1] : xmlWithoutNestedLists(xml);
  }
  return {
    calories: parseNumber(extractClosedTag(scope, 'calories')),
    protein: parseNumber(extractClosedTag(scope, 'protein')),
    carbs: parseNumber(extractClosedTag(scope, 'carbs')),
    fat: parseNumber(extractClosedTag(scope, 'fat')),
    fiber: parseNumber(extractClosedTag(scope, 'fiber')),
    addedSugar: parseNumber(extractClosedTag(scope, 'addedSugar')),
  };
}

function parseScoredField(
  xml: string,
  tag: 'confidence' | 'healthiness',
): { value?: number; reason?: string } {
  const scoped = xmlWithoutNestedLists(xml);
  const attr = parseNumber(extractTagAttr(scoped, tag, 'value'));
  const text = extractClosedTag(scoped, tag);
  if (attr !== undefined) {
    return {
      value: attr,
      reason: text && text.length > 0 ? text : undefined,
    };
  }
  // Legacy: bare number as text content
  const asNumber = parseNumber(text);
  if (asNumber !== undefined) return { value: asNumber };
  return {};
}

/** Extract whatever closed tags are available so far (streaming). */
export function parsePartialNutritionXml(buffer: string): PartialNutritionXml {
  const xml = stripCodeFence(buffer);
  const partial: PartialNutritionXml = {};

  const noFood = parseBool(extractClosedTag(xml, 'noFood'));
  if (noFood === true) {
    partial.noFood = true;
    const reason = extractClosedTag(xml, 'reason');
    if (reason) partial.reason = reason;
    return partial;
  }

  const foodName = extractTopLevelTag(xml, 'foodName');
  if (foodName) partial.foodName = foodName;

  const itemCount = parseNumber(extractTopLevelTag(xml, 'itemCount'));
  if (itemCount !== undefined && itemCount > 0) partial.itemCount = itemCount;

  const totalGrams = parseNumber(extractTopLevelTag(xml, 'totalGrams'));
  if (totalGrams !== undefined && totalGrams >= 0) partial.totalGrams = totalGrams;

  const portionReference = extractTopLevelTag(xml, 'portionReference');
  if (portionReference) partial.portionReference = portionReference;

  const macros = parseMacroTotals(xml);
  if (macros.calories !== undefined) partial.calories = macros.calories;
  if (macros.protein !== undefined) partial.protein = macros.protein;
  if (macros.carbs !== undefined) partial.carbs = macros.carbs;
  if (macros.fat !== undefined) partial.fat = macros.fat;
  if (macros.fiber !== undefined) partial.fiber = macros.fiber;
  if (macros.addedSugar !== undefined) partial.addedSugar = macros.addedSugar;

  const confidence = parseScoredField(xml, 'confidence');
  if (confidence.value !== undefined) partial.confidence = confidence.value;
  if (confidence.reason) partial.confidenceReason = confidence.reason;

  const healthiness = parseScoredField(xml, 'healthiness');
  if (healthiness.value !== undefined) partial.healthiness = healthiness.value;
  if (healthiness.reason) partial.healthinessReason = healthiness.reason;

  const items = parseClosedItems(xml, 'partial');
  if (items !== undefined) partial.items = items;

  const micronutrients = parseClosedMicronutrients(xml);
  if (micronutrients !== undefined) partial.micronutrients = micronutrients;

  const disclaimers = parseDisclaimers(xml);
  if (disclaimers !== undefined) partial.disclaimers = disclaimers;

  return partial;
}

/**
 * Final parse of complete XML → NutritionResult | NoFoodResult.
 * Throws if structure cannot be mapped to a valid result.
 */
export function parseNutritionXml(raw: string): NutritionResult | NoFoodResult {
  const xml = stripCodeFence(raw);
  const partial = parsePartialNutritionXml(xml);

  if (partial.noFood === true) {
    const noFood: NoFoodResult = {
      noFood: true,
      reason: partial.reason?.trim() || 'На фото не обнаружена еда',
    };
    if (!isNoFoodResult(noFood)) {
      throw new Error('Invalid noFood XML');
    }
    return noFood;
  }

  // Re-parse items in strict mode for final validation
  const strictItems = parseClosedItems(xml, 'strict');

  const candidate: Record<string, unknown> = {
    foodName: partial.foodName,
    calories: partial.calories,
    protein: partial.protein,
    carbs: partial.carbs,
    fat: partial.fat,
    fiber: partial.fiber ?? 0,
    items: strictItems,
  };

  if (partial.healthiness !== undefined) candidate.healthiness = partial.healthiness;
  if (partial.micronutrients !== undefined) {
    candidate.micronutrients = partial.micronutrients;
  }
  if (partial.confidence !== undefined) candidate.confidence = partial.confidence;
  if (partial.itemCount !== undefined) candidate.itemCount = partial.itemCount;
  if (partial.totalGrams !== undefined) candidate.totalGrams = partial.totalGrams;
  if (partial.portionReference !== undefined) {
    candidate.portionReference = partial.portionReference;
  }
  if (partial.addedSugar !== undefined) candidate.addedSugar = partial.addedSugar;
  if (partial.confidenceReason !== undefined) {
    candidate.confidenceReason = partial.confidenceReason;
  }
  if (partial.healthinessReason !== undefined) {
    candidate.healthinessReason = partial.healthinessReason;
  }
  if (partial.disclaimers !== undefined) candidate.disclaimers = partial.disclaimers;

  if (!isNutritionResult(candidate)) {
    throw new Error('Invalid nutrition XML');
  }

  return {
    ...candidate,
    micronutrients: normalizeMicronutrients(candidate.micronutrients),
  };
}

/** Serialize NutritionResult to legacy flat XML (non-Gemini prompts / examples). */
export function legacyNutritionResultToXml(result: NutritionResult): string {
  const items = result.items
    .map(
      (item) => `    <item>
      <name>${escapeXml(item.name)}</name>
      <calories>${item.calories}</calories>
      <protein>${item.protein}</protein>
      <carbs>${item.carbs}</carbs>
      <fat>${item.fat}</fat>${
        item.grams !== undefined ? `\n      <grams>${item.grams}</grams>` : ''
      }${item.fiber !== undefined ? `\n      <fiber>${item.fiber}</fiber>` : ''}
    </item>`,
    )
    .join('\n');

  const micros =
    result.micronutrients
      ?.map(
        (m) => `    <micronutrient>
      <id>${m.id}</id>
      <amount>${m.amount}</amount>
      <unit>${m.unit}</unit>
    </micronutrient>`,
      )
      .join('\n') ?? '';

  return `<analysis>
  <foodName>${escapeXml(result.foodName)}</foodName>${
    result.itemCount !== undefined
      ? `\n  <itemCount>${result.itemCount}</itemCount>`
      : ''
  }${
    result.totalGrams !== undefined
      ? `\n  <totalGrams>${result.totalGrams}</totalGrams>`
      : ''
  }
  <calories>${result.calories}</calories>
  <protein>${result.protein}</protein>
  <carbs>${result.carbs}</carbs>
  <fat>${result.fat}</fat>
  <fiber>${result.fiber}</fiber>${
    result.confidence !== undefined
      ? `\n  <confidence>${result.confidence}</confidence>`
      : ''
  }${
    result.healthiness !== undefined
      ? `\n  <healthiness>${result.healthiness}</healthiness>`
      : ''
  }
  <items>
${items}
  </items>${
    micros
      ? `
  <micronutrients>
${micros}
  </micronutrients>`
      : ''
  }
</analysis>`;
}

/** Serialize NutritionResult to XML (tests / examples) — Gemini schema. */
export function nutritionResultToXml(result: NutritionResult): string {
  const items = result.items
    .map((item) => {
      const grams =
        item.grams !== undefined ? `\n      <grams>${item.grams}</grams>` : '';
      const fiber =
        item.fiber !== undefined
          ? `\n      <fiber unit="g">${item.fiber}</fiber>`
          : '';
      return `    <item>
      <name>${escapeXml(item.name)}</name>${grams}
      <calories unit="kcal">${item.calories}</calories>
      <protein unit="g">${item.protein}</protein>
      <carbs unit="g">${item.carbs}</carbs>
      <fat unit="g">${item.fat}</fat>${fiber}
    </item>`;
    })
    .join('\n');

  const micros =
    result.micronutrients
      ?.map(
        (m) =>
          `    <nutrient name="${m.id}" amount_mg="${toAmountMg(m)}"/>`,
      )
      .join('\n') ?? '';

  const disclaimers =
    result.disclaimers && result.disclaimers.length > 0
      ? `
  <disclaimers>
${result.disclaimers.map((d) => `    <disclaimer>${escapeXml(d)}</disclaimer>`).join('\n')}
  </disclaimers>`
      : '';

  const portionRef =
    result.portionReference !== undefined
      ? `\n  <portionReference>${escapeXml(result.portionReference)}</portionReference>`
      : '';

  const itemCountXml =
    result.itemCount !== undefined
      ? `\n  <itemCount>${result.itemCount}</itemCount>`
      : '';

  const totalGramsXml =
    result.totalGrams !== undefined
      ? `\n  <totalGrams>${result.totalGrams}</totalGrams>`
      : '';

  const addedSugar =
    result.addedSugar !== undefined
      ? `\n    <addedSugar unit="g">${result.addedSugar}</addedSugar>`
      : '';

  const confidenceXml =
    result.confidence !== undefined
      ? `\n  <confidence value="${result.confidence}">${
          result.confidenceReason ? escapeXml(result.confidenceReason) : ''
        }</confidence>`
      : '';
  const healthinessXml =
    result.healthiness !== undefined
      ? `\n  <healthiness value="${result.healthiness}">${
          result.healthinessReason ? escapeXml(result.healthinessReason) : ''
        }</healthiness>`
      : '';

  return `<analysis>
  <foodName>${escapeXml(result.foodName)}</foodName>${itemCountXml}${totalGramsXml}${portionRef}
  <totals>
    <calories unit="kcal">${result.calories}</calories>
    <protein unit="g">${result.protein}</protein>
    <carbs unit="g">${result.carbs}</carbs>${addedSugar}
    <fat unit="g">${result.fat}</fat>
    <fiber unit="g">${result.fiber}</fiber>
  </totals>${confidenceXml}${healthinessXml}
  <items>
${items}
  </items>${
    micros
      ? `
  <micronutrients>
${micros}
  </micronutrients>`
      : ''
  }${disclaimers}
</analysis>`;
}

export function noFoodResultToXml(reason: string): string {
  return `<analysis>
  <noFood>true</noFood>
  <reason>${escapeXml(reason)}</reason>
</analysis>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
