import type Database from 'better-sqlite3';
import { createLocalProviders } from '../providers/local/sqlite.js';
import { addDays, todayDateString } from '../services/slots.js';

const DEMO_TELEGRAM_USER_ID = 999000001;

function nextWeekday(from: Date, weekday: number): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const current = date.getDay();
  let delta = (weekday - current + 7) % 7;
  if (delta === 0) delta = 7;
  date.setDate(date.getDate() + delta);
  return todayDateString(date);
}

export function seed(database: Database.Database, now = new Date('2026-08-15T09:00:00')): void {
  const existing = (
    database.prepare('SELECT COUNT(*) AS count FROM services').get() as { count: number }
  ).count;
  if (existing > 0) return;

  const p = createLocalProviders(database);

  const oil = p.catalog.createService({
    name: 'Замена масла',
    category: 'maintenance',
    description: 'Замена моторного масла и масляного фильтра.',
    durationMinutes: 60,
    basePrice: 3500,
    displayOrder: 1,
  });
  const to = p.catalog.createService({
    name: 'ТО',
    category: 'maintenance',
    description: 'Плановое техническое обслуживание по регламенту.',
    durationMinutes: 120,
    basePrice: 8900,
    displayOrder: 2,
  });
  const suspension = p.catalog.createService({
    name: 'Диагностика подвески',
    category: 'diagnostics',
    description: 'Проверка ходовой части на подъёмнике.',
    durationMinutes: 60,
    basePrice: 2500,
    displayOrder: 3,
  });
  const brakes = p.catalog.createService({
    name: 'Замена тормозных колодок',
    category: 'brakes',
    description: 'Замена колодок с контролем дисков и тормозной жидкости.',
    durationMinutes: 90,
    basePrice: 4500,
    displayOrder: 4,
  });
  const computer = p.catalog.createService({
    name: 'Компьютерная диагностика',
    category: 'diagnostics',
    description: 'Считывание ошибок, проверка электронных систем.',
    durationMinutes: 45,
    basePrice: 2800,
    displayOrder: 5,
  });
  const tires = p.catalog.createService({
    name: 'Шиномонтаж',
    category: 'tires',
    description: 'Снятие, монтаж, балансировка комплекта колёс.',
    durationMinutes: 60,
    basePrice: 3200,
    displayOrder: 6,
  });
  const alignment = p.catalog.createService({
    name: 'Развал-схождение',
    category: 'alignment',
    description: 'Регулировка углов установки колёс.',
    durationMinutes: 60,
    basePrice: 4000,
    displayOrder: 7,
  });
  const electrical = p.catalog.createService({
    name: 'Диагностика электрики',
    category: 'electrical',
    description: 'Поиск неисправностей электрооборудования.',
    durationMinutes: 60,
    basePrice: 3000,
    displayOrder: 8,
  });
  const filters = p.catalog.createService({
    name: 'Замена фильтров',
    category: 'maintenance',
    description: 'Воздушный, салонный и топливный фильтры.',
    durationMinutes: 40,
    basePrice: 2200,
    displayOrder: 9,
  });
  const generalDiag = p.catalog.createService({
    name: 'Общая диагностика',
    category: 'diagnostics',
    description: 'Комплексная проверка, если причина неисправности неизвестна.',
    durationMinutes: 60,
    basePrice: 2500,
    displayOrder: 10,
  });

  p.catalog.setServiceRequirement(oil.id, 'lift');
  p.catalog.setServiceRequirement(to.id, 'lift');
  p.catalog.setServiceRequirement(suspension.id, 'lift');
  p.catalog.setServiceRequirement(brakes.id, 'lift');
  p.catalog.setServiceRequirement(computer.id, 'diagnostic_bay');
  p.catalog.setServiceRequirement(tires.id, 'tire_bay');
  p.catalog.setServiceRequirement(alignment.id, 'alignment_stand');
  p.catalog.setServiceRequirement(electrical.id, 'diagnostic_bay');
  p.catalog.setServiceRequirement(filters.id, 'lift');
  p.catalog.setServiceRequirement(generalDiag.id, 'diagnostic_bay');

  const alexey = p.specialists.create({
    name: 'Алексей Морозов',
    specialization: 'Слесарь-механик',
    description: 'ТО, масло, тормоза, подвеска.',
    displayOrder: 1,
  });
  const dmitry = p.specialists.create({
    name: 'Дмитрий Волков',
    specialization: 'Диагност',
    description: 'Компьютерная диагностика и электрика.',
    displayOrder: 2,
  });
  const sergey = p.specialists.create({
    name: 'Сергей Новиков',
    specialization: 'Шиномонтаж',
    description: 'Шиномонтаж и развал-схождение.',
    displayOrder: 3,
  });
  const ivan = p.specialists.create({
    name: 'Иван Кузнецов',
    specialization: 'Универсал',
    description: 'Общий ремонт и плановые работы.',
    displayOrder: 4,
  });
  const pavel = p.specialists.create({
    name: 'Павел Орлов',
    specialization: 'Ходовая',
    description: 'Тормоза и подвеска.',
    displayOrder: 5,
  });

  p.specialists.setServices(alexey.id, [oil.id, to.id, brakes.id, suspension.id, filters.id]);
  p.specialists.setServices(dmitry.id, [computer.id, electrical.id, generalDiag.id]);
  p.specialists.setServices(sergey.id, [tires.id, alignment.id]);
  p.specialists.setServices(ivan.id, [oil.id, to.id, filters.id, generalDiag.id, brakes.id]);
  p.specialists.setServices(pavel.id, [brakes.id, suspension.id, alignment.id]);

  const lift1 = p.resources.create({ name: 'Подъёмник №1', type: 'lift' });
  const lift2 = p.resources.create({ name: 'Подъёмник №2', type: 'lift' });
  p.resources.create({ name: 'Подъёмник №3', type: 'lift' });
  const diagBay = p.resources.create({ name: 'Диагностический пост', type: 'diagnostic_bay' });
  p.resources.create({ name: 'Шиномонтажный пост', type: 'tire_bay' });
  p.resources.create({ name: 'Стенд развал-схождения', type: 'alignment_stand' });
  p.resources.create({ name: 'Пост общего ремонта', type: 'general_bay' });

  for (const specialist of [alexey, dmitry, sergey, ivan, pavel]) {
    for (const weekday of [1, 2, 3, 4, 5, 6]) {
      p.availability.upsertWorkingHours({
        specialistId: specialist.id,
        weekday,
        startTime: '09:00',
        endTime: '19:00',
        active: true,
      });
    }
  }

  const variants = [
    ['Volkswagen', 'Tiguan', 'II', 2016, 2020, '2.0 TSI'],
    ['Volkswagen', 'Tiguan', 'II', 2016, 2020, '2.0 TDI'],
    ['Volkswagen', 'Polo', 'V', 2010, 2020, '1.6'],
    ['Volkswagen', 'Passat', 'B8', 2015, 2022, '1.8 TSI'],
    ['Toyota', 'Camry', 'XV70', 2018, 2023, '2.5'],
    ['Toyota', 'RAV4', 'XA50', 2019, 2024, '2.0'],
    ['Kia', 'Rio', 'IV', 2017, 2023, '1.6'],
    ['Hyundai', 'Solaris', 'II', 2017, 2023, '1.6'],
    ['Skoda', 'Octavia', 'A7', 2013, 2020, '1.8 TSI'],
    ['BMW', '3 Series', 'G20', 2019, 2024, '2.0'],
    ['Mercedes-Benz', 'C-Class', 'W205', 2014, 2021, '2.0'],
    ['Ford', 'Focus', 'III', 2011, 2018, '1.6'],
    ['Renault', 'Duster', 'I', 2015, 2021, '2.0'],
    ['Lada', 'Vesta', '', 2015, 2024, '1.6'],
    ['Nissan', 'Qashqai', 'J11', 2014, 2021, '2.0'],
    ['Mazda', 'CX-5', 'KF', 2017, 2024, '2.0'],
    ['Audi', 'Q5', 'FY', 2017, 2024, '2.0 TFSI'],
    ['Honda', 'CR-V', 'RW', 2017, 2023, '2.0'],
    ['Chevrolet', 'Cruze', 'J300', 2012, 2016, '1.8'],
    ['Mitsubishi', 'Outlander', 'III', 2015, 2021, '2.4'],
    ['Subaru', 'Forester', 'SK', 2018, 2024, '2.0'],
    ['Lexus', 'RX', 'AL20', 2016, 2022, '3.5'],
    ['Volvo', 'XC60', 'II', 2017, 2024, '2.0'],
    ['Peugeot', '3008', 'II', 2016, 2023, '1.6'],
  ].map(([make, model, generation, yearFrom, yearTo, engine]) =>
    p.vehicles.createVariant({
      make: String(make),
      model: String(model),
      generation: generation ? String(generation) : null,
      yearFrom: Number(yearFrom),
      yearTo: Number(yearTo),
      engine: String(engine),
    }),
  );

  const tiguan = variants[0];

  const partCatalog: Array<{
    brand: string;
    name: string;
    sku: string;
    oem?: string;
    category: string;
    price: number;
    notes?: string;
    all?: boolean;
  }> = [
    { brand: 'TRW', name: 'Колодки тормозные передние', sku: 'GDB1956', oem: '5Q0698151', category: 'brakes', price: 6400, notes: 'Для Tiguan II' },
    { brand: 'Brembo', name: 'Колодки тормозные передние', sku: 'P85125', category: 'brakes', price: 7200 },
    { brand: 'TRW', name: 'Диск тормозной передний', sku: 'DF6156', category: 'brakes', price: 4800 },
    { brand: 'Mann', name: 'Фильтр масляный', sku: 'HU6013z', oem: '04E115561H', category: 'filters', price: 890 },
    { brand: 'Mahle', name: 'Фильтр масляный', sku: 'OX387D', category: 'filters', price: 920 },
    { brand: 'Mann', name: 'Фильтр воздушный', sku: 'C27010', category: 'filters', price: 1450 },
    { brand: 'Mann', name: 'Фильтр салонный', sku: 'CUK26010', category: 'filters', price: 1680 },
    { brand: 'Bosch', name: 'Свеча зажигания', sku: '0242235665', category: 'ignition', price: 780 },
    { brand: 'NGK', name: 'Свеча зажигания', sku: 'ILZKAR7B11', category: 'ignition', price: 920 },
    { brand: 'Gates', name: 'Ремень приводной', sku: '6PK1125', category: 'belts', price: 2100 },
    { brand: 'Lemforder', name: 'Стойка стабилизатора', sku: '3536101', category: 'suspension', price: 1850 },
    { brand: 'Sachs', name: 'Амортизатор передний', sku: '317599', category: 'suspension', price: 8900 },
    { brand: 'Febi', name: 'Сайлентблок рычага', sku: '26364', category: 'suspension', price: 1240 },
    { brand: 'Bosch', name: 'Аккумулятор S4 60Ah', sku: '0092S40050', category: 'electrical', price: 9800 },
    { brand: 'Valeo', name: 'Щётки стеклоочистителя', sku: '574306', category: 'body', price: 2100 },
    { brand: 'Castrol', name: 'Масло 5W-30 5л', sku: '15B4C5', category: 'fluids', price: 4200 },
    { brand: 'Motul', name: 'Масло 5W-40 5л', sku: '109716', category: 'fluids', price: 5100 },
    { brand: 'ATE', name: 'Тормозная жидкость DOT4 1л', sku: '03.9901-5802.2', category: 'fluids', price: 890 },
  ];

  const extraBrands = ['Bosch', 'Febi', 'Mahle', 'TRW', 'Gates', 'Valeo', 'Sachs', 'NGK'];
  const extraCats = [
    ['filters', 'Фильтр топливный'],
    ['filters', 'Фильтр салона угольный'],
    ['brakes', 'Колодки задние'],
    ['brakes', 'Диск тормозной задний'],
    ['suspension', 'Опора амортизатора'],
    ['suspension', 'Пыльник амортизатора'],
    ['electrical', 'Катушка зажигания'],
    ['electrical', 'Датчик ABS'],
    ['ignition', 'Провода высоковольтные'],
    ['belts', 'Ролик натяжителя'],
    ['body', 'Лампа H7'],
    ['fluids', 'Антифриз 5л'],
  ];
  extraCats.forEach(([category, name], index) => {
    extraBrands.forEach((brand, brandIndex) => {
      if (partCatalog.length >= 78) return;
      partCatalog.push({
        brand,
        name,
        sku: `${brand.slice(0, 2).toUpperCase()}${1000 + index * 10 + brandIndex}`,
        category,
        price: 700 + index * 180 + brandIndex * 90,
        all: brandIndex % 3 === 0,
      });
    });
  });

  const createdParts = partCatalog.map((item) =>
    p.parts.create({
      brand: item.brand,
      name: item.name,
      sku: item.sku,
      oemCode: item.oem ?? null,
      category: item.category,
      price: item.price,
      notes: item.notes ?? null,
    }),
  );

  createdParts.forEach((part, index) => {
    const source = partCatalog[index];
    if (source.all) {
      variants.forEach((variant) => p.parts.addFitment(variant.id, part.id));
      return;
    }
    if (index < 18) {
      p.parts.addFitment(tiguan.id, part.id);
      if (index % 2 === 0) p.parts.addFitment(variants[1].id, part.id);
      if (index % 3 === 0) p.parts.addFitment(variants[3].id, part.id);
      return;
    }
    const variant = variants[index % variants.length];
    p.parts.addFitment(variant.id, part.id);
    p.parts.addFitment(variants[(index + 4) % variants.length].id, part.id);
  });

  const ivanPetrov = p.customers.upsert(
    { id: DEMO_TELEGRAM_USER_ID, username: 'demo_client', first_name: 'Иван', last_name: 'Петров' },
    { name: 'Иван Петров', phone: '+7 921 000-11-22' },
  );
  const tiguanVehicle = p.vehicles.create({
    customerId: ivanPetrov.id,
    make: 'Volkswagen',
    model: 'Tiguan',
    generation: 'II',
    year: 2019,
    engine: '2.0 TSI',
    licensePlate: 'А123ВС 178',
    vin: 'WVGZZZ5NZKM012345',
    mileage: 84200,
    isActive: true,
  });
  p.vehicles.create({
    customerId: ivanPetrov.id,
    make: 'Toyota',
    model: 'Camry',
    year: 2021,
    engine: '2.5',
    licensePlate: 'О777ОО 178',
    mileage: 41200,
    isActive: false,
  });

  const marina = p.customers.upsert(
    { id: 999000002, username: 'marina', first_name: 'Марина' },
    { name: 'Марина Соколова', phone: '+7 921 555-01-01' },
  );
  p.vehicles.create({
    customerId: marina.id,
    make: 'Kia',
    model: 'Rio',
    year: 2020,
    engine: '1.6',
    mileage: 56000,
    isActive: true,
  });

  const futureTue = nextWeekday(now, 2);
  const today = todayDateString(now);

  p.bookings.insert({
    customerId: ivanPetrov.id,
    vehicleId: tiguanVehicle.id,
    serviceId: oil.id,
    specialistId: alexey.id,
    resourceId: lift1.id,
    date: '2026-08-12',
    startTime: '10:00',
    endTime: '11:00',
    durationMinutes: 60,
    price: 9800,
    status: 'completed',
    source: 'seed',
  });
  p.history.upsertReminder({
    vehicleId: tiguanVehicle.id,
    serviceId: oil.id,
    lastMileage: 84200,
    intervalKm: 10000,
    lastCompletedAt: '2026-08-12T11:00:00.000Z',
  });

  p.bookings.insert({
    customerId: ivanPetrov.id,
    vehicleId: tiguanVehicle.id,
    serviceId: suspension.id,
    specialistId: pavel.id,
    resourceId: lift2.id,
    date: '2026-04-03',
    startTime: '11:00',
    endTime: '12:00',
    durationMinutes: 60,
    price: 6200,
    status: 'completed',
    source: 'seed',
  });

  p.bookings.insert({
    customerId: ivanPetrov.id,
    vehicleId: tiguanVehicle.id,
    serviceId: to.id,
    specialistId: alexey.id,
    resourceId: lift1.id,
    date: addDays(futureTue, 0),
    startTime: '10:00',
    endTime: '12:00',
    durationMinutes: 120,
    price: 8900,
    status: 'booked',
    source: 'seed',
  });

  const diagnosing = p.bookings.insert({
    customerId: ivanPetrov.id,
    vehicleId: tiguanVehicle.id,
    serviceId: computer.id,
    specialistId: dmitry.id,
    resourceId: diagBay.id,
    date: today,
    startTime: '09:00',
    endTime: '09:45',
    durationMinutes: 45,
    price: 2800,
    status: 'diagnosing',
    source: 'seed',
    notes: 'Горит Check Engine',
  });
  p.estimates.upsertInspection({
    appointmentId: diagnosing.id,
    summary: 'Зафиксированы ошибки по системе зажигания. Рекомендуется проверка катушек.',
    notes: 'Клиент отмечает потерю тяги.',
  });

  const awaiting = p.bookings.insert({
    customerId: ivanPetrov.id,
    vehicleId: tiguanVehicle.id,
    serviceId: brakes.id,
    specialistId: pavel.id,
    resourceId: lift2.id,
    date: today,
    startTime: '14:00',
    endTime: '15:30',
    durationMinutes: 90,
    price: 4500,
    status: 'waiting_approval',
    source: 'seed',
  });
  p.estimates.upsertInspection({
    appointmentId: awaiting.id,
    summary: 'Износ передних тормозных колодок.',
    notes: 'Диски в допуске, замена не требуется.',
  });
  const estimate = p.estimates.create(awaiting.id);
  p.estimates.addItem({
    estimateId: estimate.id,
    type: 'labor',
    title: 'Замена передних тормозных колодок',
    qty: 1,
    unitPrice: 2500,
  });
  const trw = createdParts.find((item) => item.sku === 'GDB1956')!;
  p.estimates.addItem({
    estimateId: estimate.id,
    type: 'part',
    title: `${trw.brand} ${trw.sku}`,
    qty: 1,
    unitPrice: trw.price,
    partId: trw.id,
  });
  p.estimates.updateStatus(estimate.id, 'awaiting_approval');

  p.requests.create({
    customerId: ivanPetrov.id,
    vehicleId: tiguanVehicle.id,
    description: 'При повороте руля слышен стук спереди.',
    symptomCategory: 'noise',
    desiredDate: addDays(today, 2),
  });

  p.availability.createBlockedSlot({
    specialistId: sergey.id,
    date: futureTue,
    startTime: '12:00',
    endTime: '14:00',
    reason: 'Обучение',
  });
  p.availability.createBlockedSlot({
    resourceId: lift1.id,
    date: addDays(futureTue, 1),
    startTime: '09:00',
    endTime: '11:00',
    reason: 'Обслуживание подъёмника',
  });
}

export function resetAndSeed(database: Database.Database): void {
  const tables = [
    'vehicle_maintenance',
    'vehicle_part_fitments',
    'estimate_items',
    'estimates',
    'inspections',
    'service_requests',
    'appointments',
    'blocked_slots',
    'working_hours',
    'specialist_services',
    'service_resource_requirements',
    'parts',
    'vehicle_variants',
    'vehicles',
    'resources',
    'specialists',
    'services',
    'customers',
  ];
  database.exec('PRAGMA foreign_keys = OFF');
  for (const table of tables) {
    database.exec(`DELETE FROM ${table}`);
  }
  database.exec('PRAGMA foreign_keys = ON');
  seed(database);
}
