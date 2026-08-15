import { Router } from 'express';
import { providers as defaultProviders } from '../container.js';
import { authMiddleware } from '../middleware/auth.js';
import type { Providers } from '../providers/types.js';
import { portalNow } from '../services/booking.js';
import { sendError, requireAuthUser } from './helpers.js';
import {
  serializeAppointment,
  serializeCustomer,
  serializeEstimate,
  serializeHistory,
  serializeReminder,
  serializeRequest,
  serializeVehicle,
} from './serialize.js';

export function createMeRouter(data: Providers = defaultProviders): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/portal', (req, res) => {
    try {
      const user = requireAuthUser(req);
      const upserted = data.customers.upsert(user);
      const customer = data.customers.getById(upserted.id)!;
      const vehicles = data.vehicles.listByCustomer(customer.id);
      const activeVehicle = vehicles.find((item) => item.is_active) ?? vehicles[0] ?? null;
      const { today, nowTime } = portalNow();
      const nextAppointment = activeVehicle
        ? data.bookings.listUpcoming(customer.id, activeVehicle.id, today, nowTime)
        : data.bookings.listUpcoming(customer.id, undefined, today, nowTime);
      const lastVisit = activeVehicle
        ? data.bookings.listLastCompleted(customer.id, activeVehicle.id)
        : data.bookings.listLastCompleted(customer.id);
      const reminder = activeVehicle
        ? serializeReminder(data.history.getReminder(activeVehicle.id), activeVehicle.mileage)
        : null;
      const openEstimate = nextAppointment
        ? data.estimates.getByAppointment(nextAppointment.id)
        : data.bookings
            .listByCustomer(customer.id)
            .map((item) => data.estimates.getByAppointment(item.id))
            .find((item) => item?.status === 'awaiting_approval');
      const pendingRequest = data.requests
        .listByCustomer(customer.id)
        .find((item) => item.status === 'new' || item.status === 'reviewing');

      res.json({
        data: {
          customer: serializeCustomer(customer),
          vehicles: vehicles.map(serializeVehicle),
          activeVehicle: activeVehicle ? serializeVehicle(activeVehicle) : null,
          nextAppointment: nextAppointment ? serializeAppointment(nextAppointment) : null,
          lastVisit: lastVisit ? serializeAppointment(lastVisit) : null,
          reminder,
          openEstimate: openEstimate ? serializeEstimate(openEstimate) : null,
          pendingRequest: pendingRequest ? serializeRequest(pendingRequest) : null,
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/history', (req, res) => {
    try {
      const user = requireAuthUser(req);
      const customer = data.customers.upsert(user);
      const vehicles = data.vehicles.listByCustomer(customer.id);
      const vehicleId = req.query.vehicleId ? Number(req.query.vehicleId) : vehicles.find((item) => item.is_active)?.id;
      if (!vehicleId) {
        res.json({ data: [] });
        return;
      }
      res.json({ data: data.history.listCompletedVisits(vehicleId).map(serializeHistory) });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}

export const meRouter = createMeRouter();
