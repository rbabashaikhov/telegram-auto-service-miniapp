import { describe, expect, it } from 'vitest';
import { AppError } from '../errors.js';
import { createCrmProviders } from './crm/stub.js';
import { createExternalPartsProvider } from './parts/external.js';

describe('CRM provider stub', () => {
  it('returns 501 CRM_NOT_CONFIGURED without leaking DATA_MODE checks to callers', () => {
    const providers = createCrmProviders();
    try {
      providers.catalog.listServices();
      throw new Error('expected CRM stub to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(501);
      expect((error as AppError).code).toBe('CRM_NOT_CONFIGURED');
    }
  });
});

describe('external parts stub', () => {
  it('returns 501 PARTS_NOT_CONFIGURED', () => {
    const parts = createExternalPartsProvider();
    try {
      parts.searchParts();
      throw new Error('expected parts stub to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('PARTS_NOT_CONFIGURED');
    }
  });
});
