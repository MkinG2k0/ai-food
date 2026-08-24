import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  return proxyGatewayAdmin(
    qs ? `support-reports?${qs}` : 'support-reports',
  );
}
