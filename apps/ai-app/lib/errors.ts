import OpenAI from 'openai';
import type { Response } from 'express';
import type { ApiError as ApiErrorBody } from './types.js';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function sendApiError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  const body: ApiErrorBody & Record<string, unknown> = { message, code, status };
  if (details) {
    Object.assign(body, details);
  }
  res.status(status).json(body);
}

export function mapOpenAIError(error: unknown): {
  status: number;
  code: string;
  message: string;
} {
  if (error instanceof OpenAI.RateLimitError) {
    return {
      status: 429,
      code: 'RATE_LIMITED',
      message: 'OpenRouter rate limit exceeded. Please try again later.',
    };
  }

  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return {
      status: 504,
      code: 'UPSTREAM_TIMEOUT',
      message: 'Upstream request timed out. Please try again.',
    };
  }

  if (error instanceof OpenAI.BadRequestError) {
    return {
      status: 400,
      code: 'BAD_REQUEST',
      message: 'The request could not be processed by the upstream provider.',
    };
  }

  return {
    status: 500,
    code: 'UPSTREAM_ERROR',
    message: 'Upstream request failed. Please try again.',
  };
}
