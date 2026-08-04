import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import https from 'node:https';
import { dirname, join } from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';
import { ApiError } from '../../lib/errors.js';

/**
 * T-Bank Acquiring Token (official):
 * take root-level scalar request fields (exclude Token / nested objects),
 * add Password, sort keys alphabetically, concatenate values (no separators),
 * SHA-256 hex digest.
 * @see https://developer.tbank.ru/eacq/intro/developer/token
 */

/**
 * securepay.tinkoff.ru chains to Russian Trusted Root CA (Минцифры).
 * Node's Mozilla CA store does not include it → SELF_SIGNED_CERT_IN_CHAIN.
 * Bundle: Russian Trusted Sub CA + Root CA (public trust anchors).
 */
const RUSSIAN_TRUSTED_CA_BUNDLE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../certs/russian-trusted-ca-bundle.pem'),
);

function getTlsCa(): Array<string | Buffer> {
  return [...tls.rootCertificates, RUSSIAN_TRUSTED_CA_BUNDLE];
}

export function isTbankMock(): boolean {
  return process.env.TBANK_MOCK === 'true';
}

export function isTbankConfigured(): boolean {
  return Boolean(
    process.env.TBANK_TERMINAL_KEY?.trim() && process.env.TBANK_PASSWORD?.trim(),
  );
}

function getApiBase(): string {
  return (
    process.env.TBANK_API_URL?.trim().replace(/\/$/, '') ||
    'https://securepay.tinkoff.ru'
  );
}

function getTerminalKey(): string {
  const key = process.env.TBANK_TERMINAL_KEY?.trim();
  if (!key) {
    throw new ApiError(503, 'TBANK_MISCONFIGURED', 'TBANK_TERMINAL_KEY is not set.');
  }
  return key;
}

function getPassword(): string {
  const pw = process.env.TBANK_PASSWORD?.trim();
  if (!pw) {
    throw new ApiError(503, 'TBANK_MISCONFIGURED', 'TBANK_PASSWORD is not set.');
  }
  return pw;
}

/** Build Token from scalar params + Password. Nested objects/arrays are ignored. */
export function buildTbankToken(
  params: Record<string, unknown>,
  password: string,
): string {
  const scalars: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === 'Token') continue;
    if (value === null || value === undefined) continue;
    if (typeof value === 'object') continue;
    scalars[key] = value as string | number | boolean;
  }
  scalars.Password = password;
  const concatenated = Object.keys(scalars)
    .sort()
    .map((k) => String(scalars[k]))
    .join('');
  return createHash('sha256').update(concatenated).digest('hex');
}

export function verifyTbankToken(
  body: Record<string, unknown>,
  password: string,
): boolean {
  const token = body.Token;
  if (typeof token !== 'string' || !token) return false;
  const expected = buildTbankToken(body, password);
  return expected.toLowerCase() === token.toLowerCase();
}

/**
 * POST JSON to T-Bank API with Russian Trusted CA in the trust store.
 * Uses global fetch under Vitest so unit tests can mock it.
 */
async function postTbankJson(
  path: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const url = `${getApiBase()}${path}`;
  const payload = JSON.stringify(body);

  if (process.env.VITEST) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    return (await res.json()) as Record<string, unknown>;
  }

  try {
    return await new Promise<Record<string, unknown>>((resolve, reject) => {
      const u = new URL(url);
      const req = https.request(
        {
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port || 443,
          path: `${u.pathname}${u.search}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          ca: getTlsCa(),
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            try {
              resolve(JSON.parse(text) as Record<string, unknown>);
            } catch {
              reject(
                new ApiError(502, 'TBANK_BAD_RESPONSE', 'T-Bank returned non-JSON body.', {
                  statusCode: res.statusCode,
                }),
              );
            }
          });
        },
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  } catch (err) {
    const cause =
      err && typeof err === 'object' && 'cause' in err
        ? (err as { cause?: unknown }).cause
        : undefined;
    const code =
      (err && typeof err === 'object' && 'code' in err && String((err as { code: unknown }).code)) ||
      (cause &&
        typeof cause === 'object' &&
        cause !== null &&
        'code' in cause &&
        String((cause as { code: unknown }).code)) ||
      undefined;
    const message = err instanceof Error ? err.message : 'T-Bank request failed.';
    throw new ApiError(502, 'TBANK_NETWORK_ERROR', message, { code });
  }
}

export type InitPaymentInput = {
  amount: number;
  orderId: string;
  customerKey: string;
  description: string;
  notificationUrl: string;
  successUrl: string;
  failUrl: string;
};

export type InitPaymentResult = {
  paymentId: string;
  paymentUrl: string;
  status: string;
};

export async function initPayment(input: InitPaymentInput): Promise<InitPaymentResult> {
  const terminalKey = getTerminalKey();
  const password = getPassword();
  const body: Record<string, unknown> = {
    TerminalKey: terminalKey,
    Amount: input.amount,
    OrderId: input.orderId,
    Description: input.description,
    CustomerKey: input.customerKey,
    PayType: 'O',
    NotificationURL: input.notificationUrl,
    SuccessURL: input.successUrl,
    FailURL: input.failUrl,
  };
  // Never send Recurrent — one-time license only
  body.Token = buildTbankToken(body, password);

  const data = await postTbankJson('/v2/Init', body);
  if (!data.Success || !data.PaymentURL || data.PaymentId == null) {
    throw new ApiError(
      502,
      'TBANK_INIT_FAILED',
      typeof data.Message === 'string'
        ? data.Message
        : 'T-Bank Init failed.',
      { errorCode: data.ErrorCode, details: data.Details },
    );
  }
  return {
    paymentId: String(data.PaymentId),
    paymentUrl: String(data.PaymentURL),
    status: String(data.Status ?? 'NEW'),
  };
}

export type PaymentStateResult = {
  paymentId: string;
  orderId?: string;
  status: string;
  success: boolean;
};

export async function getPaymentState(
  tbankPaymentId: string,
): Promise<PaymentStateResult> {
  const terminalKey = getTerminalKey();
  const password = getPassword();
  const body: Record<string, unknown> = {
    TerminalKey: terminalKey,
    PaymentId: tbankPaymentId,
  };
  body.Token = buildTbankToken(body, password);

  const data = await postTbankJson('/v2/GetState', body);
  if (!data.Success && data.Status == null) {
    throw new ApiError(
      502,
      'TBANK_GETSTATE_FAILED',
      typeof data.Message === 'string'
        ? data.Message
        : 'T-Bank GetState failed.',
      { errorCode: data.ErrorCode },
    );
  }
  return {
    paymentId: String(data.PaymentId ?? tbankPaymentId),
    orderId: data.OrderId != null ? String(data.OrderId) : undefined,
    status: String(data.Status ?? 'UNKNOWN'),
    success: Boolean(data.Success),
  };
}
