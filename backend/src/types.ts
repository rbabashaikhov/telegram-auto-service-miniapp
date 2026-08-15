export type AppointmentStatus =
  | 'booked'
  | 'arrived'
  | 'diagnosing'
  | 'waiting_approval'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ServiceRequestStatus =
  | 'new'
  | 'reviewing'
  | 'scheduled'
  | 'converted'
  | 'closed'
  | 'cancelled';

export type EstimateStatus = 'draft' | 'awaiting_approval' | 'approved' | 'rejected';
export type EstimateItemType = 'labor' | 'part';
export type ResourceType = 'lift' | 'diagnostic_bay' | 'tire_bay' | 'alignment_stand' | 'general_bay';
export type DataMode = 'local' | 'crm';
export type PartsProviderName = 'local' | 'external';

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
}

export interface AuthContext {
  telegramUser: TelegramUser;
  isDemo: boolean;
}

export interface Customer {
  id: number;
  telegram_user_id: number | null;
  name: string;
  phone: string | null;
  username: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: number;
  customer_id: number;
  make: string;
  model: string;
  generation: string | null;
  year: number;
  engine: string | null;
  vin: string | null;
  license_plate: string | null;
  mileage: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleVariant {
  id: number;
  make: string;
  model: string;
  generation: string | null;
  year_from: number;
  year_to: number;
  engine: string | null;
}

export interface Service {
  id: number;
  name: string;
  category: string;
  description: string;
  duration_minutes: number;
  base_price: number;
  active: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Specialist {
  id: number;
  name: string;
  specialization: string;
  description: string;
  active: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: number;
  name: string;
  type: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceResourceRequirement {
  service_id: number;
  resource_type: string;
  quantity: number;
}

export interface Appointment {
  id: number;
  customer_id: number;
  vehicle_id: number;
  service_id: number;
  specialist_id: number;
  resource_id: number | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  price: number;
  status: AppointmentStatus;
  source: string;
  notes: string | null;
  source_appointment_id: number | null;
  service_request_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithDetails extends Appointment {
  service_name: string;
  service_category: string;
  service_duration_minutes: number;
  service_price: number;
  specialist_name: string;
  resource_name: string | null;
  resource_type: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_telegram_user_id: number | null;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_engine: string | null;
  vehicle_mileage: number;
  vehicle_license_plate: string | null;
}

export interface WorkingHours {
  id: number;
  specialist_id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  active: number;
}

export interface BlockedSlot {
  id: number;
  specialist_id: number | null;
  resource_id: number | null;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
}

export interface BusyInterval {
  start_time: string;
  end_time: string;
  resource_id?: number | null;
  specialist_id?: number | null;
}

export interface ServiceRequest {
  id: number;
  customer_id: number;
  vehicle_id: number;
  description: string;
  symptom_category: string | null;
  desired_date: string | null;
  status: ServiceRequestStatus;
  appointment_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestWithDetails extends ServiceRequest {
  customer_name: string;
  customer_phone: string | null;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_engine: string | null;
}

export interface Inspection {
  id: number;
  appointment_id: number;
  summary: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Estimate {
  id: number;
  appointment_id: number;
  status: EstimateStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

export interface EstimateItem {
  id: number;
  estimate_id: number;
  type: EstimateItemType;
  title: string;
  qty: number;
  unit_price: number;
  total_price: number;
  part_id: number | null;
}

export interface EstimateWithDetails extends Estimate {
  items: EstimateItem[];
  inspection: Inspection | null;
}

export interface Part {
  id: number;
  brand: string;
  name: string;
  sku: string;
  oem_code: string | null;
  category: string;
  price: number;
  notes: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface VehiclePartFitment {
  id: number;
  variant_id: number;
  part_id: number;
}

export interface MaintenanceReminder {
  id: number;
  vehicle_id: number;
  service_id: number;
  last_mileage: number;
  interval_km: number;
  last_completed_at: string;
}

export interface SlotOption {
  time: string;
  specialistId: number;
  specialistName: string;
}

export interface HistoryVisit {
  appointment: AppointmentWithDetails;
  estimateTotal: number | null;
  laborTitles: string[];
}

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'booked',
  'arrived',
  'diagnosing',
  'waiting_approval',
  'in_progress',
];

export const TERMINAL_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'completed',
  'cancelled',
  'no_show',
];

export const CUSTOMER_STATUS_LABELS: Record<AppointmentStatus, string> = {
  booked: 'Записан',
  arrived: 'Автомобиль принят',
  diagnosing: 'Диагностика',
  waiting_approval: 'Требуется согласование',
  in_progress: 'В работе',
  completed: 'Готов',
  cancelled: 'Отменена',
  no_show: 'Не явился',
};

export const ALLOWED_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ['arrived', 'cancelled', 'no_show'],
  arrived: ['diagnosing', 'cancelled'],
  diagnosing: ['waiting_approval', 'in_progress', 'cancelled'],
  waiting_approval: ['in_progress', 'diagnosing', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};
