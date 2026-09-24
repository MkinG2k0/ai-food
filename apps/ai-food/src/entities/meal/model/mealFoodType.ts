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
    tileClass: 'bg-emerald-500/15',
    iconClass: 'text-emerald-700 dark:text-emerald-300',
  },
  soup: {
    label: 'Суп',
    Icon: Soup,
    tileClass: 'bg-amber-500/15',
    iconClass: 'text-amber-700 dark:text-amber-300',
  },
  sandwich: {
    label: 'Сэндвич',
    Icon: Sandwich,
    tileClass: 'bg-orange-500/15',
    iconClass: 'text-orange-700 dark:text-orange-300',
  },
  pizza: {
    label: 'Пицца',
    Icon: Pizza,
    tileClass: 'bg-rose-500/15',
    iconClass: 'text-rose-700 dark:text-rose-300',
  },
  sushi: {
    label: 'Суши',
    Icon: Fish,
    tileClass: 'bg-teal-500/15',
    iconClass: 'text-teal-700 dark:text-teal-300',
  },
  fish: {
    label: 'Рыба',
    Icon: Fish,
    tileClass: 'bg-cyan-500/15',
    iconClass: 'text-cyan-700 dark:text-cyan-300',
  },
  burger: {
    label: 'Бургер',
    Icon: Ham,
    tileClass: 'bg-orange-500/15',
    iconClass: 'text-orange-700 dark:text-orange-300',
  },
  bowl: {
    label: 'Боул',
    Icon: CookingPot,
    tileClass: 'bg-violet-500/15',
    iconClass: 'text-violet-700 dark:text-violet-300',
  },
  chicken: {
    label: 'Курица',
    Icon: Drumstick,
    tileClass: 'bg-yellow-500/15',
    iconClass: 'text-yellow-700 dark:text-yellow-300',
  },
  meat: {
    label: 'Мясо',
    Icon: Beef,
    tileClass: 'bg-red-500/15',
    iconClass: 'text-red-700 dark:text-red-300',
  },
  pasta: {
    label: 'Паста',
    Icon: Wheat,
    tileClass: 'bg-stone-500/15',
    iconClass: 'text-stone-700 dark:text-stone-300',
  },
  bakery: {
    label: 'Выпечка',
    Icon: Croissant,
    tileClass: 'bg-fuchsia-500/15',
    iconClass: 'text-fuchsia-700 dark:text-fuchsia-300',
  },
  main: {
    label: 'Основное блюдо',
    Icon: Utensils,
    tileClass: 'bg-blue-500/15',
    iconClass: 'text-blue-700 dark:text-blue-300',
  },
  snack: {
    label: 'Перекус',
    Icon: Cookie,
    tileClass: 'bg-lime-500/15',
    iconClass: 'text-lime-700 dark:text-lime-300',
  },
  dessert: {
    label: 'Десерт',
    Icon: Candy,
    tileClass: 'bg-pink-500/15',
    iconClass: 'text-pink-700 dark:text-pink-300',
  },
  drink: {
    label: 'Напиток',
    Icon: CupSoda,
    tileClass: 'bg-sky-500/15',
    iconClass: 'text-sky-700 dark:text-sky-300',
  },
};

export function mealFoodTypeUi(foodType: string | undefined): MealFoodTypeUi | undefined {
  if (foodType === undefined) return undefined;
  return Object.prototype.hasOwnProperty.call(FOOD_TYPE_UI, foodType)
    ? FOOD_TYPE_UI[foodType as FoodType]
    : undefined;
}
