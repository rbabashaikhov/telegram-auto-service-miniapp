import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../errors.js';
import { createAppointment, updateAppointmentStatus } from './booking.js';
import {
  addEstimateLabor,
  addEstimatePart,
  convertRequestToAppointment,
  createServiceRequest,
  decideEstimate,
  submitEstimate,
} from './estimates.js';
import { assertStatusTransition } from './status.js';
import { createTestWorld, type TestWorld } from '../test/harness.js';

const now = new Date('2026-08-15T09:00:00');

describe('service requests', () => {
  let world: TestWorld;
  beforeEach(() => {
    world = createTestWorld(now);
  });
  afterEach(() => world.db.close());

  it('creates a request and converts it to a diagnostic appointment', () => {
    const request = createServiceRequest(world.providers, {
      user: world.user,
      vehicleId: world.vehicleId,
      description: 'Стук спереди при повороте',
      symptomCategory: 'noise',
    });
    expect(request.status).toBe('new');

    const converted = convertRequestToAppointment(world.providers, {
      requestId: request.id,
      serviceId: world.computer,
      date: world.futureDate,
      startTime: '11:00',
      now,
    });
    expect(converted.request.status).toBe('converted');
    expect(converted.appointment.service_id).toBe(world.computer);
    expect(converted.appointment.service_request_id).toBe(request.id);
  });
});

describe('estimates', () => {
  let world: TestWorld;
  beforeEach(() => {
    world = createTestWorld(now);
  });
  afterEach(() => world.db.close());

  it('creates labor and part items, calculates total, and accepts approval', () => {
    const appointment = createAppointment(world.providers, {
      user: world.user,
      vehicleId: world.vehicleId,
      serviceId: world.brakes,
      date: world.futureDate,
      startTime: '10:00',
      now,
    });
    updateAppointmentStatus(world.providers, { appointmentId: appointment.id, status: 'arrived' });
    updateAppointmentStatus(world.providers, { appointmentId: appointment.id, status: 'diagnosing' });
    world.providers.estimates.upsertInspection({
      appointmentId: appointment.id,
      summary: 'Износ передних тормозных колодок.',
    });
    const estimate = world.providers.estimates.create(appointment.id);
    addEstimateLabor(world.providers, {
      estimateId: estimate.id,
      title: 'Замена передних тормозных колодок',
      qty: 1,
      unitPrice: 2500,
    });
    const withPart = addEstimatePart(world.providers, {
      estimateId: estimate.id,
      partId: world.tiguanPartId,
      qty: 1,
    });
    expect(withPart.total_amount).toBe(8900);

    const submitted = submitEstimate(world.providers, estimate.id);
    expect(submitted.status).toBe('awaiting_approval');
    expect(world.providers.bookings.getById(appointment.id)?.status).toBe('waiting_approval');

    const approved = decideEstimate(world.providers, {
      estimateId: estimate.id,
      decision: 'approved',
      user: world.user,
    });
    expect(approved.status).toBe('approved');
    expect(world.providers.bookings.getById(appointment.id)?.status).toBe('in_progress');
  });

  it('rejects an incompatible part', () => {
    const appointment = createAppointment(world.providers, {
      user: world.user,
      vehicleId: world.vehicleId,
      serviceId: world.brakes,
      date: world.futureDate,
      startTime: '10:00',
      now,
    });
    const estimate = world.providers.estimates.create(appointment.id);
    expect(() =>
      addEstimatePart(world.providers, { estimateId: estimate.id, partId: world.otherPartId, qty: 1 }),
    ).toThrow(/not compatible/);
  });

  it('rejects an estimate and returns the appointment to diagnosing', () => {
    const appointment = createAppointment(world.providers, {
      user: world.user,
      vehicleId: world.vehicleId,
      serviceId: world.brakes,
      date: world.futureDate,
      startTime: '10:00',
      now,
    });
    updateAppointmentStatus(world.providers, { appointmentId: appointment.id, status: 'arrived' });
    updateAppointmentStatus(world.providers, { appointmentId: appointment.id, status: 'diagnosing' });
    const estimate = world.providers.estimates.create(appointment.id);
    addEstimateLabor(world.providers, {
      estimateId: estimate.id,
      title: 'Диагностика',
      qty: 1,
      unitPrice: 2500,
    });
    submitEstimate(world.providers, estimate.id);
    const rejected = decideEstimate(world.providers, {
      estimateId: estimate.id,
      decision: 'rejected',
      user: world.user,
    });
    expect(rejected.status).toBe('rejected');
    expect(world.providers.bookings.getById(appointment.id)?.status).toBe('diagnosing');
  });
});

describe('status flow', () => {
  it('allows booked → arrived → diagnosing and forbids completed → diagnosing', () => {
    expect(() => assertStatusTransition('booked', 'arrived')).not.toThrow();
    expect(() => assertStatusTransition('arrived', 'diagnosing')).not.toThrow();
    expect(() => assertStatusTransition('completed', 'diagnosing')).toThrow(AppError);
  });
});
