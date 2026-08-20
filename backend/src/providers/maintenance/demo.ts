import type { MaintenanceScheduleProvider } from '../types.js';
import type { MaintenanceSchedule, MaintenanceScheduleItem } from '../../types.js';

const DEMO_RULES = [
  { id: 'oil', name: 'Замена моторного масла', intervalKm: 10_000 },
  { id: 'oil-filter', name: 'Масляный фильтр', intervalKm: 10_000 },
  { id: 'air-filter', name: 'Воздушный фильтр', intervalKm: 20_000 },
  { id: 'cabin-filter', name: 'Салонный фильтр', intervalKm: 20_000 },
  { id: 'brakes', name: 'Проверка тормозных колодок', intervalKm: 30_000 },
  { id: 'brake-fluid', name: 'Тормозная жидкость', intervalKm: 40_000 },
  { id: 'spark', name: 'Свечи зажигания', intervalKm: 60_000 },
];

const DUE_WINDOW_KM = 2_000;

const DISCLAIMER =
  'Демо-регламент (масло, фильтры, тормоза), не официальная OEM-база производителя.';

export function createDemoMaintenanceScheduleProvider(): MaintenanceScheduleProvider {
  return {
    getSchedule(params): MaintenanceSchedule {
      const mileage = Math.max(0, Math.floor(params.mileage) || 0);
      const items: MaintenanceScheduleItem[] = DEMO_RULES.map((rule) => {
        const lastDueMileage = Math.floor(mileage / rule.intervalKm) * rule.intervalKm;
        const nextDueMileage = lastDueMileage + rule.intervalKm;
        const remainingKm = nextDueMileage - mileage;
        return {
          id: rule.id,
          name: rule.name,
          intervalKm: rule.intervalKm,
          lastDueMileage,
          nextDueMileage,
          remainingKm,
          due: remainingKm <= DUE_WINDOW_KM,
        };
      });

      const nearest = [...items].sort((a, b) => a.remainingKm - b.remainingKm)[0] ?? null;
      const recommendedOperations = items
        .filter((item) => item.due)
        .map((item) => ({
          name: item.name,
          reason:
            item.remainingKm <= 0
              ? `Срок по демо-регламенту (${item.intervalKm.toLocaleString('ru-RU')} км)`
              : `Ближайшая замена через ${item.remainingKm.toLocaleString('ru-RU')} км`,
        }));
      if (recommendedOperations.length === 0 && nearest) {
        recommendedOperations.push({
          name: nearest.name,
          reason: `Ближайший регламент через ${nearest.remainingKm.toLocaleString('ru-RU')} км`,
        });
      }

      return {
        source: 'demo',
        disclaimer: DISCLAIMER,
        items,
        nearestMilestone: nearest
          ? {
              name: nearest.name,
              dueMileage: nearest.nextDueMileage,
              remainingKm: nearest.remainingKm,
            }
          : null,
        recommendedOperations,
      };
    },
  };
}
