import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return proxyGatewayAdmin(`users/${encodeURIComponent(id)}`);
}
