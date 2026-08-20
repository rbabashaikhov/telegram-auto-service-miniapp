import { AppError } from '../../errors.js';
import type { VinDecoderProvider } from '../types.js';

export function createExternalVinDecoderProvider(): VinDecoderProvider {
  const notConfigured = (method: string): never => {
    throw new AppError(
      'External VIN decoder is not configured. Connect the customer OEM / decoder API via VinDecoderProvider.',
      501,
      'VIN_NOT_CONFIGURED',
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
  ) as VinDecoderProvider;
}
