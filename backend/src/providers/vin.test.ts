import { describe, expect, it } from 'vitest';
import { AppError } from '../errors.js';
import { createDemoMaintenanceScheduleProvider } from './maintenance/demo.js';
import { createExternalMaintenanceScheduleProvider } from './maintenance/external.js';
import { createDemoVinDecoderProvider, DEMO_VINS } from './vin/demo.js';
import { createExternalVinDecoderProvider } from './vin/external.js';
import { decodeVin } from '../services/maintenance.js';

describe('VIN decoder', () => {
  it('maps the seed demo VIN to Tiguan', () => {
    const decoder = createDemoVinDecoderProvider();
    const identified = decoder.decode('WVGZZZ5NZKM012345');
    expect(identified.make).toBe('Volkswagen');
    expect(identified.model).toBe('Tiguan');
    expect(identified.year).toBe(2019);
    expect(identified.fallback).toBe(false);
    expect(identified.source).toBe('demo');
    expect(Object.keys(DEMO_VINS)).toContain('WVGZZZ5NZKM012345');
  });

  it('returns a documented demo fallback for an unknown VIN', () => {
    const decoder = createDemoVinDecoderProvider();
    const identified = decodeVin(decoder, 'WAUZZZ8V5KA123456');
    expect(identified.make).toBe('Audi');
    expect(identified.fallback).toBe(true);
    expect(identified.message).toMatch(/демо/i);
  });

  it('external VIN provider returns VIN_NOT_CONFIGURED', () => {
    const decoder = createExternalVinDecoderProvider();
    try {
      decoder.decode('WVGZZZ5NZKM012345');
      throw new Error('expected VIN stub to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(501);
      expect((error as AppError).code).toBe('VIN_NOT_CONFIGURED');
    }
  });
});

describe('maintenance schedule', () => {
  it('returns demo intervals, nearest milestone and recommended ops', () => {
    const provider = createDemoMaintenanceScheduleProvider();
    const schedule = provider.getSchedule({
      make: 'Volkswagen',
      model: 'Tiguan',
      year: 2019,
      engine: '2.0 TSI',
      mileage: 84200,
    });
    expect(schedule.source).toBe('demo');
    expect(schedule.items.length).toBeGreaterThan(3);
    expect(schedule.nearestMilestone).not.toBeNull();
    expect(schedule.nearestMilestone?.dueMileage).toBeGreaterThan(84200);
    expect(schedule.disclaimer).toMatch(/демо/i);
  });

  it('still returns a schedule for unknown/fallback vehicle data', () => {
    const provider = createDemoMaintenanceScheduleProvider();
    const schedule = provider.getSchedule({
      make: 'Demo',
      model: 'Unknown',
      year: 2018,
      mileage: 0,
    });
    expect(schedule.items[0]?.nextDueMileage).toBe(schedule.items[0]?.intervalKm);
    expect(schedule.recommendedOperations.length).toBeGreaterThan(0);
  });

  it('external maintenance provider returns MAINTENANCE_NOT_CONFIGURED', () => {
    const provider = createExternalMaintenanceScheduleProvider();
    try {
      provider.getSchedule({ make: 'VW', model: 'Tiguan', mileage: 1000 });
      throw new Error('expected maintenance stub to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('MAINTENANCE_NOT_CONFIGURED');
    }
  });
});
