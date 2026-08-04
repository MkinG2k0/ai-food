import { ApiError } from '../../lib/errors.js';

const FLASHCALL_SEND_URL = 'https://voice.mobilgroup.ru/api/voice-password/send/';

type FlashCallOkResponse = {
  result: 'ok';
  id: string;
  code: string;
  number: string;
};

type FlashCallErrorResponse = {
  result: 'error';
  error_code?: string;
};

function getApiKey(): string {
  const key = process.env.FLASHCALL_API_KEY?.trim();
  if (!key) {
    throw new ApiError(503, 'AUTH_MISCONFIGURED', 'FLASHCALL_API_KEY is not set.');
  }
  return key;
}

export async function sendFlashCall(
  phone: string,
): Promise<{ id: string; code: string; number: string }> {
  const apiKey = getApiKey();

  const res = await fetch(FLASHCALL_SEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ number: phone, capacity: '4' }),
  });

  const data = (await res.json()) as FlashCallOkResponse | FlashCallErrorResponse;

  if (data.result === 'ok') {
    return { id: data.id, code: data.code, number: data.number };
  }

  if (data.result === 'error') {
    throw new ApiError(
      502,
      'FLASHCALL_FAILED',
      `Flash-Call provider error: ${data.error_code ?? 'unknown'}.`,
    );
  }

  throw new ApiError(502, 'FLASHCALL_FAILED', 'Unexpected Flash-Call response.');
}
