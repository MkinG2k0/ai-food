import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ApiError } from '../../lib/errors.js';
import { errorHandler, asyncHandler } from './error.js';

function buildApp() {
  const app = express();
  app.get(
    '/boom',
    asyncHandler(async () => {
      throw new ApiError(401, 'UNAUTHORIZED', 'Valid API key required.');
    }),
  );
  app.get(
    '/raw',
    asyncHandler(async () => {
      throw new Error('secret internals');
    }),
  );
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('sends ApiError as { message, code, status }', async () => {
    const res = await request(buildApp()).get('/boom');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      message: 'Valid API key required.',
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });

  it('maps unknown errors to 500 UPSTREAM_ERROR without leaking message', async () => {
    const res = await request(buildApp()).get('/raw');
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('UPSTREAM_ERROR');
    expect(res.body.message).not.toContain('secret');
  });
});
