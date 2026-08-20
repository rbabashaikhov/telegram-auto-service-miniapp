import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { formatDateFull, formatPrice, formatStatus, SEVERITY_LABELS, TIMELINE } from '../lib/format';
import type { Appointment, AppointmentStatus, Estimate } from '../types';

export function AppointmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!id) return;
    const res = await api.getAppointment(Number(id));
    setAppointment(res.data.appointment);
    setEstimate(res.data.estimate);
    const items = res.data.estimate?.items ?? [];
    if (res.data.estimate?.status === 'awaiting_approval') {
      setSelectedIds(items.map((item) => item.id));
    } else {
      setSelectedIds(items.filter((item) => item.approved).map((item) => item.id));
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Ошибка'));
  }, [id]);

  const selectedTotal = useMemo(() => {
    if (!estimate) return 0;
    return estimate.items
      .filter((item) => selectedIds.includes(item.id))
      .reduce((sum, item) => sum + item.totalPrice, 0);
  }, [estimate, selectedIds]);

  function toggleItem(itemId: number) {
    setSelectedIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    );
  }

  async function decide(decision: 'approved' | 'rejected') {
    if (!appointment) return;
    setBusy(true);
    setError(null);
    try {
      await api.decideEstimate(
        appointment.id,
        decision,
        decision === 'approved' ? selectedIds : undefined,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить решение');
    } finally {
      setBusy(false);
    }
  }

  if (!appointment) {
    return (
      <div className="page">
        <TopBar title="Статус" backTo="/" />
        {error && <div className="card error-box">{error}</div>}
      </div>
    );
  }

  const currentIndex = TIMELINE.indexOf(appointment.status);
  const inspectionItems = estimate?.inspection?.items ?? [];

  return (
    <div className="page">
      <TopBar title="Статус автомобиля" backTo="/" />
      {error && <div className="card error-box">{error}</div>}
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
          {inspectionItems.length > 0 &&
            inspectionItems.map((item) => (
              <div key={item.id} className="inspection-item">
                <div>
                  <strong>{item.name}</strong>
                  {item.note && <p className="muted">{item.note}</p>}
                </div>
                <span className={`severity severity-${item.severity}`}>{SEVERITY_LABELS[item.severity]}</span>
              </div>
            ))}
        </article>
      )}

      {estimate && (
        <article className="card" data-demo-tour="estimate-card">
          <p className="eyebrow">Смета</p>
          {estimate.items.map((item) => {
            const awaiting = estimate.status === 'awaiting_approval';
            const checked = awaiting ? selectedIds.includes(item.id) : item.approved;
            return (
              <div key={item.id} className={`estimate-row ${awaiting ? 'is-toggle' : ''}`}>
                {awaiting ? (
                  <label className="estimate-check">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(item.id)}
                    />
                    <span>
                      {item.type === 'part' ? 'Запчасть' : 'Работа'}: {item.title}
                    </span>
                  </label>
                ) : (
                  <span>
                    {item.type === 'part' ? 'Запчасть' : 'Работа'}: {item.title}
                    {item.approved ? '' : ' · не согласовано'}
                  </span>
                )}
                <strong>{formatPrice(item.totalPrice)}</strong>
              </div>
            );
          })}
          <div className="estimate-total">
            <span>{estimate.status === 'awaiting_approval' ? 'К согласованию' : 'Итого'}</span>
            <strong>
              {formatPrice(estimate.status === 'awaiting_approval' ? selectedTotal : estimate.totalAmount)}
            </strong>
          </div>
          {estimate.status === 'awaiting_approval' && (
            <div className="cta-grid" data-demo-tour="estimate-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || selectedIds.length === 0}
                onClick={() => void decide('approved')}
              >
                Согласовать {formatPrice(selectedTotal)}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => void decide('rejected')}
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
