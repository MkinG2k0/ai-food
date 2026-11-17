export interface AnalyzeFailureUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface AnalyzeFailureItem {
  id: string;
  name: string;
  userId: string | null;
  deviceId: string | null;
  mealId: string | null;
  errorCode: string | null;
  inFlight: boolean;
  clientAt: string | null;
  createdAt: string;
  user: AnalyzeFailureUser | null;
}

export interface AnalyzeFailureList {
  summary: {
    total: number;
    inFlightCount: number;
    terminalCount: number;
    uniqueUsers: number;
    uniqueDevices: number;
    byErrorCode: Record<string, number>;
  };
  summaryWindowDays: number;
  items: AnalyzeFailureItem[];
  total: number;
  page: number;
  pageSize: number;
}

export function formatAnalyzeFailureUser(
  user: AnalyzeFailureUser | null,
  deviceId: string | null,
): string {
  if (user) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    if (name) return name;
    if (user.username) return `@${user.username}`;
    return user.telegramId;
  }
  return deviceId ? `Гость · ${deviceId.slice(0, 8)}…` : '—';
}
