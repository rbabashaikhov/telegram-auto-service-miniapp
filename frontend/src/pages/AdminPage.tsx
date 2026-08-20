import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getAdminToken, setAdminToken } from '../api/client';
import { formatDateLabel, formatPrice, formatStatus, weekdayShort } from '../lib/format';
import type {
  Appointment,
  BlockedSlot,
  Customer,
  Estimate,
  Part,
  Resource,
  Service,
  ServiceRequest,
  Specialist,
  Vehicle,
  WorkingHours,
} from '../types';

type Tab =
  | 'dashboard'
  | 'requests'
  | 'appointments'
  | 'customers'
  | 'vehicles'
  | 'services'
  | 'specialists'
  | 'resources'
  | 'schedule'
  | 'parts'
  | 'estimates';

export function AdminPage({ readOnly = false }: { readOnly?: boolean }) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [error, setError] = useState<string | null>(null);
  const [needsToken, setNeedsToken] = useState(false);
  const [tokenInput, setTokenInput] = useState(getAdminToken());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [hours, setHours] = useState<WorkingHours[]>([]);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [laborTitle, setLaborTitle] = useState('Замена передних тормозных колодок');
  const [laborPrice, setLaborPrice] = useState('2500');
  const [partQuery, setPartQuery] = useState('');
  const [compatibleParts, setCompatibleParts] = useState<Part[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (readOnly) {
        const [a, r, s, sp, res, e, p] = await Promise.all([
          api.getDemoAdminAppointments(),
          api.getDemoAdminRequests(),
          api.getDemoAdminServices(),
          api.getDemoAdminSpecialists(),
          api.getDemoAdminResources(),
          api.getDemoAdminEstimates(),
          api.getDemoAdminParts(),
        ]);
        setAppointments(a.data);
        setRequests(r.data);
        setServices(s.data);
        setSpecialists(sp.data);
        setResources(res.data);
        setEstimates(e.data);
        setParts(p.data);
        setNeedsToken(false);
        return;
      }
      const [a, r, c, v, s, sp, res, h, b, p, e] = await Promise.all([
        api.getAdminAppointments(),
        api.getAdminRequests(),
        api.getAdminCustomers(),
        api.getAdminVehicles(),
        api.getAdminServices(),
        api.getAdminSpecialists(),
        api.getAdminResources(),
        api.getAdminHours(),
        api.getAdminBlocked(),
        api.getAdminParts(),
        api.getAdminEstimates(),
      ]);
      setAppointments(a.data);
      setRequests(r.data);
      setCustomers(c.data);
      setVehicles(v.data);
      setServices(s.data);
      setSpecialists(sp.data);
      setResources(res.data);
      setHours(h.data);
      setBlocked(b.data);
      setParts(p.data);
      setEstimates(e.data);
      setNeedsToken(false);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) setNeedsToken(true);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    }
  }, [readOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  if (needsToken && !readOnly) {
    return (
      <div className="admin-layout">
        <h1>Кабинет администратора</h1>
        <p>Нужен ADMIN_TOKEN</p>
        <input value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setAdminToken(tokenInput);
            void load();
          }}
        >
          Войти
        </button>
        <Link className="btn btn-secondary" to="/">
          Открыть клиентское приложение
        </Link>
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'dashboard', label: 'Дашборд' },
    { id: 'requests', label: 'Заявки' },
    { id: 'appointments', label: 'Записи' },
    { id: 'customers', label: 'Клиенты' },
    { id: 'vehicles', label: 'Авто' },
    { id: 'services', label: 'Услуги' },
    { id: 'specialists', label: 'Мастера' },
    { id: 'resources', label: 'Посты' },
    { id: 'schedule', label: 'Расписание' },
    { id: 'parts', label: 'Запчасти' },
    { id: 'estimates', label: 'Сметы' },
  ];

  return (
    <div className="admin-layout">
      <header className="admin-head">
        <div>
          <p className="eyebrow">{readOnly ? 'Demo admin · только чтение' : 'Write console'}</p>
          <h1>Норд Авто</h1>
        </div>
        <Link className="btn btn-secondary" to="/">
          Открыть клиентское приложение
        </Link>
      </header>
      {error && <div className="card error-box">{error}</div>}
      <nav className="admin-tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'is-active' : ''}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && (
        <section className="admin-grid">
          <article className="card"><strong>{appointments.length}</strong><span>записей</span></article>
          <article className="card"><strong>{requests.length}</strong><span>заявок</span></article>
          <article className="card"><strong>{estimates.filter((item) => item.status === 'awaiting_approval').length}</strong><span>смет на согласовании</span></article>
        </section>
      )}

      {tab === 'requests' && requests.map((item) => (
        <article key={item.id} className="card">
          <strong>{item.vehicle.title}</strong>
          <p>{item.description}</p>
          <p className="muted">{item.status} · {item.customer.name}</p>
          {!readOnly && item.status !== 'converted' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                const diag = services.find((service) => service.name.includes('диагностика') || service.category === 'diagnostics');
                if (!diag) return;
                await api.adminPost(`/service-requests/${item.id}/convert`, {
                  serviceId: diag.id,
                  date: item.desiredDate || new Date().toISOString().slice(0, 10),
                  startTime: '11:00',
                });
                await load();
              }}
            >
              Назначить диагностику
            </button>
          )}
        </article>
      ))}

      {tab === 'appointments' && appointments.map((item) => (
        <article key={item.id} className={`card ${selectedAppointment?.id === item.id ? 'is-active' : ''}`}>
          <button type="button" className="plain" onClick={() => setSelectedAppointment(item)}>
            <strong>{item.service.name}</strong>
            <p className="muted">
              {formatDateLabel(item.date)} {item.startTime} · {item.vehicle.title} · {formatStatus(item.status)}
            </p>
            <p className="muted">{item.specialist.name} · {item.resource?.name}</p>
          </button>
          {!readOnly && selectedAppointment?.id === item.id && (
            <div className="stack">
              <select
                value={item.status}
                onChange={async (event) => {
                  await api.adminPatch(`/appointments/${item.id}`, { status: event.target.value });
                  await load();
                }}
              >
                {['booked', 'arrived', 'diagnosing', 'waiting_approval', 'in_progress', 'completed', 'cancelled', 'no_show'].map((status) => (
                  <option key={status} value={status}>{formatStatus(status as Appointment['status'])}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  await api.adminPost(`/appointments/${item.id}/inspection`, {
                    summary: 'Износ передних тормозных колодок.',
                    notes: 'Диски в допуске.',
                  });
                  await api.adminPost(`/appointments/${item.id}/estimate`);
                  await load();
                }}
              >
                Диагностика / смета
              </button>
            </div>
          )}
        </article>
      ))}

      {tab === 'customers' && customers.map((item) => (
        <article key={item.id} className="card">
          <strong>{item.name}</strong>
          <p className="muted">{item.phone || 'без телефона'}</p>
        </article>
      ))}

      {tab === 'vehicles' && vehicles.map((item) => (
        <article key={item.id} className="card">
          <strong>{item.title}</strong>
          <p className="muted">{item.year} · {item.mileage} км</p>
          {!readOnly && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                const next = Number(prompt('Новый пробег', String(item.mileage)));
                if (!Number.isFinite(next)) return;
                await api.adminPatch(`/vehicles/${item.id}`, { mileage: next });
                await load();
              }}
            >
              Изменить пробег
            </button>
          )}
        </article>
      ))}

      {tab === 'services' && services.map((item) => (
        <article key={item.id} className="card">
          <strong>{item.name}</strong>
          <p className="muted">{item.durationMinutes} мин · {formatPrice(item.price)}</p>
        </article>
      ))}

      {tab === 'specialists' && specialists.map((item) => (
        <article key={item.id} className="card">
          <strong>{item.name}</strong>
          <p className="muted">{item.specialization}</p>
        </article>
      ))}

      {tab === 'resources' && resources.map((item) => (
        <article key={item.id} className="card">
          <strong>{item.name}</strong>
          <p className="muted">{item.type}</p>
        </article>
      ))}

      {tab === 'schedule' && (
        <>
          {hours.map((item) => (
            <p key={item.id} className="muted">
              Мастер #{item.specialistId} · {weekdayShort(item.weekday)} · {item.startTime}–{item.endTime}
            </p>
          ))}
          {blocked.map((item) => (
            <article key={item.id} className="card">
              <p>
                {item.date} {item.startTime}–{item.endTime} · {item.reason || 'блок'}
              </p>
              {!readOnly && (
                <button type="button" className="btn btn-ghost" onClick={async () => {
                  await api.adminDelete(`/blocked-slots/${item.id}`);
                  await load();
                }}>
                  Снять
                </button>
              )}
            </article>
          ))}
        </>
      )}

      {tab === 'parts' && (
        <>
          <input
            placeholder="Поиск"
            value={partQuery}
            onChange={async (event) => {
              setPartQuery(event.target.value);
              const vehicleId = selectedAppointment?.vehicle.id ?? vehicles[0]?.id;
              const res = await api.getAdminParts(vehicleId);
              setCompatibleParts(
                res.data.filter((item) =>
                  `${item.brand} ${item.name} ${item.sku}`.toLowerCase().includes(event.target.value.toLowerCase()),
                ),
              );
            }}
          />
          {(compatibleParts.length ? compatibleParts : parts).slice(0, 40).map((item) => (
            <article key={item.id} className="card">
              <strong>{item.brand} {item.sku}</strong>
              <p className="muted">{item.name} · {formatPrice(item.price)}</p>
            </article>
          ))}
        </>
      )}

      {tab === 'estimates' && estimates.map((item) => (
        <article key={item.id} className="card">
          <strong>Смета #{item.id}</strong>
          <p className="muted">{item.status} · {formatPrice(item.totalAmount)}</p>
          {item.items.map((line) => (
            <p key={line.id} className="muted">{line.title} · {formatPrice(line.totalPrice)}</p>
          ))}
          {!readOnly && item.status === 'draft' && (
            <div className="stack">
              <input value={laborTitle} onChange={(e) => setLaborTitle(e.target.value)} />
              <input value={laborPrice} onChange={(e) => setLaborPrice(e.target.value)} />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  await api.adminPost(`/estimates/${item.id}/labor`, {
                    title: laborTitle,
                    qty: 1,
                    unitPrice: Number(laborPrice),
                  });
                  const appointment = appointments.find((row) => row.id === item.appointmentId);
                  const list = await api.getAdminParts(appointment?.vehicle.id);
                  const part = list.data[0];
                  if (part) {
                    await api.adminPost(`/estimates/${item.id}/parts`, { partId: part.id, qty: 1 });
                  }
                  await api.adminPost(`/estimates/${item.id}/submit`);
                  await load();
                }}
              >
                Добавить работы/деталь и отправить
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

export function DemoAdminPage() {
  return <AdminPage readOnly />;
}
