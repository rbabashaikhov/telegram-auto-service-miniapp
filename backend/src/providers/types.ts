import type {
  Appointment,
  AppointmentStatus,
  AppointmentWithDetails,
  BlockedSlot,
  BusyInterval,
  Customer,
  Estimate,
  EstimateItem,
  EstimateItemType,
  EstimateStatus,
  EstimateWithDetails,
  HistoryVisit,
  Inspection,
  InspectionItem,
  InspectionSeverity,
  MaintenanceReminder,
  MaintenanceSchedule,
  VinIdentification,
  Part,
  Service,
  ServiceRequest,
  ServiceRequestStatus,
  ServiceRequestWithDetails,
  ServiceResourceRequirement,
  Specialist,
  TelegramUser,
  Resource,
  Vehicle,
  VehicleVariant,
  WorkingHours,
} from '../types.js';

export interface CustomerProvider {
  upsert(user: TelegramUser, extras?: { name?: string; phone?: string }): { id: number; created: boolean };
  getByTelegramUserId(telegramUserId: number): Customer | undefined;
  getById(id: number): Customer | undefined;
  listAll(): Customer[];
  update(id: number, patch: Partial<{ name: string; phone: string | null }>): Customer;
}

export interface VehicleProvider {
  listByCustomer(customerId: number): Vehicle[];
  getById(id: number): Vehicle | undefined;
  listAll(): Vehicle[];
  create(params: {
    customerId: number;
    make: string;
    model: string;
    generation?: string | null;
    year: number;
    engine?: string | null;
    vin?: string | null;
    licensePlate?: string | null;
    mileage: number;
    isActive?: boolean;
  }): Vehicle;
  update(
    id: number,
    patch: Partial<{
      make: string;
      model: string;
      generation: string | null;
      year: number;
      engine: string | null;
      vin: string | null;
      licensePlate: string | null;
      mileage: number;
      isActive: boolean;
    }>,
  ): Vehicle;
  setActive(customerId: number, vehicleId: number): Vehicle;
  listVariants(): VehicleVariant[];
  findMatchingVariants(vehicle: Pick<Vehicle, 'make' | 'model' | 'year' | 'engine'>): VehicleVariant[];
  createVariant(params: {
    make: string;
    model: string;
    generation?: string | null;
    yearFrom: number;
    yearTo: number;
    engine?: string | null;
  }): VehicleVariant;
}

export interface CatalogProvider {
  listServices(filters?: { category?: string; activeOnly?: boolean }): Service[];
  getService(id: number): Service | undefined;
  getActiveService(id: number): Service | undefined;
  createService(params: {
    name: string;
    category: string;
    description?: string;
    durationMinutes: number;
    basePrice: number;
    active?: boolean;
    displayOrder?: number;
  }): Service;
  updateService(
    id: number,
    patch: Partial<{
      name: string;
      category: string;
      description: string;
      durationMinutes: number;
      basePrice: number;
      active: boolean;
      displayOrder: number;
    }>,
  ): Service;
  getServiceRequirement(serviceId: number): ServiceResourceRequirement | undefined;
  setServiceRequirement(serviceId: number, resourceType: string, quantity?: number): void;
}

export interface SpecialistProvider {
  list(activeOnly?: boolean): Specialist[];
  listEligible(serviceId: number): Specialist[];
  getById(id: number): Specialist | undefined;
  getActiveById(id: number): Specialist | undefined;
  offersService(specialistId: number, serviceId: number): boolean;
  listServiceIds(specialistId: number): number[];
  setServices(specialistId: number, serviceIds: number[]): void;
  create(params: {
    name: string;
    specialization?: string;
    description?: string;
    active?: boolean;
    displayOrder?: number;
  }): Specialist;
  update(
    id: number,
    patch: Partial<{
      name: string;
      specialization: string;
      description: string;
      active: boolean;
      displayOrder: number;
    }>,
  ): Specialist;
}

export interface ResourceProvider {
  list(filters?: { type?: string; activeOnly?: boolean }): Resource[];
  getById(id: number): Resource | undefined;
  create(params: { name: string; type: string; active?: boolean }): Resource;
  update(id: number, patch: Partial<{ name: string; type: string; active: boolean }>): Resource;
}

export interface AvailabilityProvider {
  listWorkingHours(specialistId?: number): WorkingHours[];
  getWorkingHours(specialistId: number, weekday: number): WorkingHours | null;
  upsertWorkingHours(params: {
    specialistId: number;
    weekday: number;
    startTime: string;
    endTime: string;
    active: boolean;
  }): WorkingHours;
  listBlockedSlots(filters?: {
    specialistId?: number;
    resourceId?: number;
    date?: string;
  }): BlockedSlot[];
  listSpecialistBusy(date: string, specialistId: number): BusyInterval[];
  listResourceBusy(date: string, resourceId: number): BusyInterval[];
  createBlockedSlot(params: {
    specialistId?: number | null;
    resourceId?: number | null;
    date: string;
    startTime: string;
    endTime: string;
    reason?: string | null;
  }): BlockedSlot;
  deleteBlockedSlot(id: number): boolean;
}

