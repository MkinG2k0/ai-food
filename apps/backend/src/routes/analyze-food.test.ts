import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { AnalyzeFoodResponse } from '@ai-food/shared-types';

// Must be hoisted — mock the entire openai module before imports resolve
vi.mock('openai');

// Import OpenAI AFTER vi.mock so we get the mocked version
import OpenAI from 'openai';
// Import the router under test (static import — vi.mock hoisting ensures the mock is in place)
import analyzeFoodRouter from './analyze-food';

// Helper: build a minimal express app mounting the router under /
function buildApp() {
  const app = express();
  app.use('/', analyzeFoodRouter);
  return app;
}

// Valid JSON string matching NutritionResult
const VALID_NUTRITION_JSON = JSON.stringify({
  foodName: 'Grilled Chicken',
  calories: 300,
  protein: 40,
  carbs: 5,
  fat: 10,
  fiber: 1,
  confidence: 0.92,
});

// Helper: create a mock image buffer for multipart upload
const FAKE_IMAGE = Buffer.from('fakeimagedata');

describe('POST /analyze-food', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AI-01: Successful response returns HTTP 200 with correct shape
  it('AI-01: returns 200 with foodName string and processingTime number on success', async () => {
    // Mock OpenAI instance to return valid nutrition JSON
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: VALID_NUTRITION_JSON,
          },
        },
      ],
    });

    vi.mocked(OpenAI).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }) as unknown as OpenAI);

    const app = buildApp();

    const response = await request(app)
      .post('/')
      .attach('image', FAKE_IMAGE, { filename: 'food.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(200);
    expect(typeof (response.body as AnalyzeFoodResponse).result.foodName).toBe('string');
    expect(typeof (response.body as AnalyzeFoodResponse).processingTime).toBe('number');
  });

  // AI-02: Response body conforms to AnalyzeFoodResponse contract
  it('AI-02: response body has all 7 NutritionResult fields with correct types', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: VALID_NUTRITION_JSON,
          },
        },
      ],
    });

    vi.mocked(OpenAI).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }) as unknown as OpenAI);

    const app = buildApp();

    const response = await request(app)
      .post('/')
      .attach('image', FAKE_IMAGE, { filename: 'food.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(200);
    const body = response.body as AnalyzeFoodResponse;

    // Check processingTime is a number
    expect(typeof body.processingTime).toBe('number');

    // Check result has all 7 fields
    const { result } = body;
    expect(typeof result.foodName).toBe('string');
    expect(typeof result.calories).toBe('number');
    expect(typeof result.protein).toBe('number');
    expect(typeof result.carbs).toBe('number');
    expect(typeof result.fat).toBe('number');
    expect(typeof result.fiber).toBe('number');
    expect(typeof result.confidence).toBe('number');

    // Confidence must be between 0 and 1
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  // ERR-03a: No file attached returns 400 INVALID_IMAGE
  it('ERR-03a: returns 400 with code INVALID_IMAGE when no image file attached', async () => {
    vi.mocked(OpenAI).mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    }) as unknown as OpenAI);

    const app = buildApp();

    const response = await request(app).post('/').set('Content-Type', 'multipart/form-data');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_IMAGE');
  });

  // ERR-03b: RateLimitError returns 429 RATE_LIMITED
  it('ERR-03b: returns 429 with code RATE_LIMITED when OpenAI throws RateLimitError', async () => {
    const rateLimitError = new OpenAI.RateLimitError(
      429,
      { error: { message: 'Rate limited', type: 'rate_limit_error' } },
      'Rate limit exceeded',
      {} as Parameters<typeof OpenAI.RateLimitError>[2],
    );

    const mockCreate = vi.fn().mockRejectedValue(rateLimitError);

    vi.mocked(OpenAI).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }) as unknown as OpenAI);

    const app = buildApp();

    const response = await request(app)
      .post('/')
      .attach('image', FAKE_IMAGE, { filename: 'food.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(429);
    expect(response.body.code).toBe('RATE_LIMITED');
  });

  // ERR-03c: APIConnectionTimeoutError returns 504 ANALYSIS_TIMEOUT
  it('ERR-03c: returns 504 with code ANALYSIS_TIMEOUT when OpenAI throws APIConnectionTimeoutError', async () => {
    const timeoutError = new OpenAI.APIConnectionTimeoutError();

    const mockCreate = vi.fn().mockRejectedValue(timeoutError);

    vi.mocked(OpenAI).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }) as unknown as OpenAI);

    const app = buildApp();

    const response = await request(app)
      .post('/')
      .attach('image', FAKE_IMAGE, { filename: 'food.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(504);
    expect(response.body.code).toBe('ANALYSIS_TIMEOUT');
  });

  // ERR-03d: Non-JSON content from OpenAI returns 500 ANALYSIS_FAILED
  it('ERR-03d: returns 500 with code ANALYSIS_FAILED when OpenAI returns non-JSON content', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: 'This is not JSON at all, just plain text.',
          },
        },
      ],
    });

    vi.mocked(OpenAI).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }) as unknown as OpenAI);

    const app = buildApp();

    const response = await request(app)
      .post('/')
      .attach('image', FAKE_IMAGE, { filename: 'food.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(500);
    expect(response.body.code).toBe('ANALYSIS_FAILED');
  });
});
