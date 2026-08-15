import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import { formatDuration, formatPrice } from '../lib/format';
import type { Service } from '../types';

export function ServicesPage() {
  const navigate = useNavigate();
  const booking = useBooking();
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getServices()
      .then((res) => setServices(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'));
  }, []);

  return (
    <div className="page">
      <TopBar title="Услуга" backTo="/" />
      {error && <div className="card error-box">{error}</div>}
      {services.map((service) => (
        <button
          key={service.id}
          type="button"
          className="card service-card"
          data-demo-tour={service.category === 'diagnostics' ? 'service-diagnostics' : undefined}
          onClick={() => {
            booking.setService(service);
            navigate('/booking/specialist');
          }}
        >
          <strong>{service.name}</strong>
          <p className="muted">{service.description}</p>
          <p className="meta">
            {formatDuration(service.durationMinutes)} · {formatPrice(service.price)}
          </p>
        </button>
      ))}
    </div>
  );
}
