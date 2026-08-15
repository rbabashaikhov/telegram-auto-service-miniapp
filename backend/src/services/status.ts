import { AppError } from '../errors.js';
import {
  ALLOWED_STATUS_TRANSITIONS,
  type AppointmentStatus,
} from '../types.js';

export function assertStatusTransition(from: AppointmentStatus, to: AppointmentStatus): void {
  if (from === to) return;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(
      `Cannot transition appointment from ${from} to ${to}`,
      400,
      'INVALID_STATUS_TRANSITION',
      { from, to },
    );
  }
}

export const MAINTENANCE_SERVICE_CATEGORIES = new Set(['maintenance', 'oil']);

export function isMaintenanceService(category: string, name: string): boolean {
  if (MAINTENANCE_SERVICE_CATEGORIES.has(category)) return true;
  const lower = name.toLowerCase();
  return lower.includes('масло') || lower.includes('то') || lower === 'то';
}
