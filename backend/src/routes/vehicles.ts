import { Router } from 'express';
import { z } from 'zod';
import {
  maintenanceSchedule as defaultMaintenance,
  providers as defaultProviders,
  vinDecoder as defaultVinDecoder,
} from '../container.js';
import { authMiddleware } from '../middleware/auth.js';
import type { MaintenanceScheduleProvider, Providers, VinDecoderProvider } from '../providers/types.js';
import { getVehicleMaintenance } from '../services/maintenance.js';
import { sendError, requireAuthUser } from './helpers.js';
import {
  serializeHistory,
  serializeMaintenanceSchedule,
  serializeVehicle,
  serializeVinIdentification,
} from './serialize.js';

const vehicleBody = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  generation: z.string().optional().nullable(),
  year: z.coerce.number().int().min(1970).max(2100),
  engine: z.string().optional().nullable(),
  vin: z.string().optional().nullable(),
  licensePlate: z.string().optional().nullable(),
  mileage: z.coerce.number().int().min(0),
});

export function createVehiclesRouter(
  data: Providers = defaultProviders,
  decoder: VinDecoderProvider = defaultVinDecoder,
  schedule: MaintenanceScheduleProvider = defaultMaintenance,
): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/', (req, res) => {
    try {
      const user = requireAuthUser(req);
      const customer = data.customers.upsert(user);
      res.json({ data: data.vehicles.listByCustomer(customer.id).map(serializeVehicle) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/', (req, res) => {
    try {
      const parsed = vehicleBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid vehicle payload', code: 'VALIDATION_ERROR' });
        return;
      }
      const user = requireAuthUser(req);
      const customer = data.customers.upsert(user);
      const existing = data.vehicles.listByCustomer(customer.id);
      const vehicle = data.vehicles.create({
        customerId: customer.id,
        ...parsed.data,
        isActive: existing.length === 0,
      });
      res.status(201).json({ data: serializeVehicle(vehicle) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/:id/maintenance', (req, res) => {
    try {
      const user = requireAuthUser(req);
      const customer = data.customers.upsert(user);
      const vehicle = data.vehicles.getById(Number(req.params.id));
      if (!vehicle || vehicle.customer_id !== customer.id) {
        res.status(404).json({ error: 'Vehicle not found', code: 'VEHICLE_NOT_FOUND' });
        return;
      }
      const view = getVehicleMaintenance(data, decoder, schedule, vehicle);
      res.json({
        data: {
          identification: serializeVinIdentification(view.identification),
          schedule: serializeMaintenanceSchedule(view.schedule),
          completedWork: view.completedWork.map(serializeHistory),
          inspectionRecommendations: view.inspectionRecommendations.map((item) => ({
            appointmentId: item.appointmentId,
            name: item.name,
            severity: item.severity,
            note: item.note,
          })),
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/:id', (req, res) => {
    try {
      const user = requireAuthUser(req);
      const customer = data.customers.upsert(user);
      const vehicle = data.vehicles.getById(Number(req.params.id));
      if (!vehicle || vehicle.customer_id !== customer.id) {
        res.status(404).json({ error: 'Vehicle not found', code: 'VEHICLE_NOT_FOUND' });
        return;
      }
      res.json({ data: serializeVehicle(vehicle) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/:id', (req, res) => {
    try {
      const user = requireAuthUser(req);
      const customer = data.customers.upsert(user);
      const id = Number(req.params.id);
      const vehicle = data.vehicles.getById(id);
      if (!vehicle || vehicle.customer_id !== customer.id) {
        res.status(404).json({ error: 'Vehicle not found', code: 'VEHICLE_NOT_FOUND' });
        return;
      }
      const parsed = vehicleBody.partial().extend({ isActive: z.boolean().optional() }).safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid vehicle payload', code: 'VALIDATION_ERROR' });
        return;
      }
      const updated = parsed.data.isActive
        ? data.vehicles.setActive(customer.id, id)
        : data.vehicles.update(id, parsed.data);
      if (parsed.data.mileage !== undefined && !parsed.data.isActive) {
        data.vehicles.update(id, { mileage: parsed.data.mileage });
      }
      res.json({ data: serializeVehicle(data.vehicles.getById(updated.id)!) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/:id/activate', (req, res) => {
    try {
      const user = requireAuthUser(req);
      const customer = data.customers.upsert(user);
      const updated = data.vehicles.setActive(customer.id, Number(req.params.id));
      res.json({ data: serializeVehicle(updated) });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}

export const vehiclesRouter = createVehiclesRouter();
