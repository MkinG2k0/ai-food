import axios from 'axios';
import type {
  MicronutrientEstimate,
  MicronutrientId,
  UserProfile,
} from '@ai-food/shared-types';
import { MICRONUTRIENT_IDS, MICRONUTRIENT_UNITS } from '@ai-food/shared-types';
import { temperatureForModel } from '@/features/settings';
import { defaultMicronutrientTargets } from '../model/defaultMicronutrientTargets';

const ID_SET = new Set<string>(MICRONUTRIENT_IDS);

const ID_UNION = MICRONUTRIENT_IDS.map((id) => `"${id}"`).join('|');
const UG_IDS = MICRONUTRIENT_IDS.filter((id) => MICRONUTRIENT_UNITS[id] === 'µg').join(', ');
const MG_IDS = MICRONUTRIENT_IDS.filter((id) => MICRONUTRIENT_UNITS[id] === 'mg').join(', ');

const SYSTEM_PROMPT = `You are a nutrition assistant. Given a user profile, return ONLY a JSON object with daily micronutrient targets (RDA-like, not medical advice).

Return exactly:
{
  "micronutrients": [
    { "id": ${ID_UNION}, "amount": number, "unit": "mg"|"µg" }
  ]
}

Rules:
- Include all ${MICRONUTRIENT_IDS.length} ids exactly once.
- Units: ${UG_IDS} → "µg"; ${MG_IDS} → "mg".
- amount ≥ 0; use typical adult daily values adjusted for gender, age, height, weight, targetWeight, targetWeightDate, activity, goal, dietType.
- No text outside JSON.`;

function normalizeTargetRows(value: unknown): MicronutrientEstimate[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<MicronutrientId>();
  const out: MicronutrientEstimate[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== 'string' || !ID_SET.has(row.id)) continue;
    if (typeof row.amount !== 'number' || !Number.isFinite(row.amount) || row.amount < 0) {
      continue;
    }
    const id = row.id as MicronutrientId;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, amount: row.amount, unit: MICRONUTRIENT_UNITS[id] });
  }
  return out;
}

function extractMicronutrientsPayload(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== 'object') return undefined;
  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.micronutrients)) return obj.micronutrients;
  if (Array.isArray(parsed)) return parsed;
  return undefined;
}

/** Merge AI rows with defaults so all catalog ids are present with positive amounts when possible. */
function mergeWithDefaults(
  rows: MicronutrientEstimate[],
  gender: UserProfile['gender'],
): MicronutrientEstimate[] {
  const defaults = defaultMicronutrientTargets(gender);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return defaults.map((d) => {
    const row = byId.get(d.id);
    if (!row || row.amount <= 0) return d;
    return row;
  });
}

/**
 * Fetch personal daily micronutrient norms via client AI Gateway.
 * Never throws — returns defaultMicronutrientTargets on any failure.
 */
export async function micronutrientTargetsApi(
  profile: UserProfile,
  options?: { model?: string },
): Promise<MicronutrientEstimate[]> {
  const fallback = () => defaultMicronutrientTargets(profile.gender);

  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL;
  const apiKey = import.meta.env.VITE_AI_GATEWAY_API_KEY;

  if (!gatewayUrl || !apiKey) {
    return fallback();
  }

  const userText = [
    `gender=${profile.gender}`,
    `age=${profile.age}`,
    `height=${profile.height}`,
    `weight=${profile.weight}`,
    `targetWeight=${profile.targetWeight}`,
    `targetWeightDate=${profile.targetWeightDate}`,
    `activity=${profile.activity}`,
    `goal=${profile.goal}`,
    `dietType=${profile.dietType}`,
  ].join(', ');

  let response;
  try {
    const temperature = temperatureForModel(options?.model);
    response = await axios.post(
      `${gatewayUrl}/v1/chat/completions`,
      {
        model: options?.model,
        ...(temperature !== undefined ? { temperature } : {}),
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Профиль пользователя: ${userText}. Верни дневные нормы микронутриентов в JSON.`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
      },
    );
  } catch {
    return fallback();
  }

  const rawContent = response.data?.choices?.[0]?.message?.content;
  if (!rawContent || typeof rawContent !== 'string') {
    return fallback();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return fallback();
  }

  const rows = normalizeTargetRows(extractMicronutrientsPayload(parsed));
  if (rows.length === 0) {
    return fallback();
  }

  return mergeWithDefaults(rows, profile.gender);
}
