import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import { formatDateFull, formatMileage, formatPrice } from '../lib/format';
import type { HistoryVisit } from '../types';

export function HistoryPage() {
  const navigate = useNavigate();
  const booking = useBooking();
  const [visits, setVisits] = useState<HistoryVisit[]>([]);

  useEffect(() => {
    api.getHistory().then((res) => setVisits(res.data));
  }, []);

  async function onRepeat(visit: HistoryVisit) {
    const [contextRes, servicesRes, specialistsRes, vehiclesRes] = await Promise.all([
      api.getRepeatContext(visit.id),
      api.getServices(),
      api.getSpecialists(),
      api.getVehicles(),
    ]);
    booking.hydrateRepeat({
      vehicle: vehiclesRes.data.find((item) => item.id === contextRes.data.vehicleId) ?? null,
      service: servicesRes.data.find((item) => item.id === contextRes.data.serviceId) ?? null,
      specialist: specialistsRes.data.find((item) => item.id === contextRes.data.specialistId) ?? null,
      sourceAppointmentId: contextRes.data.sourceAppointmentId,
      warnings: contextRes.data.warnings.map((item) => item.message),
    });
    navigate('/booking/specialist');
  }

  return (
    <div className="page">
      <TopBar title="История обслуживания" backTo="/" />
      <div data-demo-tour="visit-history">
        {visits.map((visit) => (
          <article key={visit.id} className="card">
            <p className="eyebrow">Дата</p>
            <p>{formatDateFull(visit.date)}</p>
            <p className="eyebrow">Работы</p>
            <h2>{visit.service.name}</h2>
            {visit.laborTitles.filter((title) => title !== visit.service.name).map((title) => (
              <p key={title} className="muted">{title}</p>
            ))}
            <p className="muted">Пробег: {formatMileage(visit.vehicle.mileage)}</p>
            <p className="price">Стоимость: {formatPrice(visit.estimateTotal ?? visit.price)}</p>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => void onRepeat(visit)}>
              Повторить обслуживание
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
