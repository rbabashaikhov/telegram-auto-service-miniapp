import { AppError } from '../../errors.js';
import type { Providers } from '../types.js';

/**
 * CRM-backed providers replace local SQLite at the composition layer.
 * Application use cases depend only on `Providers` and never branch on DATA_MODE.
 */
export function createCrmProviders(): Providers {
  const notConfigured = (method: string): never => {
    throw new AppError(
      `CRM data mode is not configured. Implement providers.crm for ${method} against the partner API.`,
      501,
      'CRM_NOT_CONFIGURED',
      { method },
    );
  };

  const stub = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return undefined;
        return () => notConfigured(String(prop));
      },
    },
  );

  return {
    customers: stub as Providers['customers'],
    vehicles: stub as Providers['vehicles'],
    catalog: stub as Providers['catalog'],
    specialists: stub as Providers['specialists'],
    resources: stub as Providers['resources'],
    availability: stub as Providers['availability'],
    bookings: stub as Providers['bookings'],
    requests: stub as Providers['requests'],
    estimates: stub as Providers['estimates'],
    parts: stub as Providers['parts'],
    history: stub as Providers['history'],
    transaction<T>(fn: () => T): T {
      return fn();
    },
  };
}
