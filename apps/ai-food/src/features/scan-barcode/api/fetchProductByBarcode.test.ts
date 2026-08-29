import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OffProductError,
  fetchProductByBarcode,
  getOffProductErrorMessage,
} from './fetchProductByBarcode';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchProductByBarcode', () => {
  it('maps OFF HTTP 404 + product not found to Russian NOT_FOUND', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: '4607001234567',
            status: 0,
            status_verbose: 'product not found',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(fetchProductByBarcode('4607001234567')).rejects.toMatchObject({
      name: 'OffProductError',
      code: 'NOT_FOUND',
      message: 'Продукт не найден',
    });
  });

  it('maps status 0 body on 200 to NOT_FOUND', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: '4607001234567',
            status: 0,
            status_verbose: 'product not found',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(fetchProductByBarcode('4607001234567')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Продукт не найден',
    });
  });
});

describe('getOffProductErrorMessage', () => {
  it('returns Russian text and never English API verbose', () => {
    expect(getOffProductErrorMessage(new OffProductError('NOT_FOUND'))).toBe(
      'Продукт не найден',
    );
    expect(getOffProductErrorMessage(new OffProductError('NOT_FOUND'))).not.toMatch(
      /product not found/i,
    );
    expect(getOffProductErrorMessage(new Error('product not found'))).toBe(
      'Не удалось загрузить продукт',
    );
  });
});
