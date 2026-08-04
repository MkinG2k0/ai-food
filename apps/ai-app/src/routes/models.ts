import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';
import { ApiError, mapOpenAIError } from '../../lib/errors.js';
import { runOpenAI } from '../../lib/openai.js';

export const modelsRouter = Router();

modelsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    try {
      const page = await runOpenAI((client) => client.models.list());
      res.json({ object: 'list', data: page.data });
    } catch (error) {
      console.error('OpenRouter models.list error:', error);
      const mapped = mapOpenAIError(error);
      throw new ApiError(mapped.status, mapped.code, mapped.message);
    }
  }),
);
