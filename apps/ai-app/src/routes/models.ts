import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';
import { ApiError, mapOpenAIError } from '../../lib/errors.js';
import { runOpenAI } from '../../lib/openai.js';
import { startGatewayRequestTimer } from '../lib/recordGatewayRequest.js';

export const modelsRouter = Router();

modelsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const timer = startGatewayRequestTimer();
    let ok = false;
    try {
      const page = await runOpenAI((client) => client.models.list());
      timer.markTtfb();
      ok = true;
      res.json({ object: 'list', data: page.data });
    } catch (error) {
      console.error('OpenRouter models.list error:', error);
      const mapped = mapOpenAIError(error);
      throw new ApiError(mapped.status, mapped.code, mapped.message);
    } finally {
      void timer.finish({
        ok,
        type: 'models',
        stream: false,
        userId: req.quota?.userId,
        deviceId: req.quota?.deviceRowId,
      });
    }
  }),
);
