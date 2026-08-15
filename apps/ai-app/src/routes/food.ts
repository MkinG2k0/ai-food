import { Router } from 'express';
import { z } from 'zod';
import type OpenAI from 'openai';
import { asyncHandler } from '../middleware/error.js';
import { ApiError, mapOpenAIError } from '../../lib/errors.js';
import { runOpenAI, runOpenAIHeld } from '../../lib/openai.js';
import { finalizeQuotaUsage } from '../middleware/quota.js';
import { startGatewayRequestTimer } from '../lib/recordGatewayRequest.js';
import {
  DEFAULT_ANALYZE_FEATURES,
  type AnalyzeFeatures,
} from '../food/analyzeFeatures.js';
import {
  buildAnalyzeMessages,
  buildAskMessages,
  buildRefineMessages,
} from '../food/buildMessages.js';
import { FOOD_TEMPERATURE, resolveModel } from '../food/modelConfig.js';
import {
  analyzeJobOwnerKey,
  canAccessAnalyzeJob,
  completeAnalyzeJob,
  createAnalyzeJob,
  failAnalyzeJob,
  getAnalyzeJob,
  publicAnalyzeJob,
} from '../food/analyzeJobs.js';

const STREAM_TIMEOUT_MS = 120_000;

const DietTypeSchema = z.enum(['none', 'halal', 'vegan', 'vegetarian']);

const AnalyzeFeaturesSchema = z
  .object({
    vitamins: z.boolean().optional(),
    healthiness: z.boolean().optional(),
    composition: z.boolean().optional(),
  })
  .optional();

const RefineMealItemSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  grams: z.number(),
});

const AskMealItemSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  grams: z.number().optional(),
});

const AnalyzeBodySchema = z
  .object({
    images: z.array(z.string()).optional(),
    description: z.string().optional(),
    customInstructions: z.string().optional(),
    dietType: DietTypeSchema.optional(),
    features: AnalyzeFeaturesSchema,
    /** Client meal id — used only to index the durable job, never stored as a blob. */
    clientMealId: z.string().min(1).optional(),
  })
  .strict();

const RefineBodySchema = z
  .object({
    correction: z.string().min(1),
    mealContext: z.object({
      name: z.string().optional(),
      items: z.array(RefineMealItemSchema),
    }),
    imageDataUrl: z.string().optional(),
    customInstructions: z.string().optional(),
    dietType: DietTypeSchema.optional(),
    features: AnalyzeFeaturesSchema,
  })
  .strict();

const AskBodySchema = z
  .object({
    mealContext: z.object({
      name: z.string().optional(),
      totalCalories: z.number(),
      items: z.array(AskMealItemSchema),
    }),
    customInstructions: z.string().optional(),
    question: z.string().optional(),
  })
  .strict();

function resolveFeatures(
  partial?: {
    vitamins?: boolean;
    healthiness?: boolean;
    composition?: boolean;
  },
): AnalyzeFeatures {
  return {
    vitamins: partial?.vitamins ?? DEFAULT_ANALYZE_FEATURES.vitamins,
    healthiness: partial?.healthiness ?? DEFAULT_ANALYZE_FEATURES.healthiness,
    composition: partial?.composition ?? DEFAULT_ANALYZE_FEATURES.composition,
  };
}

