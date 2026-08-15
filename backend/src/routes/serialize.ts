import { CUSTOMER_STATUS_LABELS } from '../types.js';
import type {
  AppointmentWithDetails,
  BlockedSlot,
  Customer,
  EstimateWithDetails,
  HistoryVisit,
  Inspection,
  MaintenanceReminder,
  Part,
  Resource,
  Service,
  ServiceRequestWithDetails,
  Specialist,
  Vehicle,
  VehicleVariant,
  WorkingHours,
} from '../types.js';

export function serializeCustomer(row: Customer) {
  return {
    id: row.id,
    telegramUserId: row.telegram_user_id,
    name: row.name,
    phone: row.phone,
    username: row.username,
    createdAt: row.created_at,
  };
}

export function serializeVehicle(row: Vehicle) {
  return {
    id: row.id,
    customerId: row.customer_id,
    make: row.make,
    model: row.model,
    generation: row.generation,
    year: row.year,
    engine: row.engine,
    vin: row.vin,
    licensePlate: row.license_plate,
    mileage: row.mileage,
    isActive: Boolean(row.is_active),
    title: `${row.make} ${row.model}`,
    subtitle: [row.year, row.engine].filter(Boolean).join(' · '),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeService(service: Service) {
  return {
    id: service.id,
    name: service.name,
    category: service.category,
    description: service.description,
    durationMinutes: service.duration_minutes,
    price: service.base_price,
    active: Boolean(service.active),
    displayOrder: service.display_order,
  };
}

export function serializeSpecialist(specialist: Specialist, serviceIds?: number[]) {
  return {
    id: specialist.id,
    name: specialist.name,
    specialization: specialist.specialization,
    description: specialist.description,
    active: Boolean(specialist.active),
    displayOrder: specialist.display_order,
    ...(serviceIds ? { serviceIds } : {}),
  };
}

export function serializeResource(row: Resource) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    active: Boolean(row.active),
  };
}

export function serializeAppointment(a: AppointmentWithDetails) {
  return {
    id: a.id,
    date: a.appointment_date,
    startTime: a.start_time,
    endTime: a.end_time,
    durationMinutes: a.duration_minutes,
    price: a.price,
    status: a.status,
    statusLabel: CUSTOMER_STATUS_LABELS[a.status],
    source: a.source,
    notes: a.notes,
    sourceAppointmentId: a.source_appointment_id,
    serviceRequestId: a.service_request_id,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    service: {
      id: a.service_id,
      name: a.service_name,
      category: a.service_category,
      durationMinutes: a.service_duration_minutes,
      price: a.service_price,
    },
    specialist: {
      id: a.specialist_id,
      name: a.specialist_name,
    },
    resource: a.resource_id
      ? { id: a.resource_id, name: a.resource_name, type: a.resource_type }
      : null,
    customer: {
      id: a.customer_id,
      telegramUserId: a.customer_telegram_user_id,
      name: a.customer_name,
      phone: a.customer_phone,
    },
    vehicle: {
      id: a.vehicle_id,
      make: a.vehicle_make,
      model: a.vehicle_model,
      year: a.vehicle_year,
      engine: a.vehicle_engine,
      mileage: a.vehicle_mileage,
      licensePlate: a.vehicle_license_plate,
      title: `${a.vehicle_make} ${a.vehicle_model}`,
    },
  };
}

export function serializeWorkingHours(row: WorkingHours) {
  return {
    id: row.id,
    specialistId: row.specialist_id,
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
    active: Boolean(row.active),
  };
}

export function serializeBlockedSlot(row: BlockedSlot) {
  return {
    id: row.id,
    specialistId: row.specialist_id,
    resourceId: row.resource_id,
    date: row.blocked_date,
    startTime: row.start_time,
    endTime: row.end_time,
    reason: row.reason,
  };
}

export function serializeRequest(row: ServiceRequestWithDetails) {
  return {
    id: row.id,
    description: row.description,
    symptomCategory: row.symptom_category,
    desiredDate: row.desired_date,
    status: row.status,
    appointmentId: row.appointment_id,
    createdAt: row.created_at,
    customer: {
      id: row.customer_id,
      name: row.customer_name,
      phone: row.customer_phone,
    },
    vehicle: {
      id: row.vehicle_id,
      make: row.vehicle_make,
      model: row.vehicle_model,
      year: row.vehicle_year,
      engine: row.vehicle_engine,
      title: `${row.vehicle_make} ${row.vehicle_model}`,
    },
  };
}

export function serializeInspection(row: Inspection) {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    summary: row.summary,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function serializeEstimate(row: EstimateWithDetails) {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    status: row.status,
    totalAmount: row.total_amount,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    items: row.items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      qty: item.qty,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      partId: item.part_id,
    })),
    inspection: row.inspection ? serializeInspection(row.inspection) : null,
  };
}

export function serializePart(row: Part) {
  return {
    id: row.id,
    brand: row.brand,
    name: row.name,
    sku: row.sku,
    oemCode: row.oem_code,
    category: row.category,
    price: row.price,
    notes: row.notes,
    active: Boolean(row.active),
  };
}

export function serializeHistory(visit: HistoryVisit) {
  return {
    ...serializeAppointment(visit.appointment),
    estimateTotal: visit.estimateTotal,
    laborTitles: visit.laborTitles,
  };
}

export function serializeReminder(row: MaintenanceReminder | undefined, mileage: number) {
  if (!row) return null;
  const remaining = row.last_mileage + row.interval_km - mileage;
  return {
    lastMileage: row.last_mileage,
    intervalKm: row.interval_km,
    remainingKm: remaining,
    message:
      remaining > 0
        ? `Следующее ТО примерно через ${remaining.toLocaleString('ru-RU')} км`
        : `ТО просрочено на ${Math.abs(remaining).toLocaleString('ru-RU')} км`,
  };
}

export function serializeVariant(row: VehicleVariant) {
  return {
    id: row.id,
    make: row.make,
    model: row.model,
    generation: row.generation,
    yearFrom: row.year_from,
    yearTo: row.year_to,
    engine: row.engine,
  };
}
