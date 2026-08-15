import { Router } from 'express';
import { z } from 'zod';
import { providers as defaultProviders } from '../container.js';
import { authMiddleware } from '../middleware/auth.js';
import { bookingRateLimit } from '../middleware/rateLimit.js';
import type { Providers } from '../providers/types.js';
import {
  cancelAppointment,
  createAppointment,
  getRepeatContext,
  rescheduleAppointment,
} from '../services/booking.js';
import { decideEstimate } from '../services/estimates.js';
import { sendError, requireAuthUser } from './helpers.js';
import { serializeAppointment, serializeEstimate } from './serialize.js';

export function createAppointmentsRouter(data: Providers = defaultProviders): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/me', (req, res) => {
    try {
      const user = requireAuthUser(req);
      const customer = data.customers.upsert(user);
      const includePast = req.query.includePast !== 'false';
      res.json({
        data: data.bookings.listByCustomer(customer.id, { includePast }).map(serializeAppointment),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/:id', (req, res) => {
    try {
      const user = requireAuthUser(req);
      const appointment = data.bookings.getById(Number(req.params.id));
      const customer = data.customers.getByTelegramUserId(user.id);
      if (!appointment || !customer || appointment.customer_id !== customer.id) {
        res.status(404).json({ error: 'Appointment not found', code: 'APPOINTMENT_NOT_FOUND' });
        return;
      }
      const estimate = data.estimates.getByAppointment(appointment.id);
      res.json({
        data: {
          appointment: serializeAppointment(appointment),
          estimate: estimate ? serializeEstimate(estimate) : null,
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/:id/repeat-context', (req, res) => {
    try {
      res.json({ data: getRepeatContext(data, Number(req.params.id)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  const createBody = z.object({
    vehicleId: z.number().int().positive(),
    serviceId: z.number().int().positive(),
    specialistId: z.number().int().positive().nullable().optional(),
    date: z.string(),
    startTime: z.string(),
    notes: z.string().optional().nullable(),
    sourceAppointmentId: z.number().int().positive().optional().nullable(),
  });

  router.post('/', bookingRateLimit, (req, res) => {
    try {
      const parsed = createBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid appointment payload', code: 'VALIDATION_ERROR' });
        return;
      }
      const user = requireAuthUser(req);
      const appointment = createAppointment(data, { user, ...parsed.data });
      res.status(201).json({ data: serializeAppointment(appointment) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/:id/cancel', (req, res) => {
    try {
      const user = requireAuthUser(req);
      const appointment = cancelAppointment(data, { user, appointmentId: Number(req.params.id) });
      res.json({ data: serializeAppointment(appointment) });
    } catch (error) {
      sendError(res, error);
    }
  });

  const rescheduleBody = z.object({
    date: z.string(),
    startTime: z.string(),
    specialistId: z.number().int().positive().optional(),
  });

  router.patch('/:id/reschedule', (req, res) => {
    try {
      const parsed = rescheduleBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid reschedule payload', code: 'VALIDATION_ERROR' });
        return;
      }
      const user = requireAuthUser(req);
      const appointment = rescheduleAppointment(data, {
        user,
        appointmentId: Number(req.params.id),
        ...parsed.data,
      });
      res.json({ data: serializeAppointment(appointment) });
    } catch (error) {
      sendError(res, error);
    }
  });

  const decisionBody = z.object({ decision: z.enum(['approved', 'rejected']) });

  router.post('/:id/estimate/decision', (req, res) => {
    try {
      const parsed = decisionBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid decision', code: 'VALIDATION_ERROR' });
        return;
      }
      const user = requireAuthUser(req);
      const appointment = data.bookings.getById(Number(req.params.id));
      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found', code: 'APPOINTMENT_NOT_FOUND' });
        return;
      }
      const estimate = data.estimates.getByAppointment(appointment.id);
      if (!estimate) {
        res.status(404).json({ error: 'Estimate not found', code: 'ESTIMATE_NOT_FOUND' });
        return;
      }
      const updated = decideEstimate(data, {
        estimateId: estimate.id,
        decision: parsed.data.decision,
        user,
      });
      res.json({ data: serializeEstimate(updated) });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}

export const appointmentsRouter = createAppointmentsRouter();
