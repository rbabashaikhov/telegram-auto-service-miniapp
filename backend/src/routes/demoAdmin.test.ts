import Database from 'better-sqlite3';
import express from 'express';
import http from 'node:http';
import { Socket } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seed } from '../db/index.js';
import { applySchema } from '../db/schema.js';
import { createLocalProviders } from '../providers/local/sqlite.js';
import type { Providers } from '../providers/types.js';
import { createDemoAdminRouter } from './demoAdmin.js';

function setup() {
  const db = new Database(':memory:');
  applySchema(db);
  seed(db);
  return { db, providers: createLocalProviders(db) };
}

function createApp(data: Providers, enabled = true) {
  const app = express();
  app.use(express.json());
  app.use('/api/demo-admin', createDemoAdminRouter(data, { isEnabled: () => enabled }));
  return app;
}

function dispatch(
  app: express.Express,
  method: string,
  url: string,
  body?: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const req = new http.IncomingMessage(new Socket());
    req.method = method;
    req.url = url;
    req.headers = { host: '127.0.0.1', 'content-type': 'application/json' };

    const payload = body === undefined ? '' : JSON.stringify(body);
    if (payload) {
      req.headers['content-length'] = String(Buffer.byteLength(payload));
    }

    const res = new http.ServerResponse(req);
    const chunks: Buffer[] = [];
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = ((chunk: unknown, encoding?: BufferEncoding, cb?: () => void) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding));
      return originalWrite(chunk as never, encoding as never, cb);
    }) as typeof res.write;

    res.end = ((chunk?: unknown, encoding?: BufferEncoding, cb?: () => void) => {
      if (chunk && typeof chunk !== 'function') {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding));
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      let json: Record<string, unknown> = {};
      if (raw) {
        try {
          json = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          json = { raw };
        }
      }
      resolve({ status: res.statusCode || 0, json });
      return originalEnd(chunk as never, encoding as never, cb);
    }) as typeof res.end;

    req.on('error', reject);
    res.on('error', reject);
    app(req, res);

    if (payload) {
      req.push(payload);
    }
    req.push(null);
  });
}

describe('demo admin API', () => {
  let db: Database.Database;
  let providers: Providers;

  beforeEach(() => {
    ({ db, providers } = setup());
  });

  afterEach(() => {
    db.close();
  });

  it('serves public GET endpoints without ADMIN_TOKEN', async () => {
    const app = createApp(providers);
    const [appointments, services, specialists, requests, parts] = await Promise.all([
      dispatch(app, 'GET', '/api/demo-admin/appointments'),
      dispatch(app, 'GET', '/api/demo-admin/services'),
      dispatch(app, 'GET', '/api/demo-admin/specialists'),
      dispatch(app, 'GET', '/api/demo-admin/service-requests'),
      dispatch(app, 'GET', '/api/demo-admin/parts'),
    ]);

    expect(appointments.status).toBe(200);
    expect(services.status).toBe(200);
    expect(specialists.status).toBe(200);
    expect(requests.status).toBe(200);
    expect(parts.status).toBe(200);
  });

  it('rejects mutation methods and does not change protected data', async () => {
    const appointmentCount = (
      db.prepare('SELECT COUNT(*) AS count FROM appointments').get() as { count: number }
    ).count;

    const app = createApp(providers);
    const attempts = await Promise.all([
      dispatch(app, 'PATCH', '/api/demo-admin/appointments/1', { status: 'cancelled' }),
      dispatch(app, 'POST', '/api/demo-admin/blocked-slots', {
        specialistId: 1,
        date: '2026-08-20',
        startTime: '12:00',
        endTime: '13:00',
      }),
      dispatch(app, 'DELETE', '/api/demo-admin/blocked-slots/1'),
    ]);

    for (const response of attempts) {
      expect(response.status).toBe(405);
      expect(response.json.code).toBe('DEMO_ADMIN_READ_ONLY');
    }

    expect(
      (db.prepare('SELECT COUNT(*) AS count FROM appointments').get() as { count: number }).count,
    ).toBe(appointmentCount);
  });

  it('hides demo admin when the feature is disabled', async () => {
    const response = await dispatch(createApp(providers, false), 'GET', '/api/demo-admin/appointments');
    expect(response.status).toBe(404);
    expect(response.json.code).toBe('NOT_FOUND');
  });
});
