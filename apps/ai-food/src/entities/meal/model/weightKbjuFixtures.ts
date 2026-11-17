import type { FoodItem } from '@ai-food/shared-types';

export function fixtureItem(
  partial: Partial<FoodItem> & Pick<FoodItem, 'id' | 'name' | 'grams'>,
): FoodItem {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    ...partial,
  };
}

/** Inspired by user photo: tempura sushi set. */
export const tempuraSushiSet: FoodItem[] = [
  fixtureItem({
    id: 'tempura-shrimp',
    name: 'Темпура креветка',
    grams: 120,
    calories: 280,
    protein: 14,
    carbs: 22,
    fat: 14,
    fiber: 1,
  }),
  fixtureItem({
    id: 'nigiri',
    name: 'Нигири лосось',
    grams: 80,
    calories: 160,
    protein: 12,
    carbs: 18,
    fat: 4,
    fiber: 0,
  }),
  fixtureItem({
    id: 'roll',
    name: 'Ролл',
    grams: 150,
    calories: 240,
    protein: 8,
    carbs: 36,
    fat: 6,
    fiber: 2,
  }),
];

/** Inspired by user photo: glazed chicken + veg. */
export const glazedChicken: FoodItem[] = [
  fixtureItem({
    id: 'chicken',
    name: 'Курица в глазури',
    grams: 180,
    calories: 360,
    protein: 36,
    carbs: 12,
    fat: 18,
    fiber: 0,
  }),
  fixtureItem({
    id: 'veg',
    name: 'Овощи',
    grams: 120,
    calories: 60,
    protein: 3,
    carbs: 10,
    fat: 1,
    fiber: 4,
  }),
];

/** Inspired by user photo: burger + fries. */
export const burgerFries: FoodItem[] = [
  fixtureItem({
    id: 'bun',
    name: 'Булка',
    grams: 80,
    calories: 220,
    protein: 6,
    carbs: 40,
    fat: 4,
    fiber: 2,
  }),
  fixtureItem({
    id: 'patty',
    name: 'Котлета',
    grams: 120,
    calories: 320,
    protein: 24,
    carbs: 2,
    fat: 24,
    fiber: 0,
  }),
  fixtureItem({
    id: 'fries',
    name: 'Картофель фри',
    grams: 150,
    calories: 450,
    protein: 5,
    carbs: 55,
    fat: 22,
    fiber: 4,
  }),
];
