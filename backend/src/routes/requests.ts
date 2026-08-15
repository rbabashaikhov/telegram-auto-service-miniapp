import { Router } from 'express';
import { z } from 'zod';
import { providers as defaultProviders } from '../container.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Providers } from '../providers/types.js';
import { createServiceRequest } from '../services/estimates.js';
import { sendError, requireAuthUser } from './helpers.js';
import { serializeRequest } from './serialize.js';

export function createRequestsRouter(data: Providers = defaultProviders): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/', (req, res) => {
    try {
      const user = requireAuthUser(req);
      const customer = data.customers.upsert(user);
      res.json({ data: data.requests.listByCustomer(customer.id).map(serializeRequest) });
    } catch (error) {
      sendError(res, error);
    }
  });

  const body = z.object({
    vehicleId: z.number().int().positive(),
    description: z.string().min(3),
    symptomCategory: z.string().optional().nullable(),
    desiredDate: z.string().optional().nullable(),
  });

  router.post('/', (req, res) => {
    try {
      const parsed = body.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid request payload', code: 'VALIDATION_ERROR' });
        return;
      }
      const user = requireAuthUser(req);
      const created = createServiceRequest(data, { user, ...parsed.data });
      res.status(201).json({ data: serializeRequest(created) });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}

export const requestsRouter = createRequestsRouter();
