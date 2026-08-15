import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { formatDateFull, formatPrice, formatStatus, TIMELINE } from '../lib/format';
import type { Appointment, AppointmentStatus, Estimate } from '../types';

export function AppointmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    const res = await api.getAppointment(Number(id));
    setAppointment(res.data.appointment);
    setEstimate(res.data.estimate);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Ошибка'));
  }, [id]);

  if (!appointment) {
    return (
      <div className="page">
        <TopBar title="Статус" backTo="/" />
        {error && <div className="card error-box">{error}</div>}
      </div>
    );
  }

  const currentIndex = TIMELINE.indexOf(appointment.status);

  return (
    <div className="page">
      <TopBar title="Статус автомобиля" backTo="/" />
      <article className="card">
        <p className="eyebrow">{appointment.vehicle.title}</p>
        <h2>{appointment.service.name}</h2>
        <p className="muted">
          {formatDateFull(appointment.date)} · {appointment.startTime}
        </p>
        <p className="status-pill">{formatStatus(appointment.status)}</p>
      </article>

      <ol className="timeline" data-demo-tour="status-timeline">
        {TIMELINE.map((status: AppointmentStatus, index) => (
          <li key={status} className={index <= currentIndex && currentIndex >= 0 ? 'is-done' : ''}>
            {formatStatus(status)}
          </li>
        ))}
      </ol>

      {estimate?.inspection && (
        <article className="card" data-demo-tour="inspection-card">
          <p className="eyebrow">Результат диагностики</p>
          <p>{estimate.inspection.summary}</p>
          {estimate.inspection.notes && <p className="muted">{estimate.inspection.notes}</p>}
        </article>
      )}

      {estimate && (
        <article className="card" data-demo-tour="estimate-card">
          <p className="eyebrow">Смета</p>
          {estimate.items.map((item) => (
            <div key={item.id} className="estimate-row">
              <span>
                {item.type === 'part' ? 'Запчасть' : 'Работа'}: {item.title}
              </span>
              <strong>{formatPrice(item.totalPrice)}</strong>
            </div>
          ))}
          <div className="estimate-total">
            <span>Итого</span>
            <strong>{formatPrice(estimate.totalAmount)}</strong>
          </div>
          {estimate.status === 'awaiting_approval' && (
            <div className="cta-grid" data-demo-tour="estimate-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  await api.decideEstimate(appointment.id, 'approved');
                  await load();
                }}
              >
                Согласовать
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  await api.decideEstimate(appointment.id, 'rejected');
                  await load();
                }}
              >
                Отклонить
              </button>
            </div>
          )}
        </article>
      )}

      {appointment.status === 'booked' && (
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={async () => {
            await api.cancelAppointment(appointment.id);
            navigate('/');
          }}
        >
          Отменить запись
        </button>
      )}
    </div>
  );
}
