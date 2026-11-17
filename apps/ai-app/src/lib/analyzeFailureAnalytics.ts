export const ANALYZE_MEAL_CARD_FAILURE = 'analyze_meal_card_failure' as const;

export interface AnalyzeFailureEventRow {
  id: string;
  name: string;
  userId: string | null;
  deviceId: string | null;
  mealId: string | null;
  errorCode: string | null;
  inFlight: boolean;
  clientAt: Date | null;
  createdAt: Date;
  user: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface AnalyzeFailureSummary {
  total: number;
  inFlightCount: number;
  terminalCount: number;
  uniqueUsers: number;
  uniqueDevices: number;
  byErrorCode: Record<string, number>;
}

export function buildAnalyzeFailureSummary(
  rows: ReadonlyArray<{
    userId: string | null;
    deviceId: string | null;
    errorCode: string | null;
    inFlight: boolean;
  }>,
): AnalyzeFailureSummary {
  const users = new Set<string>();
  const devices = new Set<string>();
  const byErrorCode: Record<string, number> = {};
  let inFlightCount = 0;
  let terminalCount = 0;

  for (const row of rows) {
    if (row.inFlight) inFlightCount += 1;
    else terminalCount += 1;
    if (row.userId) users.add(row.userId);
    if (row.deviceId) devices.add(row.deviceId);
    const code = row.errorCode?.trim() || '(none)';
    byErrorCode[code] = (byErrorCode[code] ?? 0) + 1;
  }

  return {
    total: rows.length,
    inFlightCount,
    terminalCount,
    uniqueUsers: users.size,
    uniqueDevices: devices.size,
    byErrorCode,
  };
}

export function serializeAnalyzeFailureEvent(row: AnalyzeFailureEventRow) {
  return {
    id: row.id,
    name: row.name,
    userId: row.userId,
    deviceId: row.deviceId,
    mealId: row.mealId,
    errorCode: row.errorCode,
    inFlight: row.inFlight,
    clientAt: row.clientAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    user: row.user,
  };
}
