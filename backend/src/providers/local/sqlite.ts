import type Database from 'better-sqlite3';
import { AppError } from '../../errors.js';
import { ACTIVE_APPOINTMENT_STATUSES } from '../../types.js';
import type {
  AppointmentWithDetails,
  BlockedSlot,
  BusyInterval,
  Customer,
  Estimate,
  EstimateItem,
  EstimateStatus,
  EstimateWithDetails,
  HistoryVisit,
  Inspection,
  InspectionItem,
  MaintenanceReminder,
  Part,
  Service,
  ServiceRequestStatus,
  ServiceRequestWithDetails,
  ServiceResourceRequirement,
  Specialist,
  Resource,
  TelegramUser,
  Vehicle,
  VehicleVariant,
  WorkingHours,
} from '../../types.js';
import type { Providers } from '../types.js';

const ACTIVE_SQL = ACTIVE_APPOINTMENT_STATUSES.map(() => '?').join(',');

const APPOINTMENT_SELECT = `
  SELECT
    a.*,
    s.name AS service_name,
    s.category AS service_category,
    s.duration_minutes AS service_duration_minutes,
    s.base_price AS service_price,
    sp.name AS specialist_name,
    r.name AS resource_name,
    r.type AS resource_type,
    c.name AS customer_name,
    c.phone AS customer_phone,
    c.telegram_user_id AS customer_telegram_user_id,
    v.make AS vehicle_make,
    v.model AS vehicle_model,
    v.year AS vehicle_year,
    v.engine AS vehicle_engine,
    v.mileage AS vehicle_mileage,
    v.license_plate AS vehicle_license_plate
  FROM appointments a
  JOIN services s ON s.id = a.service_id
  JOIN specialists sp ON sp.id = a.specialist_id
  LEFT JOIN resources r ON r.id = a.resource_id
  JOIN customers c ON c.id = a.customer_id
  JOIN vehicles v ON v.id = a.vehicle_id
`;

const REQUEST_SELECT = `
  SELECT
    sr.*,
    c.name AS customer_name,
    c.phone AS customer_phone,
    v.make AS vehicle_make,
    v.model AS vehicle_model,
    v.year AS vehicle_year,
    v.engine AS vehicle_engine
  FROM service_requests sr
  JOIN customers c ON c.id = sr.customer_id
  JOIN vehicles v ON v.id = sr.vehicle_id
`;

function notFound(entity: string): AppError {
  return new AppError(`${entity} not found`, 404, `${entity.toUpperCase().replace(/\s+/g, '_')}_NOT_FOUND`);
}

function customerName(user: TelegramUser, override?: string): string {
  if (override?.trim()) return override.trim();
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username || 'Клиент';
}

function vehicleMatches(
  variant: VehicleVariant,
  vehicle: Pick<Vehicle, 'make' | 'model' | 'year' | 'engine'>,
): boolean {
  if (variant.make.toLowerCase() !== vehicle.make.toLowerCase()) return false;
  if (variant.model.toLowerCase() !== vehicle.model.toLowerCase()) return false;
  if (vehicle.year < variant.year_from || vehicle.year > variant.year_to) return false;
  if (variant.engine && vehicle.engine) {
    return variant.engine.toLowerCase() === vehicle.engine.toLowerCase();
  }
  return true;
}

