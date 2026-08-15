import { Router } from 'express';
import { z } from 'zod';
import { providers as defaultProviders } from '../container.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.js';
import type { Providers } from '../providers/types.js';
import type { AppointmentStatus, EstimateStatus, ServiceRequestStatus } from '../types.js';
import {
  reassignAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
} from '../services/booking.js';
import {
  addEstimateLabor,
  addEstimatePart,
  convertRequestToAppointment,
  submitEstimate,
} from '../services/estimates.js';
import { sendError } from './helpers.js';
import {
  serializeAppointment,
  serializeBlockedSlot,
  serializeCustomer,
  serializeEstimate,
  serializePart,
  serializeRequest,
  serializeResource,
  serializeService,
  serializeSpecialist,
  serializeVehicle,
  serializeWorkingHours,
} from './serialize.js';

export function createAdminRouter(data: Providers = defaultProviders): Router {
  const router = Router();
  router.use(adminAuthMiddleware);

  router.get('/dashboard', (_req, res) => {
    res.json({
      data: {
        appointments: data.bookings.listAdmin().length,
        requests: data.requests.listAdmin().length,
        customers: data.customers.listAll().length,
        vehicles: data.vehicles.listAll().length,
        estimates: data.estimates.listAdmin().length,
      },
    });
  });

  router.get('/service-requests', (req, res) => {
    const status = typeof req.query.status === 'string' ? (req.query.status as ServiceRequestStatus) : undefined;
    res.json({ data: data.requests.listAdmin(status).map(serializeRequest) });
  });

  router.patch('/service-requests/:id', (req, res) => {
    try {
      const body = z.object({ status: z.enum(['new', 'reviewing', 'scheduled', 'converted', 'closed', 'cancelled']) }).parse(req.body);
      res.json({ data: serializeRequest(data.requests.updateStatus(Number(req.params.id), body.status)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/service-requests/:id/convert', (req, res) => {
    try {
      const body = z.object({
        serviceId: z.number().int().positive(),
        date: z.string(),
        startTime: z.string(),
        specialistId: z.number().int().positive().optional().nullable(),
      }).parse(req.body);
      const result = convertRequestToAppointment(data, { requestId: Number(req.params.id), ...body });
      res.status(201).json({
        data: {
          request: serializeRequest(result.request),
          appointment: serializeAppointment(result.appointment),
        },
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/appointments', (req, res) => {
    const status = typeof req.query.status === 'string' ? (req.query.status as AppointmentStatus) : undefined;
    const specialistId = req.query.specialistId ? Number(req.query.specialistId) : undefined;
    res.json({ data: data.bookings.listAdmin({ status, specialistId }).map(serializeAppointment) });
  });

  router.get('/appointments/:id', (req, res) => {
    const appointment = data.bookings.getById(Number(req.params.id));
    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found', code: 'APPOINTMENT_NOT_FOUND' });
      return;
    }
    res.json({
      data: {
        appointment: serializeAppointment(appointment),
        estimate: data.estimates.getByAppointment(appointment.id)
          ? serializeEstimate(data.estimates.getByAppointment(appointment.id)!)
          : null,
      },
    });
  });

  router.patch('/appointments/:id', (req, res) => {
    try {
      const body = z.object({
        status: z.enum([
          'booked', 'arrived', 'diagnosing', 'waiting_approval', 'in_progress', 'completed', 'cancelled', 'no_show',
        ]).optional(),
        specialistId: z.number().int().positive().optional(),
        resourceId: z.number().int().positive().optional(),
      }).parse(req.body);
      let appointment = data.bookings.getById(Number(req.params.id));
      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found', code: 'APPOINTMENT_NOT_FOUND' });
        return;
      }
      if (body.status) {
        appointment = updateAppointmentStatus(data, { appointmentId: appointment.id, status: body.status });
      }
      if (body.specialistId || body.resourceId) {
        appointment = reassignAppointment(data, {
          appointmentId: appointment.id,
          specialistId: body.specialistId ?? appointment.specialist_id,
          resourceId: body.resourceId ?? appointment.resource_id ?? 0,
        });
      }
      res.json({ data: serializeAppointment(appointment) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/appointments/:id/reschedule', (req, res) => {
    try {
      const body = z.object({
        date: z.string(),
        startTime: z.string(),
        specialistId: z.number().int().positive().optional(),
      }).parse(req.body);
      const appointment = rescheduleAppointment(data, {
        appointmentId: Number(req.params.id),
        admin: true,
        ...body,
      });
      res.json({ data: serializeAppointment(appointment) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/appointments/:id/inspection', (req, res) => {
    try {
      const body = z.object({ summary: z.string().min(1), notes: z.string().optional().nullable() }).parse(req.body);
      const inspection = data.estimates.upsertInspection({
        appointmentId: Number(req.params.id),
        summary: body.summary,
        notes: body.notes,
      });
      res.json({ data: inspection });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/appointments/:id/estimate', (req, res) => {
    try {
      const existing = data.estimates.getByAppointment(Number(req.params.id));
      const estimate = existing ?? data.estimates.create(Number(req.params.id));
      res.status(existing ? 200 : 201).json({ data: serializeEstimate(estimate) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/customers', (_req, res) => {
    res.json({ data: data.customers.listAll().map(serializeCustomer) });
  });

  router.get('/vehicles', (_req, res) => {
    res.json({ data: data.vehicles.listAll().map(serializeVehicle) });
  });

  router.patch('/vehicles/:id', (req, res) => {
    try {
      const body = z.object({ mileage: z.number().int().min(0) }).parse(req.body);
      res.json({ data: serializeVehicle(data.vehicles.update(Number(req.params.id), { mileage: body.mileage })) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/services', (_req, res) => {
    res.json({ data: data.catalog.listServices().map(serializeService) });
  });

  router.post('/services', (req, res) => {
    try {
      const body = z.object({
        name: z.string().min(1),
        category: z.string().min(1),
        description: z.string().optional(),
        durationMinutes: z.number().int().positive(),
        basePrice: z.number().int().min(0),
        resourceType: z.string().optional(),
      }).parse(req.body);
      const service = data.catalog.createService(body);
      if (body.resourceType) data.catalog.setServiceRequirement(service.id, body.resourceType);
      res.status(201).json({ data: serializeService(service) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/services/:id', (req, res) => {
    try {
      const body = z.object({
        name: z.string().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        durationMinutes: z.number().int().positive().optional(),
        basePrice: z.number().int().min(0).optional(),
        active: z.boolean().optional(),
        resourceType: z.string().optional(),
      }).parse(req.body);
      const service = data.catalog.updateService(Number(req.params.id), body);
      if (body.resourceType) data.catalog.setServiceRequirement(service.id, body.resourceType);
      res.json({ data: serializeService(service) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/specialists', (_req, res) => {
    res.json({
      data: data.specialists.list().map((item) =>
        serializeSpecialist(item, data.specialists.listServiceIds(item.id)),
      ),
    });
  });

  router.post('/specialists', (req, res) => {
    try {
      const body = z.object({
        name: z.string().min(1),
        specialization: z.string().optional(),
        description: z.string().optional(),
        serviceIds: z.array(z.number().int().positive()).optional(),
      }).parse(req.body);
      const specialist = data.specialists.create(body);
      if (body.serviceIds) data.specialists.setServices(specialist.id, body.serviceIds);
      res.status(201).json({ data: serializeSpecialist(specialist, body.serviceIds) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/specialists/:id', (req, res) => {
    try {
      const body = z.object({
        name: z.string().optional(),
        specialization: z.string().optional(),
        description: z.string().optional(),
        active: z.boolean().optional(),
        serviceIds: z.array(z.number().int().positive()).optional(),
      }).parse(req.body);
      const specialist = data.specialists.update(Number(req.params.id), body);
      if (body.serviceIds) data.specialists.setServices(specialist.id, body.serviceIds);
      res.json({ data: serializeSpecialist(specialist, data.specialists.listServiceIds(specialist.id)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/resources', (_req, res) => {
    res.json({ data: data.resources.list().map(serializeResource) });
  });

  router.post('/resources', (req, res) => {
    try {
      const body = z.object({ name: z.string().min(1), type: z.string().min(1) }).parse(req.body);
      res.status(201).json({ data: serializeResource(data.resources.create(body)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/resources/:id', (req, res) => {
    try {
      const body = z.object({
        name: z.string().optional(),
        type: z.string().optional(),
        active: z.boolean().optional(),
      }).parse(req.body);
      res.json({ data: serializeResource(data.resources.update(Number(req.params.id), body)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/working-hours', (req, res) => {
    const specialistId = req.query.specialistId ? Number(req.query.specialistId) : undefined;
    res.json({ data: data.availability.listWorkingHours(specialistId).map(serializeWorkingHours) });
  });

  router.put('/working-hours', (req, res) => {
    try {
      const body = z.object({
        specialistId: z.number().int().positive(),
        weekday: z.number().int().min(0).max(6),
        startTime: z.string(),
        endTime: z.string(),
        active: z.boolean(),
      }).parse(req.body);
      res.json({ data: serializeWorkingHours(data.availability.upsertWorkingHours(body)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/blocked-slots', (_req, res) => {
    res.json({ data: data.availability.listBlockedSlots().map(serializeBlockedSlot) });
  });

  router.post('/blocked-slots', (req, res) => {
    try {
      const body = z.object({
        specialistId: z.number().int().positive().optional().nullable(),
        resourceId: z.number().int().positive().optional().nullable(),
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        reason: z.string().optional().nullable(),
      }).parse(req.body);
      res.status(201).json({ data: serializeBlockedSlot(data.availability.createBlockedSlot(body)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.delete('/blocked-slots/:id', (req, res) => {
    data.availability.deleteBlockedSlot(Number(req.params.id));
    res.status(204).end();
  });

  router.get('/parts', (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const vehicleId = req.query.vehicleId ? Number(req.query.vehicleId) : undefined;
    if (vehicleId) {
      const vehicle = data.vehicles.getById(vehicleId);
      if (!vehicle) {
        res.status(404).json({ error: 'Vehicle not found', code: 'VEHICLE_NOT_FOUND' });
        return;
      }
      res.json({ data: data.parts.getCompatibleParts(vehicle, { query, category }).map(serializePart) });
      return;
    }
    res.json({ data: data.parts.searchParts(query, category).map(serializePart) });
  });

  router.post('/parts', (req, res) => {
    try {
      const body = z.object({
        brand: z.string().min(1),
        name: z.string().min(1),
        sku: z.string().min(1),
        oemCode: z.string().optional().nullable(),
        category: z.string().min(1),
        price: z.number().int().min(0),
        notes: z.string().optional().nullable(),
      }).parse(req.body);
      res.status(201).json({ data: serializePart(data.parts.create(body)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.patch('/parts/:id', (req, res) => {
    try {
      const body = z.object({
        brand: z.string().optional(),
        name: z.string().optional(),
        sku: z.string().optional(),
        oemCode: z.string().optional().nullable(),
        category: z.string().optional(),
        price: z.number().int().min(0).optional(),
        notes: z.string().optional().nullable(),
        active: z.boolean().optional(),
      }).parse(req.body);
      res.json({ data: serializePart(data.parts.update(Number(req.params.id), body)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get('/estimates', (req, res) => {
    const status = typeof req.query.status === 'string' ? (req.query.status as EstimateStatus) : undefined;
    res.json({ data: data.estimates.listAdmin(status).map(serializeEstimate) });
  });

  router.post('/estimates/:id/labor', (req, res) => {
    try {
      const body = z.object({
        title: z.string().min(1),
        qty: z.number().int().positive().default(1),
        unitPrice: z.number().int().min(0),
      }).parse(req.body);
      res.json({ data: serializeEstimate(addEstimateLabor(data, { estimateId: Number(req.params.id), ...body })) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/estimates/:id/parts', (req, res) => {
    try {
      const body = z.object({
        partId: z.number().int().positive(),
        qty: z.number().int().positive().default(1),
      }).parse(req.body);
      res.json({ data: serializeEstimate(addEstimatePart(data, { estimateId: Number(req.params.id), ...body })) });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/estimates/:id/submit', (req, res) => {
    try {
      res.json({ data: serializeEstimate(submitEstimate(data, Number(req.params.id))) });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}

export const adminRouter = createAdminRouter();
