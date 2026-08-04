type ApiErrorBody = {
  message?: string;
  error?: string;
};

export async function adminApi<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/admin/gateway/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(body.message || body.error || 'Не удалось выполнить запрос');
  }

  return response.json() as Promise<T>;
}
