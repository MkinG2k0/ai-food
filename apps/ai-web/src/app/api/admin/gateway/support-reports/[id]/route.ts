import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyGatewayAdmin(`support-reports/${id}`);
}