export interface BookingProvider {
  getById(id: number): AppointmentWithDetails | undefined;
  listByCustomer(
    customerId: number,
    options?: { includePast?: boolean; today?: string; nowTime?: string },
  ): AppointmentWithDetails[];
  listByVehicle(vehicleId: number, status?: AppointmentStatus): AppointmentWithDetails[];
  listCompletedByVehicle(vehicleId: number): AppointmentWithDetails[];
  listLastCompleted(customerId: number, vehicleId?: number): AppointmentWithDetails | undefined;
  listUpcoming(customerId: number, vehicleId?: number, today?: string, nowTime?: string): AppointmentWithDetails | undefined;
  listAdmin(filters?: {
    status?: AppointmentStatus;
    specialistId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): AppointmentWithDetails[];
  insert(params: {
    customerId: number;
    vehicleId: number;
    serviceId: number;
    specialistId: number;
    resourceId: number | null;
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    price: number;
    source?: string;
    notes?: string | null;
    sourceAppointmentId?: number | null;
    serviceRequestId?: number | null;
    status?: AppointmentStatus;
  }): AppointmentWithDetails;
  updateSchedule(params: {
    id: number;
    specialistId: number;
    resourceId: number | null;
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
  }): AppointmentWithDetails;
  updateStatus(id: number, status: AppointmentStatus): AppointmentWithDetails;
  updateAssignment(id: number, specialistId: number, resourceId: number | null): AppointmentWithDetails;
}

export interface ServiceRequestProvider {
  create(params: {
    customerId: number;
    vehicleId: number;
    description: string;
    symptomCategory?: string | null;
    desiredDate?: string | null;
  }): ServiceRequestWithDetails;
  getById(id: number): ServiceRequestWithDetails | undefined;
  listByCustomer(customerId: number): ServiceRequestWithDetails[];
  listAdmin(status?: ServiceRequestStatus): ServiceRequestWithDetails[];
  updateStatus(
    id: number,
    status: ServiceRequestStatus,
    appointmentId?: number | null,
  ): ServiceRequestWithDetails;
}

export interface EstimateProvider {
  getInspection(appointmentId: number): Inspection | undefined;
  upsertInspection(params: { appointmentId: number; summary: string; notes?: string | null }): Inspection;
  addInspectionItem(params: {
    inspectionId: number;
    name: string;
    severity: InspectionSeverity;
    note?: string | null;
  }): InspectionItem;
  listInspectionItems(inspectionId: number): InspectionItem[];
  getByAppointment(appointmentId: number): EstimateWithDetails | undefined;
  getById(id: number): EstimateWithDetails | undefined;
  listAdmin(status?: EstimateStatus): EstimateWithDetails[];
  create(appointmentId: number): EstimateWithDetails;
  addItem(params: {
    estimateId: number;
    type: EstimateItemType;
    title: string;
    qty: number;
    unitPrice: number;
    partId?: number | null;
  }): EstimateItem;
  removeItem(itemId: number): boolean;
  setItemsApproved(estimateId: number, itemIds: number[]): EstimateWithDetails;
  recalcTotal(estimateId: number): EstimateWithDetails;
  updateStatus(id: number, status: EstimateStatus, approvedAt?: string | null): EstimateWithDetails;
}

export interface VinDecoderProvider {
  decode(vin: string): VinIdentification;
}

export interface MaintenanceScheduleProvider {
  getSchedule(params: {
    make: string;
    model: string;
    year?: number | null;
    engine?: string | null;
    mileage: number;
  }): MaintenanceSchedule;
}

export interface PartsProvider {
  searchParts(query?: string, category?: string): Part[];
  getCompatibleParts(
    vehicle: Pick<Vehicle, 'make' | 'model' | 'year' | 'engine'>,
    filters?: { query?: string; category?: string },
  ): Part[];
  getPart(id: number): Part | undefined;
  getPrice(id: number): number | undefined;
  getAvailability?(id: number): { available: boolean; qty?: number };
  create(params: {
    brand: string;
    name: string;
    sku: string;
    oemCode?: string | null;
    category: string;
    price: number;
    notes?: string | null;
    active?: boolean;
  }): Part;
  update(
    id: number,
    patch: Partial<{
      brand: string;
      name: string;
      sku: string;
      oemCode: string | null;
      category: string;
      price: number;
      notes: string | null;
      active: boolean;
    }>,
  ): Part;
  listFitments(partId?: number): Array<{ variantId: number; partId: number }>;
  addFitment(variantId: number, partId: number): void;
  isCompatible(partId: number, vehicle: Pick<Vehicle, 'make' | 'model' | 'year' | 'engine'>): boolean;
}

export interface HistoryProvider {
  listCompletedVisits(vehicleId: number): HistoryVisit[];
  getReminder(vehicleId: number): MaintenanceReminder | undefined;
  upsertReminder(params: {
    vehicleId: number;
    serviceId: number;
    lastMileage: number;
    intervalKm: number;
    lastCompletedAt: string;
  }): MaintenanceReminder;
}

export interface Providers {
  customers: CustomerProvider;
  vehicles: VehicleProvider;
  catalog: CatalogProvider;
  specialists: SpecialistProvider;
  resources: ResourceProvider;
  availability: AvailabilityProvider;
  bookings: BookingProvider;
  requests: ServiceRequestProvider;
  estimates: EstimateProvider;
  parts: PartsProvider;
  history: HistoryProvider;
  transaction<T>(fn: () => T): T;
}
