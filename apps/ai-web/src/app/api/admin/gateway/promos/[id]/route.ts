import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return proxyGatewayAdmin(`promos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
