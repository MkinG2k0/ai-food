export type OpenRouterActivityItem = {
  date: string;
  model: string;
  usage: number;
  requests: number;
  prompt_tokens: number;
  completion_tokens: number;
  reasoning_tokens: number;
};

export type OpenRouterAdminSnapshot = {
  fetchedAt: string;
  fx: {
    usdRub: number;
    asOf: string;
    source: 'frankfurter-cbr';
  } | null;
  credits: {
    totalCredits: number;
    totalUsage: number;
    available: number;
  } | null;
  key: {
    label: string;
    usage: number;
    usageDaily: number;
    usageWeekly: number;
    usageMonthly: number;
    limit: number | null;
    limitRemaining: number | null;
    limitReset: string | null;
    isFreeTier: boolean;
  } | null;
  spend: {
    last7DaysUsd: number | null;
    last30DaysUsd: number | null;
    last7DaysRub: number | null;
    last30DaysRub: number | null;
    requests30d: number;
    promptTokens30d: number;
    completionTokens30d: number;
    reasoningTokens30d: number;
  };
  avgCostPerGeneration: {
    usd: number | null;
    rub: number | null;
    generations30d: number;
  };
  runway: {
    avgDailySpendUsd: number | null;
    daysLeft: number | null;
    monthsLeft: number | null;
    basedOn: '7d' | '30d' | null;
  };
  seriesDaily: Array<{
    date: string;
    usageUsd: number;
    requests: number;
    promptTokens: number;
    completionTokens: number;
  }>;
  byModel: Array<{
    model: string;
    usageUsd: number;
    requests: number;
    share: number;
  }>;
  errors?: {
    credits?: string;
    activity?: string;
    key?: string;
    fx?: string;
  };
};
