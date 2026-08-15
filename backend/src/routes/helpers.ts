import type { NextFunction, Request, Response, Router } from 'express';
import { errorBody, statusFromError } from '../errors.js';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function sendError(res: Response, error: unknown): void {
  res.status(statusFromError(error)).json(errorBody(error));
}

export function requireAuthUser(req: Request) {
  if (!req.auth?.telegramUser) {
    const err = new Error('Telegram authentication required');
    (err as Error & { status?: number; code?: string }).status = 401;
    throw err;
  }
  return req.auth.telegramUser;
}

export function mountErrorHandler(router: Router): void {
  router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    sendError(res, err);
  });
}
