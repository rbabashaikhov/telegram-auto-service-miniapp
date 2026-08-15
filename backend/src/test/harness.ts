import Database from 'better-sqlite3';
import { applySchema } from '../db/schema.js';
import { createLocalProviders } from '../providers/local/sqlite.js';
import type { Providers } from '../providers/types.js';
import { addDays, todayDateString } from '../services/slots.js';

export interface TestWorld {
  db: Database.Database;
  providers: Providers;
  oil: number;
  brakes: number;
  computer: number;
  alignment: number;
  alexey: number;
  dmitry: number;
  sergey: number;
  lift1: number;
  lift2: number;
  diagBay: number;
  alignmentStand: number;
  client: { id: number; telegramUserId: number };
  vehicleId: number;
  otherVehicleId: number;
  futureDate: string;
  tiguanPartId: number;
  otherPartId: number;
  user: { id: number; first_name: string; username: string };
}

export function createTestWorld(now = new Date('2026-08-15T09:00:00')): TestWorld {
  const db = new Database(':memory:');
  applySchema(db);
  const providers = createLocalProviders(db);

  const oil = providers.catalog.createService({
    name: 'Замена масла',
    category: 'maintenance',
    durationMinutes: 60,
    basePrice: 3500,
  });
  const brakes = providers.catalog.createService({
    name: 'Замена тормозных колодок',
    category: 'brakes',
    durationMinutes: 90,
    basePrice: 4500,
  });
  const computer = providers.catalog.createService({
    name: 'Компьютерная диагностика',
    category: 'diagnostics',
    durationMinutes: 60,
    basePrice: 2800,
  });
  const alignment = providers.catalog.createService({
    name: 'Развал-схождение',
    category: 'alignment',
    durationMinutes: 60,
    basePrice: 4000,
  });

  providers.catalog.setServiceRequirement(oil.id, 'lift');
  providers.catalog.setServiceRequirement(brakes.id, 'lift');
  providers.catalog.setServiceRequirement(computer.id, 'diagnostic_bay');
  providers.catalog.setServiceRequirement(alignment.id, 'alignment_stand');

  const alexey = providers.specialists.create({ name: 'Алексей Морозов', specialization: 'Механик' });
  const dmitry = providers.specialists.create({ name: 'Дмитрий Волков', specialization: 'Диагност' });
  const sergey = providers.specialists.create({ name: 'Сергей Новиков', specialization: 'Шиномонтаж' });
  providers.specialists.setServices(alexey.id, [oil.id, brakes.id]);
  providers.specialists.setServices(dmitry.id, [computer.id]);
  providers.specialists.setServices(sergey.id, [alignment.id]);

  const lift1 = providers.resources.create({ name: 'Подъёмник №1', type: 'lift' });
  const lift2 = providers.resources.create({ name: 'Подъёмник №2', type: 'lift' });
  const diagBay = providers.resources.create({ name: 'Диагностический пост', type: 'diagnostic_bay' });
  const alignmentStand = providers.resources.create({
    name: 'Стенд развал-схождения',
    type: 'alignment_stand',
  });

  for (const specialist of [alexey, dmitry, sergey]) {
    for (const weekday of [1, 2, 3, 4, 5, 6]) {
      providers.availability.upsertWorkingHours({
        specialistId: specialist.id,
        weekday,
        startTime: '09:00',
        endTime: '19:00',
        active: true,
      });
    }
  }

  const user = { id: 1001, first_name: 'Иван', username: 'ivan' };
  const client = providers.customers.upsert(user, { name: 'Иван Петров' });
  const tiguanVariant = providers.vehicles.createVariant({
    make: 'Volkswagen',
    model: 'Tiguan',
    yearFrom: 2016,
    yearTo: 2020,
    engine: '2.0 TSI',
  });
  const camryVariant = providers.vehicles.createVariant({
    make: 'Toyota',
    model: 'Camry',
    yearFrom: 2018,
    yearTo: 2023,
    engine: '2.5',
  });
  const vehicle = providers.vehicles.create({
    customerId: client.id,
    make: 'Volkswagen',
    model: 'Tiguan',
    year: 2019,
    engine: '2.0 TSI',
    mileage: 84200,
    isActive: true,
  });
  const otherVehicle = providers.vehicles.create({
    customerId: client.id,
    make: 'Toyota',
    model: 'Camry',
    year: 2021,
    engine: '2.5',
    mileage: 40000,
    isActive: false,
  });

  const tiguanPart = providers.parts.create({
    brand: 'TRW',
    name: 'Колодки тормозные передние',
    sku: 'GDB1956',
    category: 'brakes',
    price: 6400,
  });
  const otherPart = providers.parts.create({
    brand: 'Toyota',
    name: 'Фильтр масляный',
    sku: 'TY-OIL-1',
    category: 'filters',
    price: 1200,
  });
  providers.parts.addFitment(tiguanVariant.id, tiguanPart.id);
  providers.parts.addFitment(camryVariant.id, otherPart.id);

  const futureDate = addDays(todayDateString(now), 3);

  return {
    db,
    providers,
    oil: oil.id,
    brakes: brakes.id,
    computer: computer.id,
    alignment: alignment.id,
    alexey: alexey.id,
    dmitry: dmitry.id,
    sergey: sergey.id,
    lift1: lift1.id,
    lift2: lift2.id,
    diagBay: diagBay.id,
    alignmentStand: alignmentStand.id,
    client: { id: client.id, telegramUserId: user.id },
    vehicleId: vehicle.id,
    otherVehicleId: otherVehicle.id,
    futureDate,
    tiguanPartId: tiguanPart.id,
    otherPartId: otherPart.id,
    user,
  };
}
