import type { AppointmentStatus } from '../types';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  booked: 'Записан',
  arrived: 'Автомобиль принят',
  diagnosing: 'Диагностика',
  waiting_approval: 'Требуется согласование',
  in_progress: 'В работе',
  completed: 'Готов',
  cancelled: 'Отменена',
  no_show: 'Не явился',
};

export const TIMELINE: AppointmentStatus[] = [
  'booked',
  'arrived',
  'diagnosing',
  'waiting_approval',
  'in_progress',
  'completed',
];

export function formatPrice(price: number, symbol = '₽'): string {
  return `${new Intl.NumberFormat('ru-RU').format(price)} ${symbol}`;
}

export function formatMileage(km: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(km)} км`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

export function formatDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export function formatDateFull(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${d} ${MONTHS[date.getMonth()]} ${y}`;
}

export function weekdayShort(weekday: number): string {
  return WEEKDAYS_SHORT[weekday] ?? '';
}

export function formatStatus(status: AppointmentStatus, fallback?: string): string {
  return STATUS_LABELS[status] ?? fallback ?? status;
}

export const SEVERITY_LABELS: Record<'critical' | 'recommendation' | 'ok', string> = {
  critical: 'Критично',
  recommendation: 'Рекомендация',
  ok: 'Без замечаний',
};
