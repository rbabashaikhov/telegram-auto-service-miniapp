import { Router } from 'express';
import { z } from 'zod';
import { providers as defaultProviders } from '../container.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Providers } from '../providers/types.js';
import { getAvailabilityCalendar, getAvailableSlots } from '../services/availability.js';
import { sendError } from './helpers.js';

export function createAvailabilityRouter(data: Providers = defaultProviders): Router {
  const router = Router();
  router.use(authMiddleware);

  const query = z.object({
    serviceId: z.coerce.number().int().positive(),
    specialistId: z.coerce.number().int().positive().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    days: z.coerce.number().int().min(1).max(30).optional(),
  });

  router.get('/', (req, res) => {
    try {
      const parsed = query.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid query', code: 'VALIDATION_ERROR' });
        return;
      }
      if (parsed.data.date) {
        const result = getAvailableSlots(data, {
          serviceId: parsed.data.serviceId,
          specialistId: parsed.data.specialistId,
          date: parsed.data.date,
        });
        res.json({
          data: {
            durationMinutes: result.durationMinutes,
            price: result.price,
            availableSlots: result.slots.map((slot) => slot.time),
            slots: result.slots,
          },
        });
        return;
      }
      const calendar = getAvailabilityCalendar(data, {
        serviceId: parsed.data.serviceId,
        specialistId: parsed.data.specialistId,
        days: parsed.data.days,
      });
      res.json({ data: calendar });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}

export const availabilityRouter = createAvailabilityRouter();
