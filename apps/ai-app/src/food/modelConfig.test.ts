import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_OPENROUTER_MODEL,
  FOOD_TEMPERATURE,
  resolveModel,
} from './modelConfig.js';

describe('resolveModel', () => {
  const prev = process.env.OPENROUTER_MODEL;

  afterEach(() => {
    if (prev === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = prev;
  });

  it('uses DEFAULT_OPENROUTER_MODEL when env missing or blank', () => {
    delete process.env.OPENROUTER_MODEL;
    expect(resolveModel()).toBe(DEFAULT_OPENROUTER_MODEL);
    process.env.OPENROUTER_MODEL = '   ';
    expect(resolveModel()).toBe(DEFAULT_OPENROUTER_MODEL);
  });

  it('trims and returns OPENROUTER_MODEL when set', () => {
    process.env.OPENROUTER_MODEL = '  openai/gpt-test  ';
    expect(resolveModel()).toBe('openai/gpt-test');
  });

  it('keeps food temperature hardcoded at 0', () => {
    expect(FOOD_TEMPERATURE).toBe(0);
  });
});
