import express from 'express';
import cors from 'cors';
import { ApiError } from '../lib/errors.js';
import { errorHandler } from './middleware/error.js';
import { requireApiKey } from './middleware/auth.js';
import { enforceChatQuota } from './middleware/quota.js';
import { healthRouter } from './routes/health.js';
import { modelsRouter } from './routes/models.js';
import { embeddingsRouter } from './routes/embeddings.js';
import { chatRouter } from './routes/chat.js';
import { foodRouter } from './routes/food.js';
import { authRouter } from './routes/auth.js';
import { usageRouter } from './routes/usage.js';
import { billingRouter } from './routes/billing.js';
import { adminRouter } from './routes/admin.js';
import { telegramWebhookRouter } from './routes/telegramWebhook.js';
import { userMealsRouter } from './routes/userMeals.js';
import { userWeightsRouter } from './routes/userWeights.js';
import { userFavoritesRouter } from './routes/userFavorites.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Device-Id',
        'X-User-Token',
        'X-Usage-Kind',
        'X-Admin-Key',
      ],
    }),
  );
  app.use(express.json({ limit: '10mb' }));

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/usage', usageRouter);
  app.use('/billing', billingRouter);
  app.use('/admin', adminRouter);
  app.use('/telegram/webhook', telegramWebhookRouter);
  app.use('/user/meals', userMealsRouter);
  app.use('/user/weights', userWeightsRouter);
  app.use('/user/favorites', userFavoritesRouter);

  const v1 = express.Router();
  v1.use(requireApiKey);
  v1.use('/models', modelsRouter);
  v1.use('/embeddings', embeddingsRouter);
  v1.use('/chat/completions', enforceChatQuota, chatRouter);
  v1.use('/food', enforceChatQuota, foodRouter);
  app.use('/v1', v1);

  app.use((_req, _res, next) => {
    next(new ApiError(404, 'NOT_FOUND', 'Route not found.'));
  });

  app.use(errorHandler);
  return app;
}
