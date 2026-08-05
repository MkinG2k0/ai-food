import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET() {
  return proxyGatewayAdmin('promos');
}

export async function POST(request: Request) {
  return proxyGatewayAdmin('promos', {
    body: await request.text(),
    method: 'POST',
  });
}
