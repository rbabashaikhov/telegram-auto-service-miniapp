import type {
  Appointment,
  AppConfig,
  BlockedSlot,
  Customer,
  DayAvailability,
  Estimate,
  HistoryVisit,
  Part,
  Portal,
  RepeatContext,
  Resource,
  Service,
  ServiceRequest,
  SlotOption,
  Specialist,
  Vehicle,
  WorkingHours,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

let initData = '';
let adminToken = '';

if (typeof sessionStorage !== 'undefined') {
  adminToken = sessionStorage.getItem('admin_token') || '';
}

export function setTelegramInitData(value: string): void {
  initData = value;
}

export function setAdminToken(value: string): void {
  adminToken = value;
  if (typeof sessionStorage !== 'undefined') {
    if (value) sessionStorage.setItem('admin_token', value);
    else sessionStorage.removeItem('admin_token');
  }
}

export function getAdminToken(): string {
  return adminToken;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (initData) headers.set('x-telegram-init-data', initData);
  if (adminToken && path.startsWith('/api/admin')) headers.set('x-admin-token', adminToken);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.error || `Request failed (${response.status})`, response.status);
  }
  return payload as T;
}

export const api = {
  getConfig: () => request<{ data: AppConfig }>('/api/config'),
  getPortal: () => request<{ data: Portal }>('/api/me/portal'),
  getVehicles: () => request<{ data: Vehicle[] }>('/api/vehicles'),
  createVehicle: (body: Partial<Vehicle> & { make: string; model: string; year: number; mileage: number }) =>
    request<{ data: Vehicle }>('/api/vehicles', { method: 'POST', body: JSON.stringify(body) }),
  updateVehicle: (id: number, body: Partial<Vehicle>) =>
    request<{ data: Vehicle }>(`/api/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  activateVehicle: (id: number) =>
    request<{ data: Vehicle }>(`/api/vehicles/${id}/activate`, { method: 'POST' }),
  getServices: (category?: string) =>
    request<{ data: Service[] }>(category ? `/api/services?category=${category}` : '/api/services'),
  getSpecialists: (serviceId?: number) =>
    request<{ data: Specialist[] }>(
      serviceId ? `/api/specialists?serviceId=${serviceId}` : '/api/specialists',
    ),
  getAvailability: (serviceId: number, specialistId?: number | null, days = 14) => {
    const params = new URLSearchParams({ serviceId: String(serviceId), days: String(days) });
    if (specialistId) params.set('specialistId', String(specialistId));
    return request<{ data: { durationMinutes: number; price: number; calendar: DayAvailability[] } }>(
      `/api/availability?${params.toString()}`,
    );
  },
  getSlots: (serviceId: number, date: string, specialistId?: number | null) => {
    const params = new URLSearchParams({ serviceId: String(serviceId), date });
    if (specialistId) params.set('specialistId', String(specialistId));
    return request<{
      data: { durationMinutes: number; price: number; availableSlots: string[]; slots: SlotOption[] };
    }>(`/api/availability?${params.toString()}`);
  },
  createAppointment: (body: {
    vehicleId: number;
    serviceId: number;
    specialistId?: number | null;
    date: string;
    startTime: string;
    sourceAppointmentId?: number | null;
  }) => request<{ data: Appointment }>('/api/appointments', { method: 'POST', body: JSON.stringify(body) }),
  getMyAppointments: () => request<{ data: Appointment[] }>('/api/appointments/me'),
  getAppointment: (id: number) =>
    request<{ data: { appointment: Appointment; estimate: Estimate | null } }>(`/api/appointments/${id}`),
  getRepeatContext: (id: number) => request<{ data: RepeatContext }>(`/api/appointments/${id}/repeat-context`),
  cancelAppointment: (id: number) =>
    request<{ data: Appointment }>(`/api/appointments/${id}/cancel`, { method: 'PATCH' }),
  decideEstimate: (appointmentId: number, decision: 'approved' | 'rejected') =>
    request<{ data: Estimate }>(`/api/appointments/${appointmentId}/estimate/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }),
  createServiceRequest: (body: {
    vehicleId: number;
    description: string;
    symptomCategory?: string | null;
    desiredDate?: string | null;
  }) => request<{ data: ServiceRequest }>('/api/service-requests', { method: 'POST', body: JSON.stringify(body) }),
  getHistory: (vehicleId?: number) =>
    request<{ data: HistoryVisit[] }>(vehicleId ? `/api/me/history?vehicleId=${vehicleId}` : '/api/me/history'),
  getAdmin: (path: string) => request<{ data: unknown }>(`/api/admin${path}`),
  adminPatch: (path: string, body: unknown) =>
    request<{ data: unknown }>(`/api/admin${path}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminPost: (path: string, body?: unknown) =>
    request<{ data: unknown }>(`/api/admin${path}`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  adminPut: (path: string, body: unknown) =>
    request<{ data: unknown }>(`/api/admin${path}`, { method: 'PUT', body: JSON.stringify(body) }),
  adminDelete: (path: string) => request<void>(`/api/admin${path}`, { method: 'DELETE' }),
  getDemoAdmin: (path: string) => request<{ data: unknown }>(`/api/demo-admin${path}`),
  getAdminAppointments: () => request<{ data: Appointment[] }>('/api/admin/appointments'),
  getAdminRequests: () => request<{ data: ServiceRequest[] }>('/api/admin/service-requests'),
  getAdminCustomers: () => request<{ data: Customer[] }>('/api/admin/customers'),
  getAdminVehicles: () => request<{ data: Vehicle[] }>('/api/admin/vehicles'),
  getAdminServices: () => request<{ data: Service[] }>('/api/admin/services'),
  getAdminSpecialists: () => request<{ data: Specialist[] }>('/api/admin/specialists'),
  getAdminResources: () => request<{ data: Resource[] }>('/api/admin/resources'),
  getAdminHours: () => request<{ data: WorkingHours[] }>('/api/admin/working-hours'),
  getAdminBlocked: () => request<{ data: BlockedSlot[] }>('/api/admin/blocked-slots'),
  getAdminParts: (vehicleId?: number) =>
    request<{ data: Part[] }>(vehicleId ? `/api/admin/parts?vehicleId=${vehicleId}` : '/api/admin/parts'),
  getAdminEstimates: () => request<{ data: Estimate[] }>('/api/admin/estimates'),
  getDemoAdminAppointments: () => request<{ data: Appointment[] }>('/api/demo-admin/appointments'),
  getDemoAdminRequests: () => request<{ data: ServiceRequest[] }>('/api/demo-admin/service-requests'),
  getDemoAdminServices: () => request<{ data: Service[] }>('/api/demo-admin/services'),
  getDemoAdminSpecialists: () => request<{ data: Specialist[] }>('/api/demo-admin/specialists'),
  getDemoAdminResources: () => request<{ data: Resource[] }>('/api/demo-admin/resources'),
  getDemoAdminEstimates: () => request<{ data: Estimate[] }>('/api/demo-admin/estimates'),
  getDemoAdminParts: () => request<{ data: Part[] }>('/api/demo-admin/parts'),
};
