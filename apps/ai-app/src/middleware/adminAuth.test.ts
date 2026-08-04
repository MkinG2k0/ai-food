import { describe, it, expect, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAdminKey } from './adminAuth.js';
import { ApiError } from '../../lib/errors.js';

function run(headers: Record<string, string>) {
  const req = {
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
  let err: unknown;
  let nextCalled = false;
  requireAdminKey(req, {} as Response, ((e?: unknown) => {
    nextCalled = true;
    err = e;
  }) as NextFunction);
  return { err, nextCalled };
}

describe('requireAdminKey', () => {
  const prev = process.env.ADMIN_API_KEY;
  afterEach(() => {
    if (prev === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = prev;
  });

  it('rejects when ADMIN_API_KEY unset (fail-closed)', () => {
    delete process.env.ADMIN_API_KEY;
    const { err } = run({ 'x-admin-key': 'anything' });
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
  });

  it('rejects missing or wrong key', () => {
    process.env.ADMIN_API_KEY = 'secret';
    expect((run({}).err as ApiError).status).toBe(401);
    expect((run({ 'x-admin-key': 'nope' }).err as ApiError).status).toBe(401);
  });

  it('calls next() on match', () => {
    process.env.ADMIN_API_KEY = 'secret';
    const { err, nextCalled } = run({ 'x-admin-key': 'secret' });
    expect(nextCalled).toBe(true);
    expect(err).toBeUndefined();
  });
});
