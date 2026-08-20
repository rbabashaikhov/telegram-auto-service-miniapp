import { config } from './config.js';
import { db } from './db/schema.js';
import { logger } from './logger.js';
import { createCrmProviders } from './providers/crm/stub.js';
import { createLocalProviders } from './providers/local/sqlite.js';
import { createDemoMaintenanceScheduleProvider } from './providers/maintenance/demo.js';
import { createExternalMaintenanceScheduleProvider } from './providers/maintenance/external.js';
import { createExternalPartsProvider } from './providers/parts/external.js';
import type { MaintenanceScheduleProvider, Providers, VinDecoderProvider } from './providers/types.js';
import { createDemoVinDecoderProvider } from './providers/vin/demo.js';
import { createExternalVinDecoderProvider } from './providers/vin/external.js';

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

function composeVinDecoder(): VinDecoderProvider {
  if (config.vinProvider === 'external') {
    logger.warn('VIN_PROVIDER=external: OEM VIN decoder is not connected.');
    return createExternalVinDecoderProvider();
  }
  logger.info('VIN_PROVIDER=demo: using demo VIN catalog, not an OEM database');
  return createDemoVinDecoderProvider();
}

function composeMaintenanceSchedule(): MaintenanceScheduleProvider {
  if (config.maintenanceProvider === 'external') {
    logger.warn('MAINTENANCE_PROVIDER=external: OEM maintenance schedule is not connected.');
    return createExternalMaintenanceScheduleProvider();
  }
  logger.info('MAINTENANCE_PROVIDER=demo: using demo maintenance rules, not OEM data');
  return createDemoMaintenanceScheduleProvider();
}

export const providers: Providers = composeProviders();
export const vinDecoder: VinDecoderProvider = composeVinDecoder();
export const maintenanceSchedule: MaintenanceScheduleProvider = composeMaintenanceSchedule();
