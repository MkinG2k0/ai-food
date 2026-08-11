export const GATEWAY_REQUEST_TYPES = [
  'food_analyze',
  'food_refine',
  'food_ask',
  'chat_completions',
  'embeddings',
  'models',
] as const;

export type GatewayRequestType = (typeof GATEWAY_REQUEST_TYPES)[number];
