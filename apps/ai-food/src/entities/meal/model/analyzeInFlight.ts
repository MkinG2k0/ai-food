const inFlightMealIds = new Set<string>();
const controllers = new Map<string, AbortController>();

export function beginMealAnalyze(mealId: string): AbortSignal {
  const previous = controllers.get(mealId);
  previous?.abort();

  const controller = new AbortController();
  controllers.set(mealId, controller);
  inFlightMealIds.add(mealId);
  return controller.signal;
}

export function endMealAnalyze(mealId: string): void {
  controllers.delete(mealId);
  inFlightMealIds.delete(mealId);
}

export function abortMealAnalyze(mealId: string): void {
  controllers.get(mealId)?.abort();
}

export function getMealAnalyzeSignal(mealId: string): AbortSignal | undefined {
  return controllers.get(mealId)?.signal;
}

export function isMealAnalyzeInFlight(mealId: string): boolean {
  return inFlightMealIds.has(mealId);
}

/** Test helper — clears in-flight set between cases. */
export function resetMealAnalyzeInFlight(): void {
  controllers.clear();
  inFlightMealIds.clear();
}
