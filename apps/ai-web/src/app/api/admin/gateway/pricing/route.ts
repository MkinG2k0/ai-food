import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET() {
  return proxyGatewayAdmin('pricing');
}

export async function PUT(request: Request) {
  return proxyGatewayAdmin('pricing', {
    body: await request.text(),
    method: 'PUT',
  });
}
