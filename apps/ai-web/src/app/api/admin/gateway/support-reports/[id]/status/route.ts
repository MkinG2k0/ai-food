import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.text();
  return proxyGatewayAdmin(`support-reports/${id}/status`, {
    method: 'PATCH',
    body,
  });
}
