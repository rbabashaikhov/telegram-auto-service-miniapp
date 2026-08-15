import { AppError } from '../../errors.js';
import type { PartsProvider } from '../types.js';

/**
 * External parts catalog stub. Real TecDoc / supplier / 1C adapters are out of MVP scope.
 */
export function createExternalPartsProvider(): PartsProvider {
  const notConfigured = (method: string): never => {
    throw new AppError(
      `External parts provider is not configured. Implement PartsProvider.${method} against TecDoc, supplier API or ERP.`,
      501,
      'PARTS_NOT_CONFIGURED',
      { method },
    );
  };

  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return undefined;
        return () => notConfigured(String(prop));
      },
    },
  ) as PartsProvider;
}
