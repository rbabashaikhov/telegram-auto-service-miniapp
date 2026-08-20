export interface AppConfig {
  businessName: string;
  businessType: string;
  businessVertical: string;
  appTitle: string;
  appDescription: string;
  timezone: string;
  demoMode: boolean;
  adminProtected: boolean;
  currency: string;
  currencySymbol: string;
  branding: { accent: string; logoUrl: string | null };
  booking: { slotStepMinutes: number };
  features: {
    repeatBooking: boolean;
    demoTour: boolean;
    demoAdminPreview: boolean;
  };
}

export type AppointmentStatus =
  | 'booked'
  | 'arrived'
  | 'diagnosing'
  | 'waiting_approval'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Vehicle {
  id: number;
  customerId: number;
  make: string;
  model: string;
  generation: string | null;
  year: number;
  engine: string | null;
  vin: string | null;
  licensePlate: string | null;
  mileage: number;
  isActive: boolean;
  title: string;
  subtitle: string;
}

export interface Service {
  id: number;
  name: string;
  category: string;
  description: string;
  durationMinutes: number;
  price: number;
  active: boolean;
  displayOrder: number;
}

export interface Specialist {
  id: number;
  name: string;
  specialization: string;
  description: string;
  active: boolean;
  displayOrder: number;
  serviceIds?: number[];
}

export interface Resource {
  id: number;
  name: string;
  type: string;
  active: boolean;
}

export interface SlotOption {
  time: string;
  specialistId: number;
  specialistName: string;
}

export interface DayAvailability {
  date: string;
  available: boolean;
  slots: SlotOption[];
}

export interface Appointment {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  price: number;
  status: AppointmentStatus;
  statusLabel: string;
  notes: string | null;
  service: { id: number; name: string; category: string; durationMinutes: number; price: number };
  specialist: { id: number; name: string };
  resource: { id: number; name: string | null; type: string | null } | null;
  customer: { id: number; telegramUserId: number | null; name: string; phone: string | null };
  vehicle: {
    id: number;
    make: string;
    model: string;
    year: number;
    engine: string | null;
    mileage: number;
    licensePlate: string | null;
    title: string;
  };
}

export interface EstimateItem {
  id: number;
  type: 'labor' | 'part';
  title: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  partId: number | null;
  approved: boolean;
}

export type InspectionSeverity = 'critical' | 'recommendation' | 'ok';

export interface InspectionItem {
  id: number;
  inspectionId: number;
  name: string;
  severity: InspectionSeverity;
  note: string | null;
}

export interface Estimate {
  id: number;
  appointmentId: number;
  status: 'draft' | 'awaiting_approval' | 'approved' | 'rejected';
  totalAmount: number;
  createdAt: string;
  approvedAt: string | null;
  items: EstimateItem[];
  inspection: { id: number; summary: string; notes: string | null; items: InspectionItem[] } | null;
}

export interface ServiceRequest {
  id: number;
  description: string;
  symptomCategory: string | null;
  desiredDate: string | null;
  status: string;
  appointmentId: number | null;
  createdAt: string;
  customer: { id: number; name: string; phone: string | null };
  vehicle: { id: number; make: string; model: string; year: number; engine: string | null; title: string };
}

export interface Part {
  id: number;
  brand: string;
  name: string;
  sku: string;
  oemCode: string | null;
  category: string;
  price: number;
  notes: string | null;
  active: boolean;
}

export interface HistoryVisit extends Appointment {
  estimateTotal: number | null;
  laborTitles: string[];
}

export interface Reminder {
  lastMileage: number;
  intervalKm: number;
  remainingKm: number;
  message: string;
}

export interface MaintenanceMilestone {
  name: string;
  dueMileage: number;
  remainingKm: number;
}

export interface MaintenanceSchedule {
  source: 'demo';
  disclaimer: string;
  items: Array<{
    id: string;
    name: string;
    intervalKm: number;
    lastDueMileage: number;
    nextDueMileage: number;
    remainingKm: number;
    due: boolean;
  }>;
  nearestMilestone: MaintenanceMilestone | null;
  recommendedOperations: Array<{ name: string; reason: string }>;
}

export interface VinIdentification {
  vin: string;
  make: string;
  model: string;
  generation: string | null;
  year: number | null;
  engine: string | null;
  source: 'demo';
  fallback: boolean;
  message: string | null;
}

export interface VehicleMaintenance {
  identification: VinIdentification;
  schedule: MaintenanceSchedule;
  completedWork: HistoryVisit[];
  inspectionRecommendations: Array<{
    appointmentId: number;
    name: string;
    severity: InspectionSeverity;
    note: string | null;
  }>;
}

export interface Portal {
  customer: { id: number; name: string; phone: string | null };
  vehicles: Vehicle[];
  activeVehicle: Vehicle | null;
  nextAppointment: Appointment | null;
  lastVisit: Appointment | null;
  reminder: Reminder | null;
  maintenance: MaintenanceSchedule | null;
  openEstimate: Estimate | null;
  pendingRequest: ServiceRequest | null;
}

export interface WorkingHours {
  id: number;
  specialistId: number;
  weekday: number;
  startTime: string;
  endTime: string;
  active: boolean;
}

export interface BlockedSlot {
  id: number;
  specialistId: number | null;
  resourceId: number | null;
  date: string;
  startTime: string;
  endTime: string;
  reason: string | null;
}

export interface Customer {
  id: number;
  telegramUserId: number | null;
  name: string;
  phone: string | null;
  username: string | null;
}

export interface RepeatContext {
  sourceAppointmentId: number;
  vehicleId: number;
  serviceId: number | null;
  specialistId: number | null;
  warnings: Array<{ code: string; message: string }>;
}
