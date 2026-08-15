import { Router } from 'express';
import { providers as defaultProviders } from '../container.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Providers } from '../providers/types.js';
import { serializeService, serializeSpecialist } from './serialize.js';
import { sendError } from './helpers.js';

export function createCatalogRouter(data: Providers = defaultProviders): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/services', (req, res) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      res.json({ data: data.catalog.listServices({ category, activeOnly: true }).map(serializeService) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/specialists', (req, res) => {
    try {
      const serviceId = req.query.serviceId ? Number(req.query.serviceId) : undefined;
      const list = serviceId
        ? data.specialists.listEligible(serviceId)
        : data.specialists.list(true);
      res.json({
        data: list.map((item) => serializeSpecialist(item, data.specialists.listServiceIds(item.id))),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}

export const catalogRouter = createCatalogRouter();