export function createLocalProviders(database: Database.Database): Providers {
  const getAppointment = (id: number) =>
    database.prepare(`${APPOINTMENT_SELECT} WHERE a.id = ?`).get(id) as AppointmentWithDetails | undefined;

  const getRequest = (id: number) =>
    database.prepare(`${REQUEST_SELECT} WHERE sr.id = ?`).get(id) as ServiceRequestWithDetails | undefined;

  const getEstimateItems = (estimateId: number) =>
    database
      .prepare('SELECT * FROM estimate_items WHERE estimate_id = ? ORDER BY id')
      .all(estimateId) as EstimateItem[];

  const listInspectionItems = (inspectionId: number) =>
    database
      .prepare('SELECT * FROM inspection_items WHERE inspection_id = ? ORDER BY id')
      .all(inspectionId) as InspectionItem[];

  const hydrateInspection = (
    row: Omit<Inspection, 'items'> | undefined,
  ): Inspection | undefined => {
    if (!row) return undefined;
    return { ...row, items: listInspectionItems(row.id) };
  };

  const getInspection = (appointmentId: number) =>
    hydrateInspection(
      database.prepare('SELECT * FROM inspections WHERE appointment_id = ?').get(appointmentId) as
        | Omit<Inspection, 'items'>
        | undefined,
    );

  const hydrateEstimate = (row: Estimate | undefined): EstimateWithDetails | undefined => {
    if (!row) return undefined;
    return {
      ...row,
      items: getEstimateItems(row.id),
      inspection: getInspection(row.appointment_id) ?? null,
    };
  };

  const recalcEstimate = (estimateId: number, approvedOnly = false): EstimateWithDetails => {
    const sql = approvedOnly
      ? 'SELECT COALESCE(SUM(total_price), 0) AS total FROM estimate_items WHERE estimate_id = ? AND approved = 1'
      : 'SELECT COALESCE(SUM(total_price), 0) AS total FROM estimate_items WHERE estimate_id = ?';
    const total = (database.prepare(sql).get(estimateId) as { total: number }).total;
    database
      .prepare("UPDATE estimates SET total_amount = ?, updated_at = datetime('now') WHERE id = ?")
      .run(total, estimateId);
    const row = database.prepare('SELECT * FROM estimates WHERE id = ?').get(estimateId) as Estimate | undefined;
    const hydrated = hydrateEstimate(row);
    if (!hydrated) throw notFound('Estimate');
    return hydrated;
  };

  const providers: Providers = {
    transaction<T>(fn: () => T): T {
      return database.transaction(fn).immediate();
    },

    customers: {
      upsert(user: TelegramUser, extras?: { name?: string; phone?: string }) {
        const existing = database
          .prepare('SELECT * FROM customers WHERE telegram_user_id = ?')
          .get(user.id) as Customer | undefined;
        if (existing) {
          const name = extras?.name ? customerName(user, extras.name) : existing.name;
          const phone = extras?.phone !== undefined ? extras.phone : existing.phone;
          database
            .prepare(
              "UPDATE customers SET name = ?, phone = ?, username = ?, updated_at = datetime('now') WHERE id = ?",
            )
            .run(name, phone, user.username ?? existing.username, existing.id);
          return { id: existing.id, created: false };
        }
        const result = database
          .prepare(
            'INSERT INTO customers (telegram_user_id, name, phone, username) VALUES (?, ?, ?, ?)',
          )
          .run(user.id, customerName(user, extras?.name), extras?.phone ?? null, user.username ?? null);
        return { id: Number(result.lastInsertRowid), created: true };
      },
      getByTelegramUserId(telegramUserId) {
        return database
          .prepare('SELECT * FROM customers WHERE telegram_user_id = ?')
          .get(telegramUserId) as Customer | undefined;
      },
      getById(id) {
        return database.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer | undefined;
      },
      listAll() {
        return database.prepare('SELECT * FROM customers ORDER BY id').all() as Customer[];
      },
      update(id, patch) {
        const current = this.getById(id);
        if (!current) throw notFound('Customer');
        database
          .prepare("UPDATE customers SET name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?")
          .run(patch.name ?? current.name, patch.phone !== undefined ? patch.phone : current.phone, id);
        return this.getById(id)!;
      },
    },

    vehicles: {
      listByCustomer(customerId) {
        return database
          .prepare('SELECT * FROM vehicles WHERE customer_id = ? ORDER BY is_active DESC, id')
          .all(customerId) as Vehicle[];
      },
      getById(id) {
        return database.prepare('SELECT * FROM vehicles WHERE id = ?').get(id) as Vehicle | undefined;
      },
      listAll() {
        return database.prepare('SELECT * FROM vehicles ORDER BY id').all() as Vehicle[];
      },
      create(params) {
        if (params.isActive) {
          database.prepare('UPDATE vehicles SET is_active = 0 WHERE customer_id = ?').run(params.customerId);
        }
        const result = database
          .prepare(
            `INSERT INTO vehicles
              (customer_id, make, model, generation, year, engine, vin, license_plate, mileage, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            params.customerId,
            params.make,
            params.model,
            params.generation ?? null,
            params.year,
            params.engine ?? null,
            params.vin ?? null,
            params.licensePlate ?? null,
            params.mileage,
            params.isActive === false ? 0 : 1,
          );
        const created = this.getById(Number(result.lastInsertRowid));
        if (!created) throw notFound('Vehicle');
        return created;
      },
      update(id, patch) {
        const current = this.getById(id);
        if (!current) throw notFound('Vehicle');
        if (patch.isActive) {
          database.prepare('UPDATE vehicles SET is_active = 0 WHERE customer_id = ?').run(current.customer_id);
        }
        database
          .prepare(
            `UPDATE vehicles SET
              make = ?, model = ?, generation = ?, year = ?, engine = ?, vin = ?,
              license_plate = ?, mileage = ?, is_active = ?, updated_at = datetime('now')
             WHERE id = ?`,
          )
          .run(
            patch.make ?? current.make,
            patch.model ?? current.model,
            patch.generation !== undefined ? patch.generation : current.generation,
            patch.year ?? current.year,
            patch.engine !== undefined ? patch.engine : current.engine,
            patch.vin !== undefined ? patch.vin : current.vin,
            patch.licensePlate !== undefined ? patch.licensePlate : current.license_plate,
            patch.mileage ?? current.mileage,
            patch.isActive === undefined ? current.is_active : patch.isActive ? 1 : 0,
            id,
          );
        return this.getById(id)!;
      },
      setActive(customerId, vehicleId) {
        const vehicle = this.getById(vehicleId);
        if (!vehicle || vehicle.customer_id !== customerId) throw notFound('Vehicle');
        database.prepare('UPDATE vehicles SET is_active = 0 WHERE customer_id = ?').run(customerId);
        database
          .prepare("UPDATE vehicles SET is_active = 1, updated_at = datetime('now') WHERE id = ?")
          .run(vehicleId);
        return this.getById(vehicleId)!;
      },
      listVariants() {
        return database.prepare('SELECT * FROM vehicle_variants ORDER BY make, model').all() as VehicleVariant[];
      },
      findMatchingVariants(vehicle) {
        return this.listVariants().filter((variant) => vehicleMatches(variant, vehicle));
      },
      createVariant(params) {
        const result = database
          .prepare(
            'INSERT INTO vehicle_variants (make, model, generation, year_from, year_to, engine) VALUES (?, ?, ?, ?, ?, ?)',
          )
          .run(
            params.make,
            params.model,
            params.generation ?? null,
            params.yearFrom,
            params.yearTo,
            params.engine ?? null,
          );
        return database
          .prepare('SELECT * FROM vehicle_variants WHERE id = ?')
          .get(Number(result.lastInsertRowid)) as VehicleVariant;
      },
    },

    catalog: {
      listServices(filters) {
        let sql = 'SELECT * FROM services WHERE 1=1';
        const args: unknown[] = [];
        if (filters?.category) {
          sql += ' AND category = ?';
          args.push(filters.category);
        }
        if (filters?.activeOnly) {
          sql += ' AND active = 1';
        }
        sql += ' ORDER BY display_order, id';
        return database.prepare(sql).all(...args) as Service[];
      },
      getService(id) {
        return database.prepare('SELECT * FROM services WHERE id = ?').get(id) as Service | undefined;
      },
      getActiveService(id) {
        return database.prepare('SELECT * FROM services WHERE id = ? AND active = 1').get(id) as
          | Service
          | undefined;
      },
      createService(params) {
        const result = database
          .prepare(
            `INSERT INTO services (name, category, description, duration_minutes, base_price, active, display_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            params.name,
            params.category,
            params.description ?? '',
            params.durationMinutes,
            params.basePrice,
            params.active === false ? 0 : 1,
            params.displayOrder ?? 0,
          );
        return this.getService(Number(result.lastInsertRowid))!;
      },
      updateService(id, patch) {
        const current = this.getService(id);
        if (!current) throw notFound('Service');
        database
          .prepare(
            `UPDATE services SET
              name = ?, category = ?, description = ?, duration_minutes = ?, base_price = ?,
              active = ?, display_order = ?, updated_at = datetime('now')
             WHERE id = ?`,
          )
          .run(
            patch.name ?? current.name,
            patch.category ?? current.category,
            patch.description ?? current.description,
            patch.durationMinutes ?? current.duration_minutes,
            patch.basePrice ?? current.base_price,
            patch.active === undefined ? current.active : patch.active ? 1 : 0,
            patch.displayOrder ?? current.display_order,
            id,
          );
        return this.getService(id)!;
      },
      getServiceRequirement(serviceId) {
        return database
          .prepare('SELECT * FROM service_resource_requirements WHERE service_id = ?')
          .get(serviceId) as ServiceResourceRequirement | undefined;
      },
      setServiceRequirement(serviceId, resourceType, quantity = 1) {
        database
          .prepare(
            `INSERT INTO service_resource_requirements (service_id, resource_type, quantity)
             VALUES (?, ?, ?)
             ON CONFLICT(service_id, resource_type) DO UPDATE SET quantity = excluded.quantity`,
          )
          .run(serviceId, resourceType, quantity);
      },
    },

    specialists: {
      list(activeOnly) {
        const sql = activeOnly
          ? 'SELECT * FROM specialists WHERE active = 1 ORDER BY display_order, id'
          : 'SELECT * FROM specialists ORDER BY display_order, id';
        return database.prepare(sql).all() as Specialist[];
      },
      listEligible(serviceId) {
        return database
          .prepare(
            `SELECT sp.* FROM specialists sp
             JOIN specialist_services ss ON ss.specialist_id = sp.id
             WHERE ss.service_id = ? AND sp.active = 1
             ORDER BY sp.display_order, sp.id`,
          )
          .all(serviceId) as Specialist[];
      },
      getById(id) {
        return database.prepare('SELECT * FROM specialists WHERE id = ?').get(id) as Specialist | undefined;
      },
      getActiveById(id) {
        return database.prepare('SELECT * FROM specialists WHERE id = ? AND active = 1').get(id) as
          | Specialist
          | undefined;
      },
      offersService(specialistId, serviceId) {
        const row = database
          .prepare('SELECT 1 AS ok FROM specialist_services WHERE specialist_id = ? AND service_id = ?')
          .get(specialistId, serviceId) as { ok: number } | undefined;
        return Boolean(row);
      },
      listServiceIds(specialistId) {
        return (
          database
            .prepare('SELECT service_id FROM specialist_services WHERE specialist_id = ?')
            .all(specialistId) as Array<{ service_id: number }>
        ).map((row) => row.service_id);
      },
      setServices(specialistId, serviceIds) {
        database.prepare('DELETE FROM specialist_services WHERE specialist_id = ?').run(specialistId);
        const insert = database.prepare(
          'INSERT INTO specialist_services (specialist_id, service_id) VALUES (?, ?)',
        );
        for (const serviceId of serviceIds) {
          insert.run(specialistId, serviceId);
        }
      },
      create(params) {
        const result = database
          .prepare(
            'INSERT INTO specialists (name, specialization, description, active, display_order) VALUES (?, ?, ?, ?, ?)',
          )
          .run(
            params.name,
            params.specialization ?? '',
            params.description ?? '',
            params.active === false ? 0 : 1,
            params.displayOrder ?? 0,
          );
        return this.getById(Number(result.lastInsertRowid))!;
      },
      update(id, patch) {
        const current = this.getById(id);
        if (!current) throw notFound('Specialist');
        database
          .prepare(
            `UPDATE specialists SET name = ?, specialization = ?, description = ?, active = ?,
              display_order = ?, updated_at = datetime('now') WHERE id = ?`,
          )
          .run(
            patch.name ?? current.name,
            patch.specialization ?? current.specialization,
            patch.description ?? current.description,
            patch.active === undefined ? current.active : patch.active ? 1 : 0,
            patch.displayOrder ?? current.display_order,
            id,
          );
        return this.getById(id)!;
      },
    },

    resources: {
      list(filters) {
        let sql = 'SELECT * FROM resources WHERE 1=1';
        const args: unknown[] = [];
        if (filters?.type) {
          sql += ' AND type = ?';
          args.push(filters.type);
        }
        if (filters?.activeOnly) sql += ' AND active = 1';
        sql += ' ORDER BY id';
        return database.prepare(sql).all(...args) as Resource[];
      },
      getById(id) {
        return database.prepare('SELECT * FROM resources WHERE id = ?').get(id) as Resource | undefined;
      },
      create(params) {
        const result = database
          .prepare('INSERT INTO resources (name, type, active) VALUES (?, ?, ?)')
          .run(params.name, params.type, params.active === false ? 0 : 1);
        return this.getById(Number(result.lastInsertRowid))!;
      },
      update(id, patch) {
        const current = this.getById(id);
        if (!current) throw notFound('Resource');
        database
          .prepare("UPDATE resources SET name = ?, type = ?, active = ?, updated_at = datetime('now') WHERE id = ?")
          .run(
            patch.name ?? current.name,
            patch.type ?? current.type,
            patch.active === undefined ? current.active : patch.active ? 1 : 0,
            id,
          );
        return this.getById(id)!;
      },
    },

    availability: {
      listWorkingHours(specialistId) {
        if (specialistId) {
          return database
            .prepare('SELECT * FROM working_hours WHERE specialist_id = ? ORDER BY weekday')
            .all(specialistId) as WorkingHours[];
        }
        return database.prepare('SELECT * FROM working_hours ORDER BY specialist_id, weekday').all() as WorkingHours[];
      },
      getWorkingHours(specialistId, weekday) {
        return (
          (database
            .prepare('SELECT * FROM working_hours WHERE specialist_id = ? AND weekday = ?')
            .get(specialistId, weekday) as WorkingHours | undefined) ?? null
        );
      },
      upsertWorkingHours(params) {
        database
          .prepare(
            `INSERT INTO working_hours (specialist_id, weekday, start_time, end_time, active)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(specialist_id, weekday) DO UPDATE SET
               start_time = excluded.start_time,
               end_time = excluded.end_time,
               active = excluded.active`,
          )
          .run(params.specialistId, params.weekday, params.startTime, params.endTime, params.active ? 1 : 0);
        return this.getWorkingHours(params.specialistId, params.weekday)!;
      },
      listBlockedSlots(filters) {
        let sql = 'SELECT * FROM blocked_slots WHERE 1=1';
        const args: unknown[] = [];
        if (filters?.specialistId) {
          sql += ' AND specialist_id = ?';
          args.push(filters.specialistId);
        }
        if (filters?.resourceId) {
          sql += ' AND resource_id = ?';
          args.push(filters.resourceId);
        }
        if (filters?.date) {
          sql += ' AND blocked_date = ?';
          args.push(filters.date);
        }
        sql += ' ORDER BY blocked_date, start_time';
        return database.prepare(sql).all(...args) as BlockedSlot[];
      },
      listSpecialistBusy(date, specialistId) {
        const appointments = database
          .prepare(
            `SELECT start_time, end_time, specialist_id FROM appointments
             WHERE specialist_id = ? AND appointment_date = ? AND status IN (${ACTIVE_SQL})`,
          )
          .all(specialistId, date, ...ACTIVE_APPOINTMENT_STATUSES) as BusyInterval[];
        const blocks = database
          .prepare(
            `SELECT start_time, end_time, specialist_id FROM blocked_slots
             WHERE specialist_id = ? AND blocked_date = ?`,
          )
          .all(specialistId, date) as BusyInterval[];
        return [...appointments, ...blocks];
      },
      listResourceBusy(date, resourceId) {
        const appointments = database
          .prepare(
            `SELECT start_time, end_time, resource_id FROM appointments
             WHERE resource_id = ? AND appointment_date = ? AND status IN (${ACTIVE_SQL})`,
          )
          .all(resourceId, date, ...ACTIVE_APPOINTMENT_STATUSES) as BusyInterval[];
        const blocks = database
          .prepare(
            `SELECT start_time, end_time, resource_id FROM blocked_slots
             WHERE resource_id = ? AND blocked_date = ?`,
          )
          .all(resourceId, date) as BusyInterval[];
        return [...appointments, ...blocks];
      },
      createBlockedSlot(params) {
        if (!params.specialistId && !params.resourceId) {
          throw new AppError('Blocked slot requires specialist or resource', 400, 'VALIDATION_ERROR');
        }
        const result = database
          .prepare(
            `INSERT INTO blocked_slots (specialist_id, resource_id, blocked_date, start_time, end_time, reason)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(
            params.specialistId ?? null,
            params.resourceId ?? null,
            params.date,
            params.startTime,
            params.endTime,
            params.reason ?? null,
          );
        return database
          .prepare('SELECT * FROM blocked_slots WHERE id = ?')
          .get(Number(result.lastInsertRowid)) as BlockedSlot;
      },
      deleteBlockedSlot(id) {
        return database.prepare('DELETE FROM blocked_slots WHERE id = ?').run(id).changes > 0;
      },
    },

    bookings: {
      getById: getAppointment,
      listByCustomer(customerId, options) {
        let sql = `${APPOINTMENT_SELECT} WHERE a.customer_id = ?`;
        const args: unknown[] = [customerId];
        if (options && options.includePast === false) {
          sql += " AND (a.appointment_date > ? OR (a.appointment_date = ? AND a.end_time >= ?))";
          args.push(options.today ?? '', options.today ?? '', options.nowTime ?? '00:00');
        }
        sql += ' ORDER BY a.appointment_date DESC, a.start_time DESC';
        return database.prepare(sql).all(...args) as AppointmentWithDetails[];
      },
      listByVehicle(vehicleId, status) {
        let sql = `${APPOINTMENT_SELECT} WHERE a.vehicle_id = ?`;
        const args: unknown[] = [vehicleId];
        if (status) {
          sql += ' AND a.status = ?';
          args.push(status);
        }
        sql += ' ORDER BY a.appointment_date DESC, a.start_time DESC';
        return database.prepare(sql).all(...args) as AppointmentWithDetails[];
      },
      listCompletedByVehicle(vehicleId) {
        return database
          .prepare(
            `${APPOINTMENT_SELECT} WHERE a.vehicle_id = ? AND a.status = 'completed'
             ORDER BY a.appointment_date DESC, a.start_time DESC`,
          )
          .all(vehicleId) as AppointmentWithDetails[];
      },
      listLastCompleted(customerId, vehicleId) {
        let sql = `${APPOINTMENT_SELECT} WHERE a.customer_id = ? AND a.status = 'completed'`;
        const args: unknown[] = [customerId];
        if (vehicleId) {
          sql += ' AND a.vehicle_id = ?';
          args.push(vehicleId);
        }
        sql += ' ORDER BY a.appointment_date DESC, a.start_time DESC LIMIT 1';
        return database.prepare(sql).get(...args) as AppointmentWithDetails | undefined;
      },
      listUpcoming(customerId, vehicleId, today, nowTime) {
        let sql = `${APPOINTMENT_SELECT} WHERE a.customer_id = ? AND a.status IN (${ACTIVE_SQL})`;
        const args: unknown[] = [customerId, ...ACTIVE_APPOINTMENT_STATUSES];
        if (vehicleId) {
          sql += ' AND a.vehicle_id = ?';
          args.push(vehicleId);
        }
        if (today) {
          sql += ' AND (a.appointment_date > ? OR (a.appointment_date = ? AND a.end_time >= ?))';
          args.push(today, today, nowTime ?? '00:00');
        }
        sql += ' ORDER BY a.appointment_date, a.start_time LIMIT 1';
        return database.prepare(sql).get(...args) as AppointmentWithDetails | undefined;
      },
      listAdmin(filters) {
        let sql = `${APPOINTMENT_SELECT} WHERE 1=1`;
        const args: unknown[] = [];
        if (filters?.status) {
          sql += ' AND a.status = ?';
          args.push(filters.status);
        }
        if (filters?.specialistId) {
          sql += ' AND a.specialist_id = ?';
          args.push(filters.specialistId);
        }
        if (filters?.dateFrom) {
          sql += ' AND a.appointment_date >= ?';
          args.push(filters.dateFrom);
        }
        if (filters?.dateTo) {
          sql += ' AND a.appointment_date <= ?';
          args.push(filters.dateTo);
        }
        sql += ' ORDER BY a.appointment_date DESC, a.start_time DESC';
        return database.prepare(sql).all(...args) as AppointmentWithDetails[];
      },
      insert(params) {
        const result = database
          .prepare(
            `INSERT INTO appointments
              (customer_id, vehicle_id, service_id, specialist_id, resource_id, appointment_date,
               start_time, end_time, duration_minutes, price, status, source, notes,
               source_appointment_id, service_request_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            params.customerId,
            params.vehicleId,
            params.serviceId,
            params.specialistId,
            params.resourceId,
            params.date,
            params.startTime,
            params.endTime,
            params.durationMinutes,
            params.price,
            params.status ?? 'booked',
            params.source ?? 'miniapp',
            params.notes ?? null,
            params.sourceAppointmentId ?? null,
            params.serviceRequestId ?? null,
          );
        const created = getAppointment(Number(result.lastInsertRowid));
        if (!created) throw notFound('Appointment');
        return created;
      },
      updateSchedule(params) {
        database
          .prepare(
            `UPDATE appointments SET specialist_id = ?, resource_id = ?, appointment_date = ?,
              start_time = ?, end_time = ?, duration_minutes = ?, updated_at = datetime('now')
             WHERE id = ?`,
          )
          .run(
            params.specialistId,
            params.resourceId,
            params.date,
            params.startTime,
            params.endTime,
            params.durationMinutes,
            params.id,
          );
        const updated = getAppointment(params.id);
        if (!updated) throw notFound('Appointment');
        return updated;
      },
      updateStatus(id, status) {
        database
          .prepare("UPDATE appointments SET status = ?, updated_at = datetime('now') WHERE id = ?")
          .run(status, id);
        const updated = getAppointment(id);
        if (!updated) throw notFound('Appointment');
        return updated;
      },
      updateAssignment(id, specialistId, resourceId) {
        database
          .prepare(
            "UPDATE appointments SET specialist_id = ?, resource_id = ?, updated_at = datetime('now') WHERE id = ?",
          )
          .run(specialistId, resourceId, id);
        const updated = getAppointment(id);
        if (!updated) throw notFound('Appointment');
        return updated;
      },
    },

    requests: {
      create(params) {
        const result = database
          .prepare(
            `INSERT INTO service_requests (customer_id, vehicle_id, description, symptom_category, desired_date)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(
            params.customerId,
            params.vehicleId,
            params.description,
            params.symptomCategory ?? null,
            params.desiredDate ?? null,
          );
        return getRequest(Number(result.lastInsertRowid))!;
      },
      getById: getRequest,
      listByCustomer(customerId) {
        return database
          .prepare(`${REQUEST_SELECT} WHERE sr.customer_id = ? ORDER BY sr.created_at DESC`)
          .all(customerId) as ServiceRequestWithDetails[];
      },
      listAdmin(status) {
        if (status) {
          return database
            .prepare(`${REQUEST_SELECT} WHERE sr.status = ? ORDER BY sr.created_at DESC`)
            .all(status) as ServiceRequestWithDetails[];
        }
        return database
          .prepare(`${REQUEST_SELECT} ORDER BY sr.created_at DESC`)
          .all() as ServiceRequestWithDetails[];
      },
      updateStatus(id, status, appointmentId) {
        database
          .prepare(
            "UPDATE service_requests SET status = ?, appointment_id = COALESCE(?, appointment_id), updated_at = datetime('now') WHERE id = ?",
          )
          .run(status, appointmentId ?? null, id);
        const updated = getRequest(id);
        if (!updated) throw notFound('Service request');
        return updated;
      },
    },

    estimates: {
      getInspection,
      upsertInspection(params) {
        const existing = getInspection(params.appointmentId);
        if (existing) {
          database
            .prepare(
              "UPDATE inspections SET summary = ?, notes = ?, updated_at = datetime('now') WHERE appointment_id = ?",
            )
            .run(params.summary, params.notes ?? null, params.appointmentId);
          return getInspection(params.appointmentId)!;
        }
        database
          .prepare('INSERT INTO inspections (appointment_id, summary, notes) VALUES (?, ?, ?)')
          .run(params.appointmentId, params.summary, params.notes ?? null);
        return getInspection(params.appointmentId)!;
      },
      listInspectionItems,
      addInspectionItem(params) {
        const result = database
          .prepare(
            'INSERT INTO inspection_items (inspection_id, name, severity, note) VALUES (?, ?, ?, ?)',
          )
          .run(params.inspectionId, params.name, params.severity, params.note ?? null);
        return database
          .prepare('SELECT * FROM inspection_items WHERE id = ?')
          .get(Number(result.lastInsertRowid)) as InspectionItem;
      },
      getByAppointment(appointmentId) {
        const row = database
          .prepare('SELECT * FROM estimates WHERE appointment_id = ? ORDER BY id DESC LIMIT 1')
          .get(appointmentId) as Estimate | undefined;
        return hydrateEstimate(row);
      },
      getById(id) {
        const row = database.prepare('SELECT * FROM estimates WHERE id = ?').get(id) as Estimate | undefined;
        return hydrateEstimate(row);
      },
      listAdmin(status) {
        const rows = status
          ? (database.prepare('SELECT * FROM estimates WHERE status = ? ORDER BY id DESC').all(status) as Estimate[])
          : (database.prepare('SELECT * FROM estimates ORDER BY id DESC').all() as Estimate[]);
        return rows.map((row) => hydrateEstimate(row)!);
      },
      create(appointmentId) {
        const result = database
          .prepare("INSERT INTO estimates (appointment_id, status, total_amount) VALUES (?, 'draft', 0)")
          .run(appointmentId);
        return hydrateEstimate(
          database.prepare('SELECT * FROM estimates WHERE id = ?').get(Number(result.lastInsertRowid)) as Estimate,
        )!;
      },
      addItem(params) {
        const total = params.qty * params.unitPrice;
        const result = database
          .prepare(
            `INSERT INTO estimate_items (estimate_id, type, title, qty, unit_price, total_price, part_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            params.estimateId,
            params.type,
            params.title,
            params.qty,
            params.unitPrice,
            total,
            params.partId ?? null,
          );
        recalcEstimate(params.estimateId);
        return database
          .prepare('SELECT * FROM estimate_items WHERE id = ?')
          .get(Number(result.lastInsertRowid)) as EstimateItem;
      },
      removeItem(itemId) {
        const item = database.prepare('SELECT * FROM estimate_items WHERE id = ?').get(itemId) as
          | EstimateItem
          | undefined;
        if (!item) return false;
        database.prepare('DELETE FROM estimate_items WHERE id = ?').run(itemId);
        recalcEstimate(item.estimate_id);
        return true;
      },
      setItemsApproved(estimateId, itemIds) {
        const items = getEstimateItems(estimateId);
        const selected = new Set(itemIds);
        const update = database.prepare('UPDATE estimate_items SET approved = ? WHERE id = ?');
        for (const item of items) {
          update.run(selected.has(item.id) ? 1 : 0, item.id);
        }
        return recalcEstimate(estimateId, true);
      },
      recalcTotal: recalcEstimate,
      updateStatus(id, status, approvedAt) {
        database
          .prepare("UPDATE estimates SET status = ?, approved_at = ?, updated_at = datetime('now') WHERE id = ?")
          .run(status, approvedAt ?? null, id);
        const hydrated = hydrateEstimate(
          database.prepare('SELECT * FROM estimates WHERE id = ?').get(id) as Estimate | undefined,
        );
        if (!hydrated) throw notFound('Estimate');
        return hydrated;
      },
    },

    parts: {
      searchParts(query, category) {
        let sql = 'SELECT * FROM parts WHERE active = 1';
        const args: unknown[] = [];
        if (category) {
          sql += ' AND category = ?';
          args.push(category);
        }
        if (query) {
          sql += ' AND (name LIKE ? OR sku LIKE ? OR brand LIKE ? OR oem_code LIKE ?)';
          const like = `%${query}%`;
          args.push(like, like, like, like);
        }
        sql += ' ORDER BY category, brand, name';
        return database.prepare(sql).all(...args) as Part[];
      },
      getCompatibleParts(vehicle, filters) {
        const variants = providers.vehicles.findMatchingVariants(vehicle);
        if (variants.length === 0) return [];
        const ids = variants.map((item) => item.id);
        const placeholders = ids.map(() => '?').join(',');
        let sql = `
          SELECT DISTINCT p.* FROM parts p
          JOIN vehicle_part_fitments f ON f.part_id = p.id
          WHERE p.active = 1 AND f.variant_id IN (${placeholders})
        `;
        const args: unknown[] = [...ids];
        if (filters?.category) {
          sql += ' AND p.category = ?';
          args.push(filters.category);
        }
        if (filters?.query) {
          sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ? OR p.oem_code LIKE ?)';
          const like = `%${filters.query}%`;
          args.push(like, like, like, like);
        }
        sql += ' ORDER BY p.category, p.brand, p.name';
        return database.prepare(sql).all(...args) as Part[];
      },
      getPart(id) {
        return database.prepare('SELECT * FROM parts WHERE id = ?').get(id) as Part | undefined;
      },
      getPrice(id) {
        return this.getPart(id)?.price;
      },
      getAvailability(id) {
        const part = this.getPart(id);
        return { available: Boolean(part?.active) };
      },
      create(params) {
        const result = database
          .prepare(
            `INSERT INTO parts (brand, name, sku, oem_code, category, price, notes, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            params.brand,
            params.name,
            params.sku,
            params.oemCode ?? null,
            params.category,
            params.price,
            params.notes ?? null,
            params.active === false ? 0 : 1,
          );
        return this.getPart(Number(result.lastInsertRowid))!;
      },
      update(id, patch) {
        const current = this.getPart(id);
        if (!current) throw notFound('Part');
        database
          .prepare(
            `UPDATE parts SET brand = ?, name = ?, sku = ?, oem_code = ?, category = ?, price = ?,
              notes = ?, active = ?, updated_at = datetime('now') WHERE id = ?`,
          )
          .run(
            patch.brand ?? current.brand,
            patch.name ?? current.name,
            patch.sku ?? current.sku,
            patch.oemCode !== undefined ? patch.oemCode : current.oem_code,
            patch.category ?? current.category,
            patch.price ?? current.price,
            patch.notes !== undefined ? patch.notes : current.notes,
            patch.active === undefined ? current.active : patch.active ? 1 : 0,
            id,
          );
        return this.getPart(id)!;
      },
      listFitments(partId) {
        if (partId) {
          return (
            database
              .prepare('SELECT variant_id AS variantId, part_id AS partId FROM vehicle_part_fitments WHERE part_id = ?')
              .all(partId) as Array<{ variantId: number; partId: number }>
          );
        }
        return database
          .prepare('SELECT variant_id AS variantId, part_id AS partId FROM vehicle_part_fitments')
          .all() as Array<{ variantId: number; partId: number }>;
      },
      addFitment(variantId, partId) {
        database
          .prepare(
            'INSERT OR IGNORE INTO vehicle_part_fitments (variant_id, part_id) VALUES (?, ?)',
          )
          .run(variantId, partId);
      },
      isCompatible(partId, vehicle) {
        return this.getCompatibleParts(vehicle).some((part) => part.id === partId);
      },
    },

    history: {
      listCompletedVisits(vehicleId) {
        const appointments = providers.bookings.listCompletedByVehicle(vehicleId);
        return appointments.map((appointment): HistoryVisit => {
          const estimate = providers.estimates.getByAppointment(appointment.id);
          return {
            appointment,
            estimateTotal: estimate?.status === 'approved' ? estimate.total_amount : appointment.price,
            laborTitles: estimate?.items.filter((item) => item.type === 'labor').map((item) => item.title) ?? [
              appointment.service_name,
            ],
          };
        });
      },
      getReminder(vehicleId) {
        return database
          .prepare('SELECT * FROM vehicle_maintenance WHERE vehicle_id = ? ORDER BY last_completed_at DESC LIMIT 1')
          .get(vehicleId) as MaintenanceReminder | undefined;
      },
      upsertReminder(params) {
        database
          .prepare(
            `INSERT INTO vehicle_maintenance (vehicle_id, service_id, last_mileage, interval_km, last_completed_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(vehicle_id, service_id) DO UPDATE SET
               last_mileage = excluded.last_mileage,
               interval_km = excluded.interval_km,
               last_completed_at = excluded.last_completed_at`,
          )
          .run(params.vehicleId, params.serviceId, params.lastMileage, params.intervalKm, params.lastCompletedAt);
        return this.getReminder(params.vehicleId)!;
      },
    },
  };

  return providers;
}

export function createLocalPartsProvider(database: Database.Database) {
  return createLocalProviders(database).parts;
}
