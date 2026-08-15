import { config } from '../config.js';
import { AppError } from '../errors.js';
import type { Providers } from '../providers/types.js';
import type { Resource, SlotOption, Specialist } from '../types.js';
import {
  addDays,
  calculateAvailableSlots,
  getWeekday,
  intervalBusy,
  timeToMinutes,
  todayDateString,
} from './slots.js';

export function getEligibleSpecialists(providers: Providers, serviceId: number): Specialist[] {
  const service = providers.catalog.getActiveService(serviceId);
  if (!service) {
    throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
  }
  return providers.specialists.listEligible(serviceId);
}

function requiredResourceType(providers: Providers, serviceId: number): string | null {
  return providers.catalog.getServiceRequirement(serviceId)?.resource_type ?? null;
}

function compatibleResources(providers: Providers, serviceId: number): Resource[] {
  const type = requiredResourceType(providers, serviceId);
  if (!type) return providers.resources.list({ activeOnly: true });
  return providers.resources.list({ type, activeOnly: true });
}

function busyWithoutCurrent(
  busy: { start_time: string; end_time: string }[],
  current?: { start_time: string; end_time: string } | null,
): { start_time: string; end_time: string }[] {
  if (!current) return busy;
  return busy.filter(
    (interval) => !(interval.start_time === current.start_time && interval.end_time === current.end_time),
  );
}

export function findFreeResource(
  providers: Providers,
  params: {
    serviceId: number;
    date: string;
    startTime: string;
    durationMinutes: number;
    ignoreAppointmentId?: number;
  },
): Resource | undefined {
  const start = timeToMinutes(params.startTime);
  const end = start + params.durationMinutes;
  const current = params.ignoreAppointmentId
    ? providers.bookings.getById(params.ignoreAppointmentId)
    : undefined;

  return compatibleResources(providers, params.serviceId).find((resource) => {
    let busy = providers.availability.listResourceBusy(params.date, resource.id);
    if (current && current.resource_id === resource.id && current.appointment_date === params.date) {
      busy = busyWithoutCurrent(busy, current);
    }
    return !intervalBusy(start, end, busy);
  });
}

function specialistSlots(
  providers: Providers,
  params: {
    serviceId: number;
    specialistId: number;
    date: string;
    durationMinutes: number;
    now: Date;
    stepMinutes: number;
    ignoreAppointmentId?: number;
  },
): string[] {
  const specialist = providers.specialists.getActiveById(params.specialistId);
  if (!specialist) return [];
  if (!providers.specialists.offersService(params.specialistId, params.serviceId)) return [];

  const workingHours = providers.availability.getWorkingHours(
    params.specialistId,
    getWeekday(params.date),
  );
  const current = params.ignoreAppointmentId
    ? providers.bookings.getById(params.ignoreAppointmentId)
    : undefined;
  let busy = providers.availability.listSpecialistBusy(params.date, params.specialistId);
  if (current && current.specialist_id === params.specialistId && current.appointment_date === params.date) {
    busy = busyWithoutCurrent(busy, current);
  }

  const specialistFree = calculateAvailableSlots({
    date: params.date,
    durationMinutes: params.durationMinutes,
    workingHours,
    busyIntervals: busy,
    now: params.now,
    stepMinutes: params.stepMinutes,
  });

  const resources = compatibleResources(providers, params.serviceId);
  if (resources.length === 0) {
    return [];
  }

  return specialistFree.filter((time) => {
    const start = timeToMinutes(time);
    const end = start + params.durationMinutes;
    return resources.some((resource) => {
      let resourceBusy = providers.availability.listResourceBusy(params.date, resource.id);
      if (current && current.resource_id === resource.id && current.appointment_date === params.date) {
        resourceBusy = busyWithoutCurrent(resourceBusy, current);
      }
      return !intervalBusy(start, end, resourceBusy);
    });
  });
}

export function getAvailableSlots(
  providers: Providers,
  params: {
    serviceId: number;
    specialistId?: number | null;
    date: string;
    now?: Date;
    stepMinutes?: number;
    ignoreAppointmentId?: number;
  },
): { slots: SlotOption[]; durationMinutes: number; price: number } {
  const service = providers.catalog.getActiveService(params.serviceId);
  if (!service) {
    throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
  }
  const now = params.now ?? new Date();
  const stepMinutes = params.stepMinutes ?? config.booking.slotStepMinutes;
  const specialists = params.specialistId
    ? [providers.specialists.getActiveById(params.specialistId)].filter(
        (item): item is Specialist => Boolean(item),
      )
    : getEligibleSpecialists(providers, params.serviceId);

  if (params.specialistId && specialists.length === 0) {
    throw new AppError('Specialist not found', 404, 'SPECIALIST_NOT_FOUND');
  }

  const slots: SlotOption[] = [];
  for (const specialist of specialists) {
    const times = specialistSlots(providers, {
      serviceId: params.serviceId,
      specialistId: specialist.id,
      date: params.date,
      durationMinutes: service.duration_minutes,
      now,
      stepMinutes,
      ignoreAppointmentId: params.ignoreAppointmentId,
    });
    for (const time of times) {
      if (params.specialistId || !slots.some((slot) => slot.time === time)) {
        slots.push({
          time,
          specialistId: specialist.id,
          specialistName: specialist.name,
        });
      }
    }
  }

  slots.sort((a, b) => a.time.localeCompare(b.time) || a.specialistId - b.specialistId);
  return {
    slots,
    durationMinutes: service.duration_minutes,
    price: service.base_price,
  };
}

