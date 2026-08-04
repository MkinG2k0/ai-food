import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError, sendApiError } from '../../lib/errors.js';

export function asyncHandler(
  fn: (req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    sendApiError(res, err.status, err.code, err.message, err.details);
    return;
  }

  // body-parser / express.json errors
  if (err?.type === 'entity.too.large') {
    sendApiError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 10 MB limit.');
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    sendApiError(res, 400, 'VALIDATION_ERROR', 'Invalid JSON body.');
    return;
  }

  console.error('Unhandled error:', err);
  sendApiError(res, 500, 'UPSTREAM_ERROR', 'Upstream request failed. Please try again.');
};
