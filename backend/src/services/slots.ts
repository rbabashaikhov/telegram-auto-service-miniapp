import type { BusyInterval, WorkingHours } from '../types.js';

export const DEFAULT_SLOT_STEP_MINUTES = 30;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

export function getWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function todayDateString(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function currentTimeString(now = new Date()): string {
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return todayDateString(date);
}

export function intervalBusy(start: number, end: number, busyIntervals: BusyInterval[]): boolean {
  return busyIntervals.some((interval) =>
    rangesOverlap(start, end, timeToMinutes(interval.start_time), timeToMinutes(interval.end_time)),
  );
}

export function calculateAvailableSlots(params: {
  date: string;
  durationMinutes: number;
  workingHours: WorkingHours | null;
  busyIntervals: BusyInterval[];
  now?: Date;
  stepMinutes?: number;
}): string[] {
  const {
    date,
    durationMinutes,
    workingHours,
    busyIntervals,
    now = new Date(),
    stepMinutes = DEFAULT_SLOT_STEP_MINUTES,
  } = params;

  if (!workingHours || !workingHours.active) {
    return [];
  }

  const workStart = timeToMinutes(workingHours.start_time);
  const workEnd = timeToMinutes(workingHours.end_time);
  if (workEnd - workStart < durationMinutes) {
    return [];
  }

  const today = todayDateString(now);
  const nowMinutes = timeToMinutes(currentTimeString(now));
  const slots: string[] = [];

  for (let start = workStart; start + durationMinutes <= workEnd; start += stepMinutes) {
    const end = start + durationMinutes;
    if (date < today) continue;
    if (date === today && start <= nowMinutes) continue;
    if (!intervalBusy(start, end, busyIntervals)) {
      slots.push(minutesToTime(start));
    }
  }

  return slots;
}
