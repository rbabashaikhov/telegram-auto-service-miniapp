import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAvailableSlots } from './availability.js';
import { createAppointment } from './booking.js';
import { createTestWorld, type TestWorld } from '../test/harness.js';

const now = new Date('2026-08-15T09:00:00');

describe('availability', () => {
  let world: TestWorld;
  beforeEach(() => {
    world = createTestWorld(now);
  });
  afterEach(() => world.db.close());

  it('is available when specialist and resource are free', () => {
    const { slots } = getAvailableSlots(world.providers, {
      serviceId: world.oil,
      specialistId: world.alexey,
      date: world.futureDate,
      now,
    });
    expect(slots.some((slot) => slot.time === '10:00')).toBe(true);
  });

  it('is unavailable when the specialist is busy', () => {
    createAppointment(world.providers, {
      user: world.user,
      vehicleId: world.vehicleId,
      serviceId: world.oil,
      specialistId: world.alexey,
      date: world.futureDate,
      startTime: '10:00',
      now,
    });
    const { slots } = getAvailableSlots(world.providers, {
      serviceId: world.brakes,
      specialistId: world.alexey,
      date: world.futureDate,
      now,
    });
    expect(slots.some((slot) => slot.time === '10:00')).toBe(false);
  });

  it('is unavailable when the required resource is busy', () => {
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
      status: 'booked',
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
      status: 'booked',
    });
    const { slots } = getAvailableSlots(world.providers, {
      serviceId: world.oil,
      date: world.futureDate,
      now,
    });
    expect(slots.some((slot) => slot.time === '10:00')).toBe(false);
  });

  it('is unavailable when the specialist is blocked', () => {
    world.providers.availability.createBlockedSlot({
      specialistId: world.alexey,
      date: world.futureDate,
      startTime: '10:00',
      endTime: '12:00',
      reason: 'training',
    });
    const { slots } = getAvailableSlots(world.providers, {
      serviceId: world.oil,
      specialistId: world.alexey,
      date: world.futureDate,
      now,
    });
    expect(slots.some((slot) => slot.time === '10:00')).toBe(false);
  });

  it('is unavailable when the resource is blocked', () => {
    world.providers.availability.createBlockedSlot({
      resourceId: world.lift1,
      date: world.futureDate,
      startTime: '09:00',
      endTime: '19:00',
    });
    world.providers.availability.createBlockedSlot({
      resourceId: world.lift2,
      date: world.futureDate,
      startTime: '09:00',
      endTime: '19:00',
    });
    const { slots } = getAvailableSlots(world.providers, {
      serviceId: world.oil,
      specialistId: world.alexey,
      date: world.futureDate,
      now,
    });
    expect(slots).toEqual([]);
  });

  it('is unavailable when the specialist cannot perform the service', () => {
    const { slots } = getAvailableSlots(world.providers, {
      serviceId: world.computer,
      specialistId: world.alexey,
      date: world.futureDate,
      now,
    });
    expect(slots).toEqual([]);
  });

  it('assigns specialist and resource automatically', () => {
    const appointment = createAppointment(world.providers, {
      user: world.user,
      vehicleId: world.vehicleId,
      serviceId: world.computer,
      date: world.futureDate,
      startTime: '11:00',
      now,
    });
    expect(appointment.specialist_id).toBe(world.dmitry);
    expect(appointment.resource_id).toBe(world.diagBay);
  });
});
