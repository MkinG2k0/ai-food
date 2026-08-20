import {
  Beef,
  Candy,
  CookingPot,
  Cookie,
  Croissant,
  CupSoda,
  Drumstick,
  Fish,
  Ham,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Utensils,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import type { FoodType } from '@ai-food/shared-types';

type MealFoodTypeUi = {
  label: string;
  Icon: LucideIcon;
  tileClass: string;
  iconClass: string;
};

const FOOD_TYPE_UI: Record<FoodType, MealFoodTypeUi> = {
  salad: {
    label: 'Салат',
    Icon: Salad,
    tileClass: 'bg-emerald-100',
    iconClass: 'text-emerald-700',
  },
  soup: {
    label: 'Суп',
    Icon: Soup,
    tileClass: 'bg-amber-100',
    iconClass: 'text-amber-700',
  },
  sandwich: {
    label: 'Сэндвич',
    Icon: Sandwich,
    tileClass: 'bg-orange-100',
    iconClass: 'text-orange-700',
  },
  pizza: {
    label: 'Пицца',
    Icon: Pizza,
    tileClass: 'bg-rose-100',
    iconClass: 'text-rose-700',
  },
  sushi: {
    label: 'Суши',
    Icon: Fish,
    tileClass: 'bg-teal-100',
    iconClass: 'text-teal-700',
  },
  fish: {
    label: 'Рыба',
    Icon: Fish,
    tileClass: 'bg-cyan-100',
    iconClass: 'text-cyan-700',
  },
  burger: {
    label: 'Бургер',
    Icon: Ham,
    tileClass: 'bg-orange-100',
    iconClass: 'text-orange-700',
  },
  bowl: {
    label: 'Боул',
    Icon: CookingPot,
    tileClass: 'bg-violet-100',
    iconClass: 'text-violet-700',
  },
  chicken: {
    label: 'Курица',
    Icon: Drumstick,
    tileClass: 'bg-yellow-100',
    iconClass: 'text-yellow-700',
  },
  meat: {
    label: 'Мясо',
    Icon: Beef,
    tileClass: 'bg-red-100',
    iconClass: 'text-red-700',
  },
  pasta: {
    label: 'Паста',
    Icon: Wheat,
    tileClass: 'bg-stone-100',
    iconClass: 'text-stone-700',
  },
  bakery: {
    label: 'Выпечка',
    Icon: Croissant,
    tileClass: 'bg-fuchsia-100',
    iconClass: 'text-fuchsia-700',
  },
  main: {
    label: 'Основное блюдо',
    Icon: Utensils,
    tileClass: 'bg-blue-100',
    iconClass: 'text-blue-700',
  },
  snack: {
    label: 'Перекус',
    Icon: Cookie,
    tileClass: 'bg-lime-100',
    iconClass: 'text-lime-700',
  },
  dessert: {
    label: 'Десерт',
    Icon: Candy,
    tileClass: 'bg-pink-100',
    iconClass: 'text-pink-700',
  },
  drink: {
    label: 'Напиток',
    Icon: CupSoda,
    tileClass: 'bg-sky-100',
    iconClass: 'text-sky-700',
  },
};

export function mealFoodTypeUi(foodType: string | undefined): MealFoodTypeUi | undefined {
  if (foodType === undefined) return undefined;
  return Object.prototype.hasOwnProperty.call(FOOD_TYPE_UI, foodType)
    ? FOOD_TYPE_UI[foodType as FoodType]
    : undefined;
}
