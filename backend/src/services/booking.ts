import { config } from '../config.js';
import { AppError } from '../errors.js';
import type { Providers } from '../providers/types.js';
import type {
  AppointmentStatus,
  AppointmentWithDetails,
  TelegramUser,
} from '../types.js';
import { assignSpecialistAndResource } from './availability.js';
import { minutesToTime, timeToMinutes, todayDateString, currentTimeString } from './slots.js';
import { assertStatusTransition, isMaintenanceService } from './status.js';

export class BookingConflictError extends AppError {
  constructor(message = 'Selected time slot is no longer available') {
    super(message, 409, 'SLOT_UNAVAILABLE');
    this.name = 'BookingConflictError';
  }
}

function validateDateTime(date: string, startTime: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError('Invalid date format', 400, 'VALIDATION_ERROR');
  }
  if (!/^\d{2}:\d{2}$/.test(startTime)) {
    throw new AppError('Invalid time format', 400, 'VALIDATION_ERROR');
  }
}

function requireCustomerVehicle(
  providers: Providers,
  user: TelegramUser,
  vehicleId: number,
) {
  const customer = providers.customers.upsert(user);
  const vehicle = providers.vehicles.getById(vehicleId);
  if (!vehicle || vehicle.customer_id !== customer.id) {
    throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
  }
  return { customer, vehicle };
}

export function createAppointment(
  providers: Providers,
  params: {
    user: TelegramUser;
    vehicleId: number;
    serviceId: number;
    specialistId?: number | null;
    date: string;
    startTime: string;
    notes?: string | null;
    sourceAppointmentId?: number | null;
    serviceRequestId?: number | null;
    source?: string;
    now?: Date;
  },
): AppointmentWithDetails {
  validateDateTime(params.date, params.startTime);
  const now = params.now ?? new Date();

  return providers.transaction(() => {
    const { customer, vehicle } = requireCustomerVehicle(providers, params.user, params.vehicleId);
    const assigned = assignSpecialistAndResource(providers, {
      serviceId: params.serviceId,
      specialistId: params.specialistId,
      date: params.date,
      startTime: params.startTime,
      now,
    });
    const endTime = minutesToTime(timeToMinutes(params.startTime) + assigned.durationMinutes);

    return providers.bookings.insert({
      customerId: customer.id,
      vehicleId: vehicle.id,
      serviceId: params.serviceId,
      specialistId: assigned.specialistId,
      resourceId: assigned.resource.id,
      date: params.date,
      startTime: params.startTime,
      endTime,
      durationMinutes: assigned.durationMinutes,
      price: assigned.price,
      source: params.source ?? 'miniapp',
      notes: params.notes ?? null,
      sourceAppointmentId: params.sourceAppointmentId ?? null,
      serviceRequestId: params.serviceRequestId ?? null,
    });
  });
}

export function cancelAppointment(
  providers: Providers,
  params: { user: TelegramUser; appointmentId: number },
): AppointmentWithDetails {
  return providers.transaction(() => {
    const appointment = providers.bookings.getById(params.appointmentId);
    if (!appointment) throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    const customer = providers.customers.getByTelegramUserId(params.user.id);
    if (!customer || customer.id !== appointment.customer_id) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }
    assertStatusTransition(appointment.status, 'cancelled');
    return providers.bookings.updateStatus(appointment.id, 'cancelled');
  });
}

export function rescheduleAppointment(
  providers: Providers,
  params: {
    user?: TelegramUser;
    appointmentId: number;
    date: string;
    startTime: string;
    specialistId?: number | null;
    admin?: boolean;
    now?: Date;
  },
): AppointmentWithDetails {
  validateDateTime(params.date, params.startTime);
  const now = params.now ?? new Date();

  return providers.transaction(() => {
    const appointment = providers.bookings.getById(params.appointmentId);
    if (!appointment) throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    if (!params.admin) {
      const customer = params.user
        ? providers.customers.getByTelegramUserId(params.user.id)
        : undefined;
      if (!customer || customer.id !== appointment.customer_id) {
        throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
      }
    }
    if (appointment.status === 'cancelled' || appointment.status === 'completed' || appointment.status === 'no_show') {
      throw new AppError('Cannot reschedule a closed appointment', 400, 'INVALID_STATUS_TRANSITION');
    }

    const assigned = assignSpecialistAndResource(providers, {
      serviceId: appointment.service_id,
      specialistId: params.specialistId ?? appointment.specialist_id,
      date: params.date,
      startTime: params.startTime,
      now,
      ignoreAppointmentId: appointment.id,
    });
    const endTime = minutesToTime(timeToMinutes(params.startTime) + assigned.durationMinutes);
    return providers.bookings.updateSchedule({
      id: appointment.id,
      specialistId: assigned.specialistId,
      resourceId: assigned.resource.id,
      date: params.date,
      startTime: params.startTime,
      endTime,
      durationMinutes: assigned.durationMinutes,
    });
  });
}

