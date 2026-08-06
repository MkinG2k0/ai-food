import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET(request: Request) {
  const days = new URL(request.url).searchParams.get('days') ?? '30';
  return proxyGatewayAdmin(`stats/series?days=${encodeURIComponent(days)}`);
}
