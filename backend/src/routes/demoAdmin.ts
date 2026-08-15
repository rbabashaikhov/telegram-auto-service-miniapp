import { Router } from 'express';
import { isDemoAdminPreviewEnabled } from '../config.js';
import { providers as defaultProviders } from '../container.js';
import type { Providers } from '../providers/types.js';
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

export function createDemoAdminRouter(
  data: Providers = defaultProviders,
  options?: { isEnabled?: () => boolean },
): Router {
  const router = Router();
  const isEnabled = options?.isEnabled ?? (() => isDemoAdminPreviewEnabled());

  router.use((req, res, next) => {
    if (!isEnabled()) {
      res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
      return;
    }
    if (req.method !== 'GET') {
      res.status(405).json({
        error: 'Demo admin is read-only',
        code: 'DEMO_ADMIN_READ_ONLY',
      });
      return;
    }
    next();
  });

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
  router.get('/service-requests', (_req, res) => {
    res.json({ data: data.requests.listAdmin().map(serializeRequest) });
  });
  router.get('/appointments', (_req, res) => {
    res.json({ data: data.bookings.listAdmin().map(serializeAppointment) });
  });
  router.get('/customers', (_req, res) => {
    res.json({ data: data.customers.listAll().map(serializeCustomer) });
  });
  router.get('/vehicles', (_req, res) => {
    res.json({ data: data.vehicles.listAll().map(serializeVehicle) });
  });
  router.get('/services', (_req, res) => {
    res.json({ data: data.catalog.listServices().map(serializeService) });
  });
  router.get('/specialists', (_req, res) => {
    res.json({
      data: data.specialists.list().map((item) =>
        serializeSpecialist(item, data.specialists.listServiceIds(item.id)),
      ),
    });
  });
  router.get('/resources', (_req, res) => {
    res.json({ data: data.resources.list().map(serializeResource) });
  });
  router.get('/working-hours', (_req, res) => {
    res.json({ data: data.availability.listWorkingHours().map(serializeWorkingHours) });
  });
  router.get('/blocked-slots', (_req, res) => {
    res.json({ data: data.availability.listBlockedSlots().map(serializeBlockedSlot) });
  });
  router.get('/parts', (_req, res) => {
    res.json({ data: data.parts.searchParts().map(serializePart) });
  });
  router.get('/estimates', (_req, res) => {
    res.json({ data: data.estimates.listAdmin().map(serializeEstimate) });
  });

  return router;
}

export const demoAdminRouter = createDemoAdminRouter();
