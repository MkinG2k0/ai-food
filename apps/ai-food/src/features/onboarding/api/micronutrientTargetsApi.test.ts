import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { UserProfile } from '@ai-food/shared-types';
import { MICRONUTRIENT_IDS, MICRONUTRIENT_UNITS } from '@ai-food/shared-types';
import axios from 'axios';
import { micronutrientTargetsApi } from './micronutrientTargetsApi';
import { defaultMicronutrientTargets } from '../model/defaultMicronutrientTargets';

vi.mock('axios', () => {
  const post = vi.fn();
  return {
    default: {
      post,
      create: () => ({
        post,
        interceptors: { response: { use: vi.fn() } },
      }),
    },
  };
});

const GATEWAY_URL = 'https://gateway.test.example';
const GATEWAY_KEY = 'test-gateway-key';

const profile: UserProfile = {
  gender: 'female',
  age: 30,
  height: 165,
  weight: 60,
  targetWeight: 58,
  targetWeightDate: '2026-10-16',
  activity: 'medium',
  goal: 'maintain',
  dietType: 'none',
};

function gatewaySuccessBody(content: string) {
  return {
    choices: [{ message: { content } }],
  };
}

describe('defaultMicronutrientTargets', () => {
  it('returns all catalog ids with positive amounts and correct units', () => {
    const targets = defaultMicronutrientTargets('male');
    expect(targets).toHaveLength(MICRONUTRIENT_IDS.length);
    expect(targets.map((t) => t.id)).toEqual([...MICRONUTRIENT_IDS]);
    for (const row of targets) {
      expect(row.amount).toBeGreaterThan(0);
      expect(row.unit).toBe(MICRONUTRIENT_UNITS[row.id]);
    }
  });

  it('uses higher iron for female', () => {
    const maleIron = defaultMicronutrientTargets('male').find((t) => t.id === 'iron')!;
    const femaleIron = defaultMicronutrientTargets('female').find((t) => t.id === 'iron')!;
    expect(femaleIron.amount).toBeGreaterThan(maleIron.amount);
  });
});

describe('micronutrientTargetsApi', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', GATEWAY_URL);
    vi.stubEnv('VITE_AI_GATEWAY_API_KEY', GATEWAY_KEY);
    vi.mocked(axios.post).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('parses valid AI JSON into catalog targets with correct units', async () => {
    const aiRows = MICRONUTRIENT_IDS.map((id) => ({
      id,
      amount: id === 'iron' ? 18 : 50,
      unit: MICRONUTRIENT_UNITS[id],
    }));
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify({ micronutrients: aiRows })),
    });

    const result = await micronutrientTargetsApi(profile, {
      model: 'openai/gpt-4.1',
    });

    expect(result).toHaveLength(MICRONUTRIENT_IDS.length);
    expect(result.map((t) => t.id)).toEqual([...MICRONUTRIENT_IDS]);
    expect(result.find((t) => t.id === 'iron')?.amount).toBe(18);
    for (const row of result) {
      expect(row.unit).toBe(MICRONUTRIENT_UNITS[row.id]);
    }
    expect(axios.post).toHaveBeenCalledWith(
      `${GATEWAY_URL}/v1/chat/completions`,
      expect.objectContaining({
        model: 'openai/gpt-4.1',
        response_format: { type: 'json_object' },
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringMatching(
              /targetWeight=58.*targetWeightDate=2026-10-16/,
            ),
          }),
        ]),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${GATEWAY_KEY}`,
        }),
      }),
    );
  });

  it('returns defaults on gateway failure without throwing', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('network down'));

    const result = await micronutrientTargetsApi(profile);

    expect(result).toEqual(defaultMicronutrientTargets('female'));
  });

  it('returns defaults on invalid JSON schema', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify({ micronutrients: [{ id: 'notANutrient', amount: 1 }] })),
    });

    const result = await micronutrientTargetsApi(profile);

    expect(result).toEqual(defaultMicronutrientTargets('female'));
  });
});
