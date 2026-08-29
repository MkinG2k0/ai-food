import { proxyGatewayAdmin } from '@/lib/gatewayAdmin';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const forward = new URLSearchParams();
  const q = params.get('q');
  const from = params.get('from');
  const to = params.get('to');
  if (q) forward.set('q', q);
  if (from) forward.set('from', from);
  if (to) forward.set('to', to);

  const query = forward.toString();
  return proxyGatewayAdmin(query ? `users?${query}` : 'users');
}
