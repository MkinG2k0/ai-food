import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireApiKey } from './auth.js';
import { errorHandler } from './error.js';

const ORIGINAL = process.env.API_KEY;

function appWithAuth() {
  const app = express();
  app.get('/v1/secure', requireApiKey, (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

describe('requireApiKey', () => {
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = ORIGINAL;
  });

  it('allows when API_KEY unset', async () => {
    delete process.env.API_KEY;
    const res = await request(appWithAuth()).get('/v1/secure');
    expect(res.status).toBe(200);
  });

  it('401 when API_KEY set and header missing', async () => {
    process.env.API_KEY = 'secret';
    const res = await request(appWithAuth()).get('/v1/secure');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('allows Bearer token', async () => {
    process.env.API_KEY = 'secret';
    const res = await request(appWithAuth())
      .get('/v1/secure')
      .set('Authorization', 'Bearer secret');
    expect(res.status).toBe(200);
  });

  it('allows X-API-Key', async () => {
    process.env.API_KEY = 'secret';
    const res = await request(appWithAuth())
      .get('/v1/secure')
      .set('X-API-Key', 'secret');
    expect(res.status).toBe(200);
  });
});
