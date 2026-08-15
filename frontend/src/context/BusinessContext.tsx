import { createContext, useContext } from 'react';
import type { AppConfig } from '../types';

export const DEFAULT_APP_CONFIG: AppConfig = {
  businessName: 'Норд Авто',
  businessType: 'workshop',
  businessVertical: 'autoservice',
  appTitle: 'Норд Авто',
  appDescription: 'Клиентский портал автосервиса: автомобиль, запись, диагностика и согласование работ.',
  timezone: 'Europe/Moscow',
  demoMode: true,
  adminProtected: false,
  currency: 'RUB',
  currencySymbol: '₽',
  branding: { accent: '#2f6f8f', logoUrl: null },
  booking: { slotStepMinutes: 30 },
  features: { repeatBooking: true, demoTour: true, demoAdminPreview: true },
};

export const BusinessContext = createContext<AppConfig>(DEFAULT_APP_CONFIG);

export function useBusiness(): AppConfig {
  return useContext(BusinessContext);
}
