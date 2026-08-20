import { AppError } from '../errors.js';
import type { Providers } from '../providers/types.js';
import type { EstimateItemType, TelegramUser } from '../types.js';
import { createAppointment } from './booking.js';

export function createServiceRequest(
  providers: Providers,
  params: {
    user: TelegramUser;
    vehicleId: number;
    description: string;
    symptomCategory?: string | null;
    desiredDate?: string | null;
  },
) {
  if (!params.description.trim()) {
    throw new AppError('Description is required', 400, 'VALIDATION_ERROR');
  }
  const customer = providers.customers.upsert(params.user);
  const vehicle = providers.vehicles.getById(params.vehicleId);
  if (!vehicle || vehicle.customer_id !== customer.id) {
    throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
  }
  return providers.requests.create({
    customerId: customer.id,
    vehicleId: vehicle.id,
    description: params.description.trim(),
    symptomCategory: params.symptomCategory ?? null,
    desiredDate: params.desiredDate ?? null,
  });
}

export function convertRequestToAppointment(
  providers: Providers,
  params: {
    requestId: number;
    serviceId: number;
    date: string;
    startTime: string;
    specialistId?: number | null;
    now?: Date;
  },
) {
  const request = providers.requests.getById(params.requestId);
  if (!request) throw new AppError('Service request not found', 404, 'SERVICE_REQUEST_NOT_FOUND');
  if (request.status === 'converted' || request.status === 'cancelled') {
    throw new AppError('Service request cannot be converted', 400, 'INVALID_REQUEST_STATUS');
  }
  const customer = providers.customers.getById(request.customer_id);
  if (!customer?.telegram_user_id) {
    throw new AppError('Customer has no Telegram identity', 400, 'CUSTOMER_NO_TELEGRAM');
  }

  const appointment = createAppointment(providers, {
    user: { id: customer.telegram_user_id, first_name: customer.name },
    vehicleId: request.vehicle_id,
    serviceId: params.serviceId,
    specialistId: params.specialistId,
    date: params.date,
    startTime: params.startTime,
    notes: request.description,
    serviceRequestId: request.id,
    source: 'admin',
    now: params.now,
  });
  providers.requests.updateStatus(request.id, 'converted', appointment.id);
  return { request: providers.requests.getById(request.id)!, appointment };
}

export function addEstimateLabor(
  providers: Providers,
  params: { estimateId: number; title: string; qty: number; unitPrice: number },
) {
  return addEstimateItem(providers, {
    estimateId: params.estimateId,
    type: 'labor',
    title: params.title,
    qty: params.qty,
    unitPrice: params.unitPrice,
  });
}

export function addEstimatePart(
  providers: Providers,
  params: { estimateId: number; partId: number; qty: number; vehicleId?: number },
) {
  const estimate = providers.estimates.getById(params.estimateId);
  if (!estimate) throw new AppError('Estimate not found', 404, 'ESTIMATE_NOT_FOUND');
  const part = providers.parts.getPart(params.partId);
  if (!part) throw new AppError('Part not found', 404, 'PART_NOT_FOUND');

  const appointment = providers.bookings.getById(estimate.appointment_id);
  if (!appointment) throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
  const vehicle = providers.vehicles.getById(params.vehicleId ?? appointment.vehicle_id);
  if (!vehicle) throw new AppError('Vehicle not found', 404, 'VEHICLE_NOT_FOUND');
  if (!providers.parts.isCompatible(part.id, vehicle)) {
    throw new AppError('Part is not compatible with this vehicle', 400, 'PART_NOT_COMPATIBLE');
  }

  return addEstimateItem(providers, {
    estimateId: params.estimateId,
    type: 'part',
    title: `${part.brand} ${part.sku}`,
    qty: params.qty,
    unitPrice: part.price,
    partId: part.id,
  });
}

function addEstimateItem(
  providers: Providers,
  params: {
    estimateId: number;
    type: EstimateItemType;
    title: string;
    qty: number;
    unitPrice: number;
    partId?: number | null;
  },
) {
  const estimate = providers.estimates.getById(params.estimateId);
  if (!estimate) throw new AppError('Estimate not found', 404, 'ESTIMATE_NOT_FOUND');
  if (estimate.status !== 'draft') {
    throw new AppError('Estimate can only be edited in draft', 400, 'ESTIMATE_LOCKED');
  }
  providers.estimates.addItem(params);
  return providers.estimates.getById(params.estimateId)!;
}

export function submitEstimate(providers: Providers, estimateId: number) {
  return providers.transaction(() => {
    const estimate = providers.estimates.getById(estimateId);
    if (!estimate) throw new AppError('Estimate not found', 404, 'ESTIMATE_NOT_FOUND');
    if (estimate.status !== 'draft') {
      throw new AppError('Only draft estimates can be submitted', 400, 'ESTIMATE_LOCKED');
    }
    if (estimate.items.length === 0) {
      throw new AppError('Estimate must contain at least one item', 400, 'ESTIMATE_EMPTY');
    }
    const submitted = providers.estimates.updateStatus(estimateId, 'awaiting_approval');
    const appointment = providers.bookings.getById(estimate.appointment_id);
    if (appointment && (appointment.status === 'diagnosing' || appointment.status === 'arrived')) {
      providers.bookings.updateStatus(appointment.id, 'waiting_approval');
    }
    return submitted;
  });
}

export function decideEstimate(
  providers: Providers,
  params: {
    estimateId: number;
    decision: 'approved' | 'rejected';
    user?: TelegramUser;
    admin?: boolean;
    itemIds?: number[];
  },
) {
  return providers.transaction(() => {
    const estimate = providers.estimates.getById(params.estimateId);
    if (!estimate) throw new AppError('Estimate not found', 404, 'ESTIMATE_NOT_FOUND');
    if (estimate.status !== 'awaiting_approval') {
      throw new AppError('Estimate is not awaiting approval', 400, 'ESTIMATE_NOT_PENDING');
    }
    const appointment = providers.bookings.getById(estimate.appointment_id);
    if (!appointment) throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    if (!params.admin && params.user) {
      const customer = providers.customers.getByTelegramUserId(params.user.id);
      if (!customer || customer.id !== appointment.customer_id) {
        throw new AppError('Estimate not found', 404, 'ESTIMATE_NOT_FOUND');
      }
    }

    let updated = estimate;
    if (params.decision === 'approved') {
      const allowed = new Set(estimate.items.map((item) => item.id));
      const itemIds = params.itemIds ?? estimate.items.map((item) => item.id);
      if (itemIds.length === 0) {
        throw new AppError('Select at least one estimate item', 400, 'ESTIMATE_EMPTY_SELECTION');
      }
      if (itemIds.some((id) => !allowed.has(id))) {
        throw new AppError('Estimate item not found', 400, 'ESTIMATE_ITEM_NOT_FOUND');
      }
      updated = providers.estimates.setItemsApproved(estimate.id, itemIds);
    }

    const approvedAt = params.decision === 'approved' ? new Date().toISOString() : null;
    updated = providers.estimates.updateStatus(estimate.id, params.decision, approvedAt);
    if (params.decision === 'approved') {
      updated = providers.estimates.getById(estimate.id)!;
      if (appointment.status === 'waiting_approval' || appointment.status === 'diagnosing') {
        providers.bookings.updateStatus(appointment.id, 'in_progress');
      }
    } else if (appointment.status === 'waiting_approval') {
      providers.bookings.updateStatus(appointment.id, 'diagnosing');
    }
    return updated;
  });
}