export function updateAppointmentStatus(
  providers: Providers,
  params: { appointmentId: number; status: AppointmentStatus; now?: Date },
): AppointmentWithDetails {
  return providers.transaction(() => {
    const appointment = providers.bookings.getById(params.appointmentId);
    if (!appointment) throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    assertStatusTransition(appointment.status, params.status);
    const updated = providers.bookings.updateStatus(appointment.id, params.status);
    if (params.status === 'completed') {
      maybeWriteMaintenanceReminder(providers, updated, params.now);
    }
    return updated;
  });
}

export function reassignAppointment(
  providers: Providers,
  params: { appointmentId: number; specialistId: number; resourceId: number },
): AppointmentWithDetails {
  return providers.transaction(() => {
    const appointment = providers.bookings.getById(params.appointmentId);
    if (!appointment) throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    const assigned = assignSpecialistAndResource(providers, {
      serviceId: appointment.service_id,
      specialistId: params.specialistId,
      date: appointment.appointment_date,
      startTime: appointment.start_time,
      ignoreAppointmentId: appointment.id,
    });
    if (params.resourceId && assigned.resource.id !== params.resourceId) {
      const resource = providers.resources.getById(params.resourceId);
      if (!resource) throw new AppError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
      const requirement = providers.catalog.getServiceRequirement(appointment.service_id);
      if (requirement && resource.type !== requirement.resource_type) {
        throw new AppError('Resource type does not match the service', 400, 'RESOURCE_TYPE_MISMATCH');
      }
      const busy = providers.availability.listResourceBusy(appointment.appointment_date, resource.id);
      const start = timeToMinutes(appointment.start_time);
      const end = timeToMinutes(appointment.end_time);
      const conflict = busy.some((interval) => {
        if (interval.start_time === appointment.start_time && interval.end_time === appointment.end_time) {
          return false;
        }
        return start < timeToMinutes(interval.end_time) && timeToMinutes(interval.start_time) < end;
      });
      if (conflict) {
        throw new BookingConflictError('Resource is not available');
      }
      return providers.bookings.updateAssignment(appointment.id, assigned.specialistId, resource.id);
    }
    return providers.bookings.updateAssignment(appointment.id, assigned.specialistId, assigned.resource.id);
  });
}

function maybeWriteMaintenanceReminder(
  providers: Providers,
  appointment: AppointmentWithDetails,
  now?: Date,
): void {
  if (!isMaintenanceService(appointment.service_category, appointment.service_name)) return;
  const vehicle = providers.vehicles.getById(appointment.vehicle_id);
  if (!vehicle) return;
  providers.history.upsertReminder({
    vehicleId: vehicle.id,
    serviceId: appointment.service_id,
    lastMileage: vehicle.mileage,
    intervalKm: config.maintenance.oilIntervalKm,
    lastCompletedAt: (now ?? new Date()).toISOString(),
  });
}

export function getRepeatContext(providers: Providers, appointmentId: number) {
  const appointment = providers.bookings.getById(appointmentId);
  if (!appointment) throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
  const service = providers.catalog.getActiveService(appointment.service_id);
  const specialist = providers.specialists.getActiveById(appointment.specialist_id);
  const warnings: Array<{ code: string; message: string }> = [];
  if (!service) warnings.push({ code: 'SERVICE_INACTIVE', message: 'Услуга больше недоступна' });
  if (!specialist) warnings.push({ code: 'SPECIALIST_INACTIVE', message: 'Специалист больше недоступен' });
  return {
    sourceAppointmentId: appointment.id,
    vehicleId: appointment.vehicle_id,
    serviceId: service?.id ?? appointment.service_id,
    specialistId: specialist?.id ?? null,
    warnings,
  };
}

export function getAdminAppointments(
  providers: Providers,
  filters?: { status?: AppointmentStatus; specialistId?: number },
) {
  return providers.bookings.listAdmin(filters);
}

export function portalNow(now = new Date()) {
  return { today: todayDateString(now), nowTime: currentTimeString(now) };
}
