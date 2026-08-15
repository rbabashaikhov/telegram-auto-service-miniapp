function boolEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

function numberEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
const allowDemoMode =
  process.env.ALLOW_DEMO_MODE === 'true' ||
  nodeEnv !== 'production' ||
  !telegramBotToken;

export type DataModeName = 'local' | 'crm';
export type PartsProviderName = 'local' | 'external';

function dataModeName(value: string | undefined): DataModeName {
  if (value === 'crm' || value === 'local') return value;
  return 'local';
}

function partsProviderName(value: string | undefined): PartsProviderName {
  if (value === 'external' || value === 'local') return value;
  return 'local';
}

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.API_PORT || process.env.PORT || 3000),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  databasePath: process.env.DATABASE_PATH || '',
  publicDir: process.env.PUBLIC_DIR || '',
  telegramBotToken,
  allowDemoMode,
  timezone: process.env.TZ || 'Europe/Moscow',
  dataMode: dataModeName(process.env.DATA_MODE),
  partsProvider: partsProviderName(process.env.PARTS_PROVIDER),
  business: {
    name: process.env.BUSINESS_NAME || 'Норд Авто',
    vertical: process.env.BUSINESS_VERTICAL || 'autoservice',
    type: process.env.BUSINESS_TYPE || 'workshop',
    title: process.env.APP_TITLE || 'Норд Авто',
    description:
      process.env.APP_DESCRIPTION ||
      'Клиентский портал автосервиса: автомобиль, запись, диагностика и согласование работ.',
    currency: process.env.CURRENCY || 'RUB',
    currencySymbol: process.env.CURRENCY_SYMBOL || '₽',
    brandAccent: process.env.BRAND_ACCENT || '#2f6f8f',
    logoUrl: process.env.BRAND_LOGO_URL || '',
  },
  booking: {
    slotStepMinutes: numberEnv(process.env.SLOT_STEP_MINUTES, 30),
  },
  maintenance: {
    oilIntervalKm: numberEnv(process.env.OIL_INTERVAL_KM, 10_000),
  },
  features: {
    repeatBooking: boolEnv(process.env.FEATURE_REPEAT_BOOKING, true),
    demoTour: boolEnv(process.env.FEATURE_DEMO_TOUR, true),
    demoAdminPreview: boolEnv(process.env.FEATURE_DEMO_ADMIN_PREVIEW, true),
  },
  admin: {
    token: (process.env.ADMIN_TOKEN || '').trim(),
  },
  rateLimit: {
    windowMs: numberEnv(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: numberEnv(process.env.RATE_LIMIT_MAX, 20),
  },
};

export function publicAppConfig() {
  return {
    businessName: config.business.name,
    businessType: config.business.type,
    businessVertical: config.business.vertical,
    appTitle: config.business.title,
    appDescription: config.business.description,
    timezone: config.timezone,
    demoMode: config.allowDemoMode,
    adminProtected: config.isProduction || Boolean(config.admin.token),
    currency: config.business.currency,
    currencySymbol: config.business.currencySymbol,
    branding: {
      accent: config.business.brandAccent,
      logoUrl: config.business.logoUrl || null,
    },
    booking: {
      slotStepMinutes: config.booking.slotStepMinutes,
    },
    features: {
      repeatBooking: config.features.repeatBooking,
      demoTour: config.features.demoTour,
      demoAdminPreview: config.features.demoAdminPreview,
    },
  };
}

export function isDemoAdminPreviewEnabled(
  cfg: {
    allowDemoMode: boolean;
    features: { demoAdminPreview: boolean };
  } = config,
): boolean {
  return cfg.allowDemoMode && cfg.features.demoAdminPreview;
}
