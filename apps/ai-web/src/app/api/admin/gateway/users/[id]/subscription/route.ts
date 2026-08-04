import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return proxyGatewayAdmin(
    `users/${encodeURIComponent(id)}/subscription`,
    {
      body: await request.text(),
      method: 'POST',
    },
  );
}
