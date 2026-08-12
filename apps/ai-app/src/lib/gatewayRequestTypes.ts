export const GATEWAY_REQUEST_TYPES = [
  'food_analyze',
  'food_refine',
  'food_ask',
  'chat_completions',
  'embeddings',
  'models',
] as const;

export type GatewayRequestType = (typeof GATEWAY_REQUEST_TYPES)[number];

export function isGatewayRequestType(
  value: string,
): value is GatewayRequestType {
  return (GATEWAY_REQUEST_TYPES as readonly string[]).includes(value);
}
