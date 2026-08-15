import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import { formatDateFull, formatDuration, formatPrice } from '../lib/format';

export function ConfirmPage() {
  const navigate = useNavigate();
  const booking = useBooking();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!booking.vehicle || !booking.service || !booking.date || !booking.startTime) {
    navigate('/booking/services');
    return null;
  }

  async function onConfirm() {
    if (!booking.vehicle || !booking.service || !booking.date || !booking.startTime) return;
    setBusy(true);
    try {
      const created = await api.createAppointment({
        vehicleId: booking.vehicle.id,
        serviceId: booking.service.id,
        specialistId: booking.specialist?.id ?? null,
        date: booking.date,
        startTime: booking.startTime,
        sourceAppointmentId: booking.sourceAppointmentId,
      });
      booking.reset();
      navigate(`/booking/success?id=${created.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось записаться');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <TopBar title="Подтверждение" backTo="/booking/time" />
      {error && <div className="card error-box">{error}</div>}
      <article className="card" data-demo-tour="confirmation">
        <p className="eyebrow">{booking.vehicle.title}</p>
        <h2>{booking.service.name}</h2>
        <p className="muted">
          {formatDateFull(booking.date)} · {booking.startTime} · {formatDuration(booking.service.durationMinutes)}
        </p>
        <p>{booking.anySpecialist ? 'Специалист будет назначен автоматически' : booking.specialist?.name}</p>
        <p className="price">{formatPrice(booking.service.price)}</p>
        {booking.warnings.map((item) => (
          <p key={item} className="hint">{item}</p>
        ))}
      </article>
      <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void onConfirm()}>
        Подтвердить запись
      </button>
    </div>
  );
}

export function SuccessPage() {
  return (
    <div className="page">
      <TopBar title="Готово" backTo="/" />
      <article className="card">
        <p className="eyebrow">Запись создана</p>
        <h2>Вы записаны</h2>
        <p className="lead">Статус автомобиля появится в портале. Пост и специалист уже назначены сервисом.</p>
      </article>
    </div>
  );
}
