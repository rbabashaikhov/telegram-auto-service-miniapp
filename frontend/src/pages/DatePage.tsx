import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import { formatDateLabel } from '../lib/format';
import type { DayAvailability } from '../types';

export function DatePage() {
  const navigate = useNavigate();
  const booking = useBooking();
  const [days, setDays] = useState<DayAvailability[]>([]);

  useEffect(() => {
    if (!booking.service) {
      navigate('/booking/services');
      return;
    }
    api
      .getAvailability(booking.service.id, booking.anySpecialist ? null : booking.specialist?.id)
      .then((res) => setDays(res.data.calendar));
  }, [booking.anySpecialist, booking.service, booking.specialist, navigate]);

  return (
    <div className="page">
      <TopBar title="Дата" backTo="/booking/specialist" />
      <div className="date-grid">
        {days.map((day) => (
          <button
            key={day.date}
            type="button"
            className={`date-cell ${day.available ? '' : 'is-disabled'}`}
            disabled={!day.available}
            onClick={() => {
              booking.setDate(day.date);
              navigate('/booking/time');
            }}
          >
            <span>{formatDateLabel(day.date)}</span>
            <small>{day.available ? 'есть слоты' : 'нет'}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
