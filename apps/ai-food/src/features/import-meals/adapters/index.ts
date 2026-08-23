import { calzenAdapter } from './calzen';
import type { MealImportAdapter } from './types';

/** Ordered registry — first `detect === true` wins. */
export const MEAL_IMPORT_ADAPTERS: MealImportAdapter[] = [calzenAdapter];
