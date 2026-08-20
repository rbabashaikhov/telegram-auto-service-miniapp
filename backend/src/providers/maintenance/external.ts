import { AppError } from '../../errors.js';
import type { MaintenanceScheduleProvider } from '../types.js';

export function createExternalMaintenanceScheduleProvider(): MaintenanceScheduleProvider {
  const notConfigured = (method: string): never => {
    throw new AppError(
      'External maintenance schedule is not configured. Connect OEM / CRM maintenance data via MaintenanceScheduleProvider.',
      501,
      'MAINTENANCE_NOT_CONFIGURED',
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
  ) as MaintenanceScheduleProvider;
}
