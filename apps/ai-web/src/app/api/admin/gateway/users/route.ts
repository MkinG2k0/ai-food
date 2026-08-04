import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q') ?? '';

  return proxyGatewayAdmin(`users?q=${encodeURIComponent(query)}`);
}
