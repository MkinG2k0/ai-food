import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error.js';
import { ApiError, mapOpenAIError } from '../../lib/errors.js';
import { runOpenAI } from '../../lib/openai.js';
import { startGatewayRequestTimer } from '../lib/recordGatewayRequest.js';

const EmbeddingsBodySchema = z.object({
  model: z.string().min(1),
  input: z.union([z.string(), z.array(z.string()).min(1)]),
  dimensions: z.number().optional(),
  encoding_format: z.enum(['float', 'base64']).optional(),
  user: z.string().optional(),
});

export const embeddingsRouter = Router();

embeddingsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = EmbeddingsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid embeddings request body.');
    }
    const body = parsed.data;
    const timer = startGatewayRequestTimer();
    let ok = false;
    try {
      const result = await runOpenAI((client) =>
        client.embeddings.create({
          model: body.model,
          input: body.input,
          dimensions: body.dimensions,
          encoding_format: body.encoding_format,
          user: body.user,
        }),
      );
      timer.markTtfb();
      ok = true;
      res.json(result);
    } catch (error) {
      console.error('OpenRouter embeddings.create error:', error);
      const mapped = mapOpenAIError(error);
      throw new ApiError(mapped.status, mapped.code, mapped.message);
    } finally {
      void timer.finish({
        ok,
        type: 'embeddings',
        stream: false,
        userId: req.quota?.userId,
        deviceId: req.quota?.deviceRowId,
      });
    }
  }),
);
