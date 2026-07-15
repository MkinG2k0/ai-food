import { describe, it, expect } from 'vitest';
import { calculateTargets } from './calculateTargets';

describe('calculateTargets', () => {
  it('calculates kcal for male, medium activity, maintain goal', () => {
    const result = calculateTargets({
      gender: 'male',
      age: 30,
      height: 175,
      weight: 75,
      activity: 'medium',
      goal: 'maintain',
      dietType: 'none',
    });
    // BMR = 10*75 + 6.25*175 - 5*30 + 5 = 750 + 1093.75 - 150 + 5 = 1698.75
    // TDEE = 1698.75 * 1.55 = 2633.06 → 2633
    expect(result.kcal).toBe(2633);
  });

  it('calculates kcal for female, low activity, lose goal', () => {
    const result = calculateTargets({
      gender: 'female',
      age: 25,
      height: 165,
      weight: 60,
      activity: 'low',
      goal: 'lose',
      dietType: 'none',
    });
    // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    // TDEE = 1345.25 * 1.2 = 1614.3 → 1614
    // kcal = 1614 - 300 = 1314
    expect(result.kcal).toBe(1314);
  });

  it('adds 300 kcal for gain goal', () => {
    const base = calculateTargets({
      gender: 'male',
      age: 25,
      height: 180,
      weight: 80,
      activity: 'low',
      goal: 'maintain',
      dietType: 'none',
    });
    const gain = calculateTargets({
      gender: 'male',
      age: 25,
      height: 180,
      weight: 80,
      activity: 'low',
      goal: 'gain',
      dietType: 'none',
    });
    expect(gain.kcal).toBe(base.kcal + 300);
  });

  it('calculates protein as weight * 1.8 rounded', () => {
    const result = calculateTargets({
      gender: 'male',
      age: 30,
      height: 175,
      weight: 75,
      activity: 'medium',
      goal: 'maintain',
      dietType: 'none',
    });
    expect(result.protein).toBe(Math.round(75 * 1.8));
  });

  it('all macros are integers', () => {
    const result = calculateTargets({
      gender: 'female',
      age: 35,
      height: 160,
      weight: 65,
      activity: 'high',
      goal: 'maintain',
      dietType: 'none',
    });
    expect(Number.isInteger(result.kcal)).toBe(true);
    expect(Number.isInteger(result.protein)).toBe(true);
    expect(Number.isInteger(result.fat)).toBe(true);
    expect(Number.isInteger(result.carbs)).toBe(true);
    expect(Number.isInteger(result.fiber)).toBe(true);
  });

  it('always returns fiber goal of 30 g', () => {
    const male = calculateTargets({
      gender: 'male',
      age: 30,
      height: 175,
      weight: 75,
      activity: 'medium',
      goal: 'maintain',
      dietType: 'none',
    });
    const female = calculateTargets({
      gender: 'female',
      age: 25,
      height: 165,
      weight: 60,
      activity: 'low',
      goal: 'lose',
      dietType: 'none',
    });
    expect(male.fiber).toBe(30);
    expect(female.fiber).toBe(30);
  });
});
