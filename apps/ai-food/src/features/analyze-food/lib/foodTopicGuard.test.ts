import { describe, it, expect } from 'vitest';
import {
  isObviouslyIrrelevantFoodInput,
  isOffTopicAskResponse,
  isOffTopicRefinePayload,
  offTopicApiError,
} from './foodTopicGuard';

describe('isObviouslyIrrelevantFoodInput', () => {
  it('rejects bare number (must not rescale grams)', () => {
    expect(isObviouslyIrrelevantFoodInput('22')).toBe(true);
  });

  it('rejects keyboard mash', () => {
    expect(isObviouslyIrrelevantFoodInput('12312фыв')).toBe(true);
  });

  it('rejects math questions', () => {
    expect(isObviouslyIrrelevantFoodInput('сколько будет 2+2')).toBe(true);
  });

  it('rejects off-topic code requests', () => {
    expect(isObviouslyIrrelevantFoodInput('напиши функцию')).toBe(true);
  });

  it('rejects identity questions', () => {
    expect(isObviouslyIrrelevantFoodInput('кто ты')).toBe(true);
  });

  it('allows cooking questions about the dish', () => {
    expect(isObviouslyIrrelevantFoodInput('как приготовить это блюдо')).toBe(
      false,
    );
  });

  it('allows portion edits with food intent', () => {
    expect(isObviouslyIrrelevantFoodInput('сделай порцию 200 г')).toBe(false);
  });

  it('allows calorie questions', () => {
    expect(isObviouslyIrrelevantFoodInput('сколько калорий')).toBe(false);
  });
});

describe('isOffTopicAskResponse', () => {
  it('detects OFF_TOPIC sentinel', () => {
    expect(isOffTopicAskResponse('OFF_TOPIC')).toBe(true);
    expect(isOffTopicAskResponse('  OFF_TOPIC\n')).toBe(true);
  });

  it('rejects normal markdown', () => {
    expect(isOffTopicAskResponse('## Калории\nОколо 320 ккал.')).toBe(false);
  });
});

describe('isOffTopicRefinePayload', () => {
  it('detects offTopic payload', () => {
    expect(
      isOffTopicRefinePayload({ offTopic: true, reason: 'не про блюдо' }),
    ).toBe(true);
  });

  it('rejects NutritionResult-shaped objects', () => {
    expect(
      isOffTopicRefinePayload({
        foodName: 'Борщ',
        calories: 320,
        protein: 10,
        carbs: 40,
        fat: 8,
        items: [],
      }),
    ).toBe(false);
  });
});

describe('offTopicApiError', () => {
  it('returns ApiError OFF_TOPIC 400 with Russian ask message', () => {
    const err = offTopicApiError('ask');
    expect(err).toMatchObject({ code: 'OFF_TOPIC', status: 400 });
    expect(err.message.toLowerCase()).toMatch(/вопрос/);
    expect(err.message.toLowerCase()).toMatch(/невалид|не по теме|темы/);
  });

  it('returns ApiError OFF_TOPIC 400 with Russian edit message', () => {
    const err = offTopicApiError('edit');
    expect(err).toMatchObject({ code: 'OFF_TOPIC', status: 400 });
    expect(err.message.toLowerCase()).toMatch(/уточнен/);
    expect(err.message.toLowerCase()).toMatch(/невалид|не по теме|темы/);
    expect(err.message.toLowerCase()).toMatch(/состав/);
  });
});
