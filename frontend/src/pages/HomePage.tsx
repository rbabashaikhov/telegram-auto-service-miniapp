import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';
import { useBooking } from '../context/BookingContext';
import { useBusiness } from '../context/BusinessContext';
import { formatDateLabel, formatMileage, formatPrice, formatStatus } from '../lib/format';
import type { Portal, Service } from '../types';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const business = useBusiness();
  const booking = useBooking();
  const setVehicle = booking.setVehicle;
  const [portal, setPortal] = useState<Portal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getPortal()
      .then((res) => {
        if (!cancelled) {
          setPortal(res.data);
          if (res.data.activeVehicle) setVehicle(res.data.activeVehicle);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось загрузить портал');
      });
    return () => {
      cancelled = true;
    };
  }, [setVehicle]);

  const vehicle = portal?.activeVehicle;
  const name = portal?.customer.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Гость';

  async function onRepeat() {
    if (!portal?.lastVisit) return;
    const [contextRes, servicesRes, specialistsRes, vehiclesRes] = await Promise.all([
      api.getRepeatContext(portal.lastVisit.id),
      api.getServices(),
      api.getSpecialists(),
      api.getVehicles(),
    ]);
    const service = servicesRes.data.find((item: Service) => item.id === contextRes.data.serviceId) ?? null;
    const specialist = specialistsRes.data.find((item) => item.id === contextRes.data.specialistId) ?? null;
    const nextVehicle = vehiclesRes.data.find((item) => item.id === contextRes.data.vehicleId) ?? vehicle ?? null;
    booking.hydrateRepeat({
      vehicle: nextVehicle,
      service,
      specialist,
      sourceAppointmentId: contextRes.data.sourceAppointmentId,
      warnings: contextRes.data.warnings.map((item) => item.message),
    });
    navigate(service ? '/booking/specialist' : '/booking/services');
  }

  return (
    <div className="page">
      <section className="hero-block">
        <p className="eyebrow">{business.businessName}</p>
        <h1 className="brand">Здравствуйте, {name.split(' ')[0]}</h1>
        <p className="lead">Автомобиль, запись и статус работ — в одном месте.</p>
      </section>

      {error && <div className="card error-box">{error}</div>}

      {vehicle ? (
        <article className="card vehicle-card" data-demo-tour="vehicle-card">
          <p className="eyebrow">Ваш автомобиль</p>
          <h2>{vehicle.title}</h2>
          <p className="muted">
            {vehicle.year}
            {vehicle.engine ? ` · ${vehicle.engine}` : ''}
            {vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ''}
          </p>
          <div className="stat-row">
            <div>
              <strong>{formatMileage(vehicle.mileage)}</strong>
              <span>пробег</span>
            </div>
            <div>
              <strong>{portal?.lastVisit ? formatDateLabel(portal.lastVisit.date) : '—'}</strong>
              <span>последнее ТО</span>
            </div>
          </div>
          {portal?.reminder && <p className="hint">{portal.reminder.message}</p>}
          <Link className="text-link" to="/vehicles">
            Все автомобили
          </Link>
        </article>
      ) : (
        <article className="card">
          <h2>Добавьте автомобиль</h2>
          <p className="muted">Чтобы записаться, сначала укажите машину.</p>
          <Link className="btn btn-primary btn-block" to="/vehicles/new">
            Добавить автомобиль
          </Link>
        </article>
      )}

      <div className="cta-grid">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/booking/services')}
          disabled={!vehicle}
        >
          Записаться
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          data-demo-tour="problem-cta"
          onClick={() => navigate('/problem')}
          disabled={!vehicle}
        >
          Что-то сломалось
        </button>
      </div>
      <Link className="btn btn-ghost btn-block" to="/history">
        История обслуживания
      </Link>

      {portal?.nextAppointment && (
        <Link className="card link-card" to={`/appointments/${portal.nextAppointment.id}`}>
          <p className="eyebrow">Следующая запись</p>
          <strong>{portal.nextAppointment.service.name}</strong>
          <p className="muted">
            {formatDateLabel(portal.nextAppointment.date)} · {portal.nextAppointment.startTime} ·{' '}
            {formatStatus(portal.nextAppointment.status)}
          </p>
        </Link>
      )}

      {portal?.openEstimate?.status === 'awaiting_approval' && (
        <Link className="card link-card" to={`/appointments/${portal.openEstimate.appointmentId}`}>
          <p className="eyebrow">Нужно согласование</p>
          <strong>{formatPrice(portal.openEstimate.totalAmount)}</strong>
          <p className="muted">Смета работ и запчастей ждёт решения</p>
        </Link>
      )}

      {portal?.lastVisit && (
        <article className="card">
          <p className="eyebrow">Последний визит</p>
          <strong>{portal.lastVisit.service.name}</strong>
          <p className="muted">
            {formatDateLabel(portal.lastVisit.date)} · {formatPrice(portal.lastVisit.price)}
          </p>
          <button type="button" className="btn btn-secondary btn-block" data-demo-tour="repeat-booking" onClick={() => void onRepeat()}>
            Повторить обслуживание
          </button>
        </article>
      )}
    </div>
  );
}
