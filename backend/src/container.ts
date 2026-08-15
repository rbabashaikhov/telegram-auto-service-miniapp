import { config } from './config.js';
import { db } from './db/schema.js';
import { logger } from './logger.js';
import { createCrmProviders } from './providers/crm/stub.js';
import { createLocalProviders } from './providers/local/sqlite.js';
import { createExternalPartsProvider } from './providers/parts/external.js';
import type { Providers } from './providers/types.js';

function composeProviders(): Providers {
  const data =
    config.dataMode === 'crm'
      ? (() => {
          logger.warn(
            'DATA_MODE=crm: using documented CRM provider stub. Partner API adapter is not implemented.',
          );
          return createCrmProviders();
        })()
      : (() => {
          logger.info('DATA_MODE=local: SQLite is the source of truth');
          return createLocalProviders(db);
        })();

  if (config.partsProvider === 'external') {
    logger.warn('PARTS_PROVIDER=external: using documented PartsProvider stub. TecDoc is not connected.');
    return { ...data, parts: createExternalPartsProvider() };
  }

  if (config.dataMode === 'crm') {
    return { ...data, parts: createLocalProviders(db).parts };
  }

  return data;
}

export const providers: Providers = composeProviders();
