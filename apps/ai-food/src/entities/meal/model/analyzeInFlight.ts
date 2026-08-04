const inFlightMealIds = new Set<string>();

export function beginMealAnalyze(mealId: string): void {
  inFlightMealIds.add(mealId);
}

export function endMealAnalyze(mealId: string): void {
  inFlightMealIds.delete(mealId);
}

export function isMealAnalyzeInFlight(mealId: string): boolean {
  return inFlightMealIds.has(mealId);
}

/** Test helper — clears in-flight set between cases. */
export function resetMealAnalyzeInFlight(): void {
  inFlightMealIds.clear();
}
