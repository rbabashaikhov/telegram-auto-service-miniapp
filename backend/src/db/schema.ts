import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';

const databasePath =
  process.env.NODE_ENV === 'test'
    ? ':memory:'
    : process.env.DATABASE_PATH ||
      path.join(process.cwd(), 'data', 'autoservice.db');

const dir = path.dirname(databasePath);
if (databasePath !== ':memory:' && !fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db: Database.Database = new Database(databasePath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function applySchema(database: Database.Database): void {
  database.pragma('foreign_keys = ON');

  database.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_user_id INTEGER UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      phone TEXT,
      username TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      generation TEXT,
      year INTEGER NOT NULL,
      engine TEXT,
      vin TEXT,
      license_plate TEXT,
      mileage INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS vehicle_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      generation TEXT,
      year_from INTEGER NOT NULL,
      year_to INTEGER NOT NULL,
      engine TEXT
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      duration_minutes INTEGER NOT NULL,
      base_price INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS specialists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialization TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS specialist_services (
      specialist_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      PRIMARY KEY (specialist_id, service_id),
      FOREIGN KEY (specialist_id) REFERENCES specialists(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS service_resource_requirements (
      service_id INTEGER NOT NULL,
      resource_type TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (service_id, resource_type),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      specialist_id INTEGER NOT NULL,
      resource_id INTEGER,
      appointment_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      price INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'booked'
        CHECK (status IN (
          'booked', 'arrived', 'diagnosing', 'waiting_approval',
          'in_progress', 'completed', 'cancelled', 'no_show'
        )),
      source TEXT NOT NULL DEFAULT 'miniapp',
      notes TEXT,
      source_appointment_id INTEGER,
      service_request_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (service_id) REFERENCES services(id),
      FOREIGN KEY (specialist_id) REFERENCES specialists(id),
      FOREIGN KEY (resource_id) REFERENCES resources(id),
      FOREIGN KEY (source_appointment_id) REFERENCES appointments(id)
    );

    CREATE TABLE IF NOT EXISTS working_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      specialist_id INTEGER NOT NULL,
      weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      UNIQUE (specialist_id, weekday),
      FOREIGN KEY (specialist_id) REFERENCES specialists(id)
    );

    CREATE TABLE IF NOT EXISTS blocked_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      specialist_id INTEGER,
      resource_id INTEGER,
      blocked_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      reason TEXT,
      CHECK (
        (specialist_id IS NOT NULL AND resource_id IS NULL)
        OR (specialist_id IS NULL AND resource_id IS NOT NULL)
      ),
      FOREIGN KEY (specialist_id) REFERENCES specialists(id),
      FOREIGN KEY (resource_id) REFERENCES resources(id)
    );

    CREATE TABLE IF NOT EXISTS service_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      symptom_category TEXT,
      desired_date TEXT,
      status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'reviewing', 'scheduled', 'converted', 'closed', 'cancelled')),
      appointment_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    );

    CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      oem_code TEXT,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL UNIQUE,
      summary TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    );

    CREATE TABLE IF NOT EXISTS inspection_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspection_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('critical', 'recommendation', 'ok')),
      note TEXT,
      FOREIGN KEY (inspection_id) REFERENCES inspections(id)
    );

    CREATE TABLE IF NOT EXISTS estimates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'awaiting_approval', 'approved', 'rejected')),
      total_amount INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      approved_at TEXT,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    );

    CREATE TABLE IF NOT EXISTS estimate_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estimate_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('labor', 'part')),
      title TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER NOT NULL,
      total_price INTEGER NOT NULL,
      part_id INTEGER,
      approved INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (estimate_id) REFERENCES estimates(id),
      FOREIGN KEY (part_id) REFERENCES parts(id)
    );

    CREATE TABLE IF NOT EXISTS vehicle_part_fitments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL,
      part_id INTEGER NOT NULL,
      UNIQUE (variant_id, part_id),
      FOREIGN KEY (variant_id) REFERENCES vehicle_variants(id),
      FOREIGN KEY (part_id) REFERENCES parts(id)
    );

    CREATE TABLE IF NOT EXISTS vehicle_maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      last_mileage INTEGER NOT NULL,
      interval_km INTEGER NOT NULL,
      last_completed_at TEXT NOT NULL,
      UNIQUE (vehicle_id, service_id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles (customer_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments (appointment_date, status);
    CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments (customer_id, appointment_date, start_time);
    CREATE INDEX IF NOT EXISTS idx_appointments_specialist_date ON appointments (specialist_id, appointment_date, status);
    CREATE INDEX IF NOT EXISTS idx_appointments_resource_date ON appointments (resource_id, appointment_date, status);
    CREATE INDEX IF NOT EXISTS idx_appointments_vehicle ON appointments (vehicle_id, status);
    CREATE INDEX IF NOT EXISTS idx_requests_customer ON service_requests (customer_id, status);
    CREATE INDEX IF NOT EXISTS idx_inspection_items ON inspection_items (inspection_id);
    CREATE INDEX IF NOT EXISTS idx_parts_category ON parts (category, active);
    CREATE INDEX IF NOT EXISTS idx_fitments_variant ON vehicle_part_fitments (variant_id, part_id);
    CREATE INDEX IF NOT EXISTS idx_blocked_date ON blocked_slots (blocked_date);
  `);
}

function tableColumns(database: Database.Database, table: string): string[] {
  return (database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
    (row) => row.name,
  );
}

function ensureColumn(
  database: Database.Database,
  table: string,
  column: string,
  definition: string,
): void {
  if (tableColumns(database, table).includes(column)) return;
  database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

export function migrate(database: Database.Database = db): void {
  applySchema(database);
  ensureColumn(database, 'estimate_items', 'approved', 'INTEGER NOT NULL DEFAULT 0');
}
