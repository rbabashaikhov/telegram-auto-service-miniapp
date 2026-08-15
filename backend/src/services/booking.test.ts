import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../errors.js';
import { createAppointment, cancelAppointment, rescheduleAppointment } from './booking.js';
import { createTestWorld, type TestWorld } from '../test/harness.js';

const now = new Date('2026-08-15T09:00:00');

describe('booking', () => {
  let world: TestWorld;
  beforeEach(() => {
    world = createTestWorld(now);
  });
  afterEach(() => world.db.close());

  it('creates, cancels and reschedules an appointment', () => {
    const created = createAppointment(world.providers, {
      user: world.user,
      vehicleId: world.vehicleId,
      serviceId: world.oil,
      specialistId: world.alexey,
      date: world.futureDate,
      startTime: '10:00',
      now,
    });
    expect(created.status).toBe('booked');
    expect(created.resource_id).toBeTruthy();

    const moved = rescheduleAppointment(world.providers, {
      user: world.user,
      appointmentId: created.id,
      date: world.futureDate,
      startTime: '13:00',
      now,
    });
    expect(moved.start_time).toBe('13:00');

    const cancelled = cancelAppointment(world.providers, {
      user: world.user,
      appointmentId: created.id,
    });
    expect(cancelled.status).toBe('cancelled');
  });

  it('rejects an invalid slot', () => {
    expect(() =>
      createAppointment(world.providers, {
        user: world.user,
        vehicleId: world.vehicleId,
        serviceId: world.oil,
        specialistId: world.alexey,
        date: world.futureDate,
        startTime: '03:00',
        now,
      }),
    ).toThrow(AppError);
  });

  it('prevents specialist double booking', () => {
    createAppointment(world.providers, {
      user: world.user,
      vehicleId: world.vehicleId,
      serviceId: world.oil,
      specialistId: world.alexey,
      date: world.futureDate,
      startTime: '10:00',
      now,
    });
    expect(() =>
      createAppointment(world.providers, {
        user: world.user,
        vehicleId: world.vehicleId,
        serviceId: world.brakes,
        specialistId: world.alexey,
        date: world.futureDate,
        startTime: '10:00',
        now,
      }),
    ).toThrow(/no longer available/);
  });

  it('prevents resource double booking', () => {
    world.providers.bookings.insert({
      customerId: world.client.id,
      vehicleId: world.vehicleId,
      serviceId: world.computer,
      specialistId: world.dmitry,
      resourceId: world.lift1,
      date: world.futureDate,
      startTime: '10:00',
      endTime: '11:00',
      durationMinutes: 60,
      price: 2800,
    });
    world.providers.bookings.insert({
      customerId: world.client.id,
      vehicleId: world.vehicleId,
      serviceId: world.alignment,
      specialistId: world.sergey,
      resourceId: world.lift2,
      date: world.futureDate,
      startTime: '10:00',
      endTime: '11:00',
      durationMinutes: 60,
      price: 4000,
    });
    expect(() =>
      createAppointment(world.providers, {
        user: world.user,
        vehicleId: world.vehicleId,
        serviceId: world.oil,
        date: world.futureDate,
        startTime: '10:00',
        now,
      }),
    ).toThrow(/no longer available/);
  });
});
