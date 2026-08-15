import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import type { Specialist } from '../types';

export function SpecialistPage() {
  const navigate = useNavigate();
  const booking = useBooking();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);

  useEffect(() => {
    if (!booking.service) {
      navigate('/booking/services');
      return;
    }
    api.getSpecialists(booking.service.id).then((res) => setSpecialists(res.data));
  }, [booking.service, navigate]);

  return (
    <div className="page">
      <TopBar title="Специалист" backTo="/booking/services" />
      <button
        type="button"
        className="card service-card"
        onClick={() => {
          booking.setSpecialist(null, true);
          navigate('/booking/date');
        }}
      >
        <strong>Любой специалист</strong>
        <p className="muted">Сервис сам назначит свободного мастера и пост.</p>
      </button>
      {specialists.map((item) => (
        <button
          key={item.id}
          type="button"
          className="card service-card"
          onClick={() => {
            booking.setSpecialist(item, false);
            navigate('/booking/date');
          }}
        >
          <strong>{item.name}</strong>
          <p className="muted">{item.specialization}</p>
        </button>
      ))}
    </div>
  );
}