function extractDeltaContent(chunk: unknown): string {
  if (!chunk || typeof chunk !== 'object') return '';
  const choices = (chunk as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';
  const content = (choices[0] as { delta?: { content?: unknown } })?.delta
    ?.content;
  return typeof content === 'string' ? content : '';
}

function isClientGone(
  req: { aborted?: boolean },
  res: { destroyed: boolean; writableEnded: boolean },
  disconnected: boolean,
): boolean {
  return disconnected || Boolean(req.aborted) || res.destroyed || res.writableEnded;
}

function writeSse(
  res: Parameters<Parameters<typeof asyncHandler>[0]>[1],
  payload: string,
): boolean {
  if (res.destroyed || res.writableEnded) return false;
  try {
    return res.write(payload);
  } catch {
    return false;
  }
}

function beginAnalyzeSse(
  req: Parameters<Parameters<typeof asyncHandler>[0]>[0],
  res: Parameters<Parameters<typeof asyncHandler>[0]>[1],
  jobId: string,
): boolean {
  if (req.aborted || res.destroyed || res.headersSent) return false;
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('X-Analyze-Job-Id', jobId);
  res.setHeader('Access-Control-Expose-Headers', 'X-Analyze-Job-Id');
  res.flushHeaders?.();
  writeSse(res, `data: ${JSON.stringify({ jobId })}\n\n`);
  return true;
}

async function streamCompletion(
  req: Parameters<Parameters<typeof asyncHandler>[0]>[0],
  res: Parameters<Parameters<typeof asyncHandler>[0]>[1],
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  model: string,
  jobId: string,
) {
  const baseParams = {
    model,
    messages,
    temperature: FOOD_TEMPERATURE,
  };

  const timer = startGatewayRequestTimer();
  let ok = false;
  let startedUpstream = false;

  await runOpenAIHeld(async (client, release) => {
    const createAbort = new AbortController();
    let stream:
      | {
          controller: AbortController;
          [Symbol.asyncIterator](): AsyncIterator<
            OpenAI.Chat.Completions.ChatCompletionChunk
          >;
        }
      | undefined;
    let disconnected = req.aborted || res.destroyed || res.writableEnded;
    let completed = false;
    const isDisconnected = () => isClientGone(req, res, disconnected);
    const onDisconnect = () => {
      if (completed) return;
      disconnected = true;
    };
    req.once('aborted', onDisconnect);
    res.once('close', onDisconnect);

    try {
      try {
        stream = await client.chat.completions.create(
          { ...baseParams, stream: true },
          { timeout: STREAM_TIMEOUT_MS, signal: createAbort.signal },
        );
        startedUpstream = true;
      } catch (error) {
        startedUpstream = true;
        throw error;
      }

      await finalizeQuotaUsage(req);

      if (!res.headersSent && !isDisconnected()) {
        beginAnalyzeSse(req, res, jobId);
      }

      let accumulated = '';
      for await (const chunk of stream) {
        timer.markTtfb();
        accumulated += extractDeltaContent(chunk);
        if (!isDisconnected()) {
          if (!writeSse(res, `data: ${JSON.stringify(chunk)}\n\n`)) {
            disconnected = true;
          }
        }
      }

      completeAnalyzeJob(jobId, accumulated);
      timer.markTtfb();
      completed = true;
      ok = true;

      if (!res.headersSent) {
        res.status(200).json(publicAnalyzeJob(getAnalyzeJob(jobId)!));
        return;
      }
      if (!isDisconnected()) {
        writeSse(res, 'data: [DONE]\n\n');
      }
      if (!res.writableEnded) {
        res.end();
      }
    } finally {
      req.off('aborted', onDisconnect);
      res.off('close', onDisconnect);
      release();
      if (startedUpstream) {
        void timer.finish({
          ok,
          type: 'food_analyze',
          stream: true,
          userId: req.quota?.userId,
          deviceId: req.quota?.deviceRowId,
        });
      }
    }
  });
}

export const foodRouter = Router();

foodRouter.post(
  '/analyze',
  asyncHandler(async (req, res) => {
    const parsed = AnalyzeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Invalid food analyze request body.',
      );
    }

    const body = parsed.data;
    const images = (body.images ?? []).filter((s) => typeof s === 'string' && s.length > 0);
    const description = body.description?.trim() ?? '';
    if (images.length === 0 && !description) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Provide at least one image or a non-empty description.',
      );
    }

    const model = resolveModel();
    const messages = buildAnalyzeMessages({
      images,
      description,
      customInstructions: body.customInstructions,
      dietType: body.dietType,
      features: resolveFeatures(body.features),
      model,
    });

    const job = createAnalyzeJob({
      ownerKey: analyzeJobOwnerKey(req.header('x-device-id') ?? undefined),
      clientMealId: body.clientMealId,
    });
    beginAnalyzeSse(req, res, job.id);

    try {
      await streamCompletion(req, res, messages, model, job.id);
    } catch (error) {
      console.error('OpenRouter food/analyze error:', error);
      const mapped = mapOpenAIError(error);
      failAnalyzeJob(job.id, mapped);
      if (!res.headersSent) {
        throw new ApiError(mapped.status, mapped.code, mapped.message);
      }
      writeSse(
        res,
        `data: ${JSON.stringify({ error: mapped })}\n\n`,
      );
      writeSse(res, 'data: [DONE]\n\n');
      if (!res.writableEnded) {
        res.end();
      }
    }
  }),
);

