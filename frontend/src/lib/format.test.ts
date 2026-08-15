import { describe, expect, it } from 'vitest';
import { formatMileage, formatPrice, formatStatus } from './format';

describe('format helpers', () => {
  it('formats money and mileage in ru-RU', () => {
    expect(formatPrice(8900)).toContain('8');
    expect(formatMileage(84200)).toContain('км');
  });

  it('uses customer-facing Russian status labels', () => {
    expect(formatStatus('waiting_approval')).toBe('Требуется согласование');
    expect(formatStatus('booked')).toBe('Записан');
  });
});