export function getAvailabilityCalendar(
  providers: Providers,
  params: {
    serviceId: number;
    specialistId?: number | null;
    days?: number;
    now?: Date;
  },
) {
  const now = params.now ?? new Date();
  const days = params.days ?? 14;
  const start = todayDateString(now);
  const calendar = [];
  for (let i = 0; i < days; i += 1) {
    const date = addDays(start, i);
    const { slots } = getAvailableSlots(providers, {
      serviceId: params.serviceId,
      specialistId: params.specialistId,
      date,
      now,
    });
    calendar.push({
      date,
      available: slots.length > 0,
      slots,
    });
  }
  const service = providers.catalog.getActiveService(params.serviceId)!;
  return {
    serviceId: params.serviceId,
    specialistId: params.specialistId ?? null,
    durationMinutes: service.duration_minutes,
    price: service.base_price,
    calendar,
  };
}

export function assertSlotBookable(
  providers: Providers,
  params: {
    serviceId: number;
    specialistId: number;
    date: string;
    startTime: string;
    now?: Date;
    ignoreAppointmentId?: number;
  },
): { resource: Resource; durationMinutes: number; price: number } {
  const service = providers.catalog.getActiveService(params.serviceId);
  if (!service) {
    throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
  }
  const specialist = providers.specialists.getActiveById(params.specialistId);
  if (!specialist) {
    throw new AppError('Specialist not found', 404, 'SPECIALIST_NOT_FOUND');
  }
  if (!providers.specialists.offersService(params.specialistId, params.serviceId)) {
    throw new AppError('Specialist does not offer this service', 400, 'SERVICE_NOT_OFFERED');
  }

  const { slots } = getAvailableSlots(providers, {
    serviceId: params.serviceId,
    specialistId: params.specialistId,
    date: params.date,
    now: params.now,
    ignoreAppointmentId: params.ignoreAppointmentId,
  });
  if (!slots.some((slot) => slot.time === params.startTime)) {
    throw new AppError('Selected time slot is no longer available', 409, 'SLOT_UNAVAILABLE');
  }

  const resource = findFreeResource(providers, {
    serviceId: params.serviceId,
    date: params.date,
    startTime: params.startTime,
    durationMinutes: service.duration_minutes,
    ignoreAppointmentId: params.ignoreAppointmentId,
  });
  if (!resource) {
    throw new AppError('Required resource is not available', 409, 'RESOURCE_UNAVAILABLE');
  }

  return {
    resource,
    durationMinutes: service.duration_minutes,
    price: service.base_price,
  };
}

export function assignSpecialistAndResource(
  providers: Providers,
  params: {
    serviceId: number;
    specialistId?: number | null;
    date: string;
    startTime: string;
    now?: Date;
    ignoreAppointmentId?: number;
  },
): { specialistId: number; resource: Resource; durationMinutes: number; price: number } {
  const now = params.now ?? new Date();
  let specialistId = params.specialistId ?? null;

  if (!specialistId) {
    const eligible = getEligibleSpecialists(providers, params.serviceId);
    for (const specialist of eligible) {
      try {
        const booked = assertSlotBookable(providers, {
          serviceId: params.serviceId,
          specialistId: specialist.id,
          date: params.date,
          startTime: params.startTime,
          now,
          ignoreAppointmentId: params.ignoreAppointmentId,
        });
        return {
          specialistId: specialist.id,
          resource: booked.resource,
          durationMinutes: booked.durationMinutes,
          price: booked.price,
        };
      } catch {
        // try next eligible specialist
      }
    }
    throw new AppError('Selected time slot is no longer available', 409, 'SLOT_UNAVAILABLE');
  }

  const booked = assertSlotBookable(providers, {
    serviceId: params.serviceId,
    specialistId,
    date: params.date,
    startTime: params.startTime,
    now,
    ignoreAppointmentId: params.ignoreAppointmentId,
  });
  return {
    specialistId,
    resource: booked.resource,
    durationMinutes: booked.durationMinutes,
    price: booked.price,
  };
}
