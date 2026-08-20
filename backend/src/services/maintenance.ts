import { AppError } from '../errors.js';
import type { MaintenanceScheduleProvider, Providers, VinDecoderProvider } from '../providers/types.js';
import type { Vehicle, VinIdentification } from '../types.js';

export function decodeVin(decoder: VinDecoderProvider, vin: string): VinIdentification {
  const normalized = vin.trim().toUpperCase();
  if (!normalized) {
    throw new AppError('VIN is required', 400, 'VALIDATION_ERROR');
  }
  return decoder.decode(normalized);
}

export function identificationFromVehicle(vehicle: Vehicle): VinIdentification {
  return {
    vin: vehicle.vin ?? '',
    make: vehicle.make,
    model: vehicle.model,
    generation: vehicle.generation,
    year: vehicle.year,
    engine: vehicle.engine,
    source: 'demo',
    fallback: false,
    message: vehicle.vin ? null : 'Автомобиль сохранён без VIN. Регламент построен по марке и модели.',
  };
}

export function getVehicleMaintenance(
  providers: Providers,
  vinDecoder: VinDecoderProvider,
  scheduleProvider: MaintenanceScheduleProvider,
  vehicle: Vehicle,
) {
  const identification = vehicle.vin
    ? decodeVin(vinDecoder, vehicle.vin)
    : identificationFromVehicle(vehicle);

  const schedule = scheduleProvider.getSchedule({
    make: identification.make,
    model: identification.model,
    year: identification.year ?? vehicle.year,
    engine: identification.engine ?? vehicle.engine,
    mileage: vehicle.mileage,
  });

  const completedWork = providers.history.listCompletedVisits(vehicle.id);
  const inspectionRecommendations = providers.bookings
    .listByVehicle(vehicle.id)
    .flatMap((appointment) => {
      const inspection = providers.estimates.getInspection(appointment.id);
      if (!inspection) return [];
      return inspection.items
        .filter((item) => item.severity === 'critical' || item.severity === 'recommendation')
        .map((item) => ({
          appointmentId: appointment.id,
          name: item.name,
          severity: item.severity,
          note: item.note,
        }));
    });

  return {
    identification,
    schedule,
    completedWork,
    inspectionRecommendations,
  };
}
