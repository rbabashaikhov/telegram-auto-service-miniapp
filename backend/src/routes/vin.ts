import { Router } from 'express';
import { z } from 'zod';
import {
  maintenanceSchedule as defaultMaintenance,
  vinDecoder as defaultVinDecoder,
} from '../container.js';
import { authMiddleware } from '../middleware/auth.js';
import type { MaintenanceScheduleProvider, VinDecoderProvider } from '../providers/types.js';
import { decodeVin } from '../services/maintenance.js';
import { sendError } from './helpers.js';
import { serializeMaintenanceSchedule, serializeVinIdentification } from './serialize.js';

const decodeBody = z.object({
  vin: z.string().min(1),
  mileage: z.coerce.number().int().min(0).optional(),
});

export function createVinRouter(
  decoder: VinDecoderProvider = defaultVinDecoder,
  schedule: MaintenanceScheduleProvider = defaultMaintenance,
): Router {
  const router = Router();
  router.use(authMiddleware);

  router.post('/decode', (req, res) => {
    try {
      const parsed = decodeBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid VIN payload', code: 'VALIDATION_ERROR' });
        return;
      }
      const identification = decodeVin(decoder, parsed.data.vin);
      const maintenance =
        parsed.data.mileage === undefined
          ? null
          : schedule.getSchedule({
              make: identification.make,
              model: identification.model,
              year: identification.year,
              engine: identification.engine,
              mileage: parsed.data.mileage,
            });
      res.json({
        data: {
          identification: serializeVinIdentification(identification),
          schedule: maintenance ? serializeMaintenanceSchedule(maintenance) : null,
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}

export const vinRouter = createVinRouter();
