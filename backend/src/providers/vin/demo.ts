import type { VinDecoderProvider } from '../types.js';
import type { VinIdentification } from '../../types.js';

export const DEMO_VINS: Record<string, Omit<VinIdentification, 'vin' | 'source' | 'fallback' | 'message'>> = {
  WVGZZZ5NZKM012345: {
    make: 'Volkswagen',
    model: 'Tiguan',
    generation: 'II',
    year: 2019,
    engine: '2.0 TSI',
  },
  JT2BF22K3W0123456: {
    make: 'Toyota',
    model: 'Camry',
    year: 2021,
    generation: 'XV70',
    engine: '2.5',
  },
  KNADM4A37A6123456: {
    make: 'Kia',
    model: 'Rio',
    year: 2020,
    generation: 'IV',
    engine: '1.6',
  },
  WVWZZZ3CZJE123456: {
    make: 'Volkswagen',
    model: 'Polo',
    year: 2018,
    generation: 'V',
    engine: '1.6',
  },
};

const WMI_MAKE: Record<string, string> = {
  WVG: 'Volkswagen',
  WVW: 'Volkswagen',
  WV1: 'Volkswagen',
  WV2: 'Volkswagen',
  WAU: 'Audi',
  WBA: 'BMW',
  WDD: 'Mercedes-Benz',
  JTD: 'Toyota',
  JT2: 'Toyota',
  JT3: 'Toyota',
  KNA: 'Kia',
  KMH: 'Hyundai',
  TMB: 'Skoda',
  XTA: 'Lada',
  XWE: 'Lada',
  VF1: 'Renault',
  VF3: 'Peugeot',
  YV1: 'Volvo',
  ZFA: 'Fiat',
  '1HG': 'Honda',
  '1FA': 'Ford',
  '2HG': 'Honda',
};

const DEMO_FALLBACK_MESSAGE =
  'Демо-идентификация, не OEM-база. VIN не найден в демо-каталоге — показан fallback.';

function wmiMake(vin: string): string | null {
  const three = vin.slice(0, 3);
  if (WMI_MAKE[three]) return WMI_MAKE[three];
  if (WMI_MAKE[vin.slice(0, 2)]) return WMI_MAKE[vin.slice(0, 2)];
  return null;
}

export function createDemoVinDecoderProvider(): VinDecoderProvider {
  return {
    decode(vin: string): VinIdentification {
      const normalized = vin.trim().toUpperCase();
      const known = DEMO_VINS[normalized];
      if (known) {
        return {
          vin: normalized,
          ...known,
          source: 'demo',
          fallback: false,
          message: 'Демо-данные VIN. Это не подключение к OEM-базе производителя.',
        };
      }
      const make = wmiMake(normalized) ?? 'Demo';
      return {
        vin: normalized,
        make,
        model: make === 'Demo' ? 'Unknown' : 'Demo model',
        generation: null,
        year: 2018,
        engine: null,
        source: 'demo',
        fallback: true,
        message: DEMO_FALLBACK_MESSAGE,
      };
    },
  };
}
