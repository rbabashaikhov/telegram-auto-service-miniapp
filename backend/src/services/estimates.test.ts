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

  it('creates a request with an expanded symptom category', () => {
    const request = createServiceRequest(world.providers, {
      user: world.user,
      vehicleId: world.vehicleId,
      description: 'Пора плановое ТО, горит индикатор масла',
      symptomCategory: 'maintenance',
    });
    expect(request.symptom_category).toBe('maintenance');
    expect(request.description).toContain('ТО');
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

  it('stores inspection items with severity', () => {
    const appointment = createAppointment(world.providers, {
      user: world.user,
      vehicleId: world.vehicleId,
      serviceId: world.brakes,
      date: world.futureDate,
      startTime: '10:00',
      now,
    });
    const inspection = world.providers.estimates.upsertInspection({
      appointmentId: appointment.id,
      summary: 'Осмотр ходовой и тормозов.',
    });
    world.providers.estimates.addInspectionItem({
      inspectionId: inspection.id,
      name: 'Передние тормозные колодки',
      severity: 'critical',
      note: 'Требуют замены',
    });
    world.providers.estimates.addInspectionItem({
      inspectionId: inspection.id,
      name: 'Воздушный фильтр',
      severity: 'recommendation',
      note: 'Рекомендуется заменить',
    });
    world.providers.estimates.addInspectionItem({
      inspectionId: inspection.id,
      name: 'Подвеска',
      severity: 'ok',
      note: 'Без замечаний',
    });
    const stored = world.providers.estimates.getInspection(appointment.id);
    expect(stored?.items).toHaveLength(3);
    expect(stored?.items.map((item) => item.severity)).toEqual(['critical', 'recommendation', 'ok']);
  });

  it('approves selected estimate items and continues the workflow', () => {
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
    submitEstimate(world.providers, estimate.id);

    const laborId = withPart.items.find((item) => item.type === 'labor')!.id;
    const approved = decideEstimate(world.providers, {
      estimateId: estimate.id,
      decision: 'approved',
      user: world.user,
      itemIds: [laborId],
    });
    expect(approved.status).toBe('approved');
    expect(approved.total_amount).toBe(2500);
    expect(approved.items.find((item) => item.id === laborId)?.approved).toBe(1);
    expect(approved.items.find((item) => item.id !== laborId)?.approved).toBe(0);
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
