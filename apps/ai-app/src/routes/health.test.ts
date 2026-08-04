import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

const ORIGINAL = process.env.API_KEY;

describe('GET /health', () => {
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = ORIGINAL;
  });

  it('returns { status: ok }', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 200 when API_KEY is set without auth header', async () => {
    process.env.API_KEY = 'secret';
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