foodRouter.get(
  '/analyze/:jobId',
  asyncHandler(async (req, res) => {
    const jobId = String(req.params.jobId ?? '').trim();
    const ownerKey = analyzeJobOwnerKey(req.header('x-device-id') ?? undefined);
    const job = getAnalyzeJob(jobId);
    if (!job || !canAccessAnalyzeJob(job, ownerKey)) {
      throw new ApiError(404, 'JOB_NOT_FOUND', 'Analyze job not found.');
    }
    res.json(publicAnalyzeJob(job));
  }),
);

foodRouter.post(
  '/refine',
  asyncHandler(async (req, res) => {
    const parsed = RefineBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Invalid food refine request body.',
      );
    }

    const body = parsed.data;
    const model = resolveModel();
    const messages = buildRefineMessages({
      correction: body.correction.trim(),
      mealContext: body.mealContext,
      imageDataUrl: body.imageDataUrl,
      customInstructions: body.customInstructions,
      dietType: body.dietType,
      features: resolveFeatures(body.features),
    });

    const timer = startGatewayRequestTimer();
    let ok = false;
    try {
      const completion = await runOpenAI((client) =>
        client.chat.completions.create({
          model,
          messages,
          temperature: FOOD_TEMPERATURE,
          response_format: { type: 'json_object' },
          stream: false,
        }),
      );
      await finalizeQuotaUsage(req);
      timer.markTtfb();
      ok = true;
      res.json(completion);
    } catch (error) {
      console.error('OpenRouter food/refine error:', error);
      const mapped = mapOpenAIError(error);
      throw new ApiError(mapped.status, mapped.code, mapped.message);
    } finally {
      void timer.finish({
        ok,
        type: 'food_refine',
        stream: false,
        userId: req.quota?.userId,
        deviceId: req.quota?.deviceRowId,
      });
    }
  }),
);

foodRouter.post(
  '/ask',
  asyncHandler(async (req, res) => {
    const parsed = AskBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Invalid food ask request body.',
      );
    }

    const body = parsed.data;
    const question = body.question?.trim() ?? '';
    const instructions = body.customInstructions?.trim() ?? '';
    if (!question && !instructions) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Provide question or customInstructions.',
      );
    }

    const model = resolveModel();
    const messages = buildAskMessages({
      mealContext: body.mealContext,
      customInstructions: body.customInstructions,
      question: body.question,
    });

    const timer = startGatewayRequestTimer();
    let ok = false;
    try {
      const completion = await runOpenAI((client) =>
        client.chat.completions.create({
          model,
          messages,
          temperature: FOOD_TEMPERATURE,
          stream: false,
        }),
      );
      await finalizeQuotaUsage(req);
      timer.markTtfb();
      ok = true;
      res.json(completion);
    } catch (error) {
      console.error('OpenRouter food/ask error:', error);
      const mapped = mapOpenAIError(error);
      throw new ApiError(mapped.status, mapped.code, mapped.message);
    } finally {
      void timer.finish({
        ok,
        type: 'food_ask',
        stream: false,
        userId: req.quota?.userId,
        deviceId: req.quota?.deviceRowId,
      });
    }
  }),
);
