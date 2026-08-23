import { MEAL_IMPORT_ADAPTERS } from '../adapters';
import type { ImportSourceId } from './types';

export function detectSource(text: string): ImportSourceId | null {
  for (const adapter of MEAL_IMPORT_ADAPTERS) {
    if (adapter.detect(text)) return adapter.id;
  }
  return null;
}

export function getAdapter(id: ImportSourceId) {
  return MEAL_IMPORT_ADAPTERS.find((adapter) => adapter.id === id) ?? null;
}
