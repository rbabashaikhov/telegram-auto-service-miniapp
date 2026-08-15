import { describe, expect, it } from 'vitest';
import { tourTargetSelector } from './targets';

describe('tour targets', () => {
  it('builds a data-demo-tour selector', () => {
    expect(tourTargetSelector('vehicle-card')).toBe('[data-demo-tour="vehicle-card"]');
  });
});
