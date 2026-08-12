import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/errors.js';
import { parseGatewayRequestListQuery } from './parseGatewayRequestListQuery.js';

describe('parseGatewayRequestListQuery', () => {
  it('defaults page=1 and pageSize=50 for valid type', () => {
    expect(parseGatewayRequestListQuery({ type: 'food_analyze' })).toEqual({
      type: 'food_analyze',
      page: 1,
      pageSize: 50,
    });
  });

  it('parses page and pageSize', () => {
    expect(
      parseGatewayRequestListQuery({
        type: 'food_refine',
        page: '2',
        pageSize: '25',
      }),
    ).toEqual({ type: 'food_refine', page: 2, pageSize: 25 });
  });

  it('rejects missing type', () => {
    expect(() => parseGatewayRequestListQuery({})).toThrow(ApiError);
    try {
      parseGatewayRequestListQuery({});
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(400);
    }
  });

  it('rejects invalid type', () => {
    expect(() =>
      parseGatewayRequestListQuery({ type: 'nope' }),
    ).toThrow(ApiError);
  });

  it('rejects page < 1 and pageSize out of range', () => {
    expect(() =>
      parseGatewayRequestListQuery({ type: 'food_ask', page: '0' }),
    ).toThrow(ApiError);
    expect(() =>
      parseGatewayRequestListQuery({ type: 'food_ask', pageSize: '101' }),
    ).toThrow(ApiError);
    expect(() =>
      parseGatewayRequestListQuery({ type: 'food_ask', pageSize: '0' }),
    ).toThrow(ApiError);
  });
});
