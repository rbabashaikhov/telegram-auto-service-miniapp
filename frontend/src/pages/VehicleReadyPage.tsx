import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import { formatMileage, formatPrice, SEVERITY_LABELS } from '../lib/format';
import type { Vehicle, VehicleMaintenance } from '../types';

export function VehicleReadyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const booking = useBooking();
  const setVehicleBooking = booking.setVehicle;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [maintenance, setMaintenance] = useState<VehicleMaintenance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const vehicleId = Number(id);
    Promise.all([api.getVehicle(vehicleId), api.getVehicleMaintenance(vehicleId)])
      .then(([vehicleRes, maintenanceRes]) => {
        setVehicle(vehicleRes.data);
        setMaintenance(maintenanceRes.data);
        setVehicleBooking(vehicleRes.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'));
  }, [id, setVehicleBooking]);

  async function bookService(preferTo = false) {
    if (vehicle) booking.setVehicle(vehicle);
    if (!preferTo) {
      navigate('/booking/services');
      return;
    }
    const services = await api.getServices();
    const to =
      services.data.find((item) => item.name === 'ТО') ??
      services.data.find((item) => item.category === 'maintenance');
    if (to) {
      booking.setService(to);
      navigate('/booking/specialist');
      return;
    }
    navigate('/booking/services');
  }

  return (
    <div className="page">
      <TopBar title="Автомобиль добавлен" backTo="/" />
      {error && <div className="card error-box">{error}</div>}
      {vehicle && (
        <article className="card">
          <p className="eyebrow">Ваш автомобиль</p>
          <h2>{vehicle.title}</h2>
          <p className="muted">
            {vehicle.year}
            {vehicle.engine ? ` · ${vehicle.engine}` : ''}
            {vehicle.vin ? ` · VIN ${vehicle.vin}` : ''}
          </p>
          <p>Пробег: {formatMileage(vehicle.mileage)}</p>
        </article>
      )}

      {maintenance?.schedule && (
        <article className="card">
          <p className="eyebrow">Регламент ТО</p>
          <p className="muted">{maintenance.schedule.disclaimer}</p>
          <ul className="maintenance-list">
            {maintenance.schedule.items.map((item) => (
              <li key={item.id}>
                {item.name} — каждые {formatMileage(item.intervalKm)}, следующее {formatMileage(item.nextDueMileage)}
              </li>
            ))}
          </ul>
        </article>
      )}

      {maintenance?.schedule.nearestMilestone && (
        <article className="card">
          <p className="eyebrow">Ближайшее ТО</p>
          <h2>{maintenance.schedule.nearestMilestone.name}</h2>
          <p className="muted">
            {formatMileage(maintenance.schedule.nearestMilestone.dueMileage)} · через{' '}
            {formatMileage(maintenance.schedule.nearestMilestone.remainingKm)}
          </p>
          {maintenance.schedule.recommendedOperations.length > 0 && (
            <ul className="maintenance-list">
              {maintenance.schedule.recommendedOperations.map((item) => (
                <li key={item.name}>
                  {item.name} — {item.reason}
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn-primary btn-block" onClick={() => void bookService(true)}>
            Записаться на ТО
          </button>
        </article>
      )}

      {maintenance && maintenance.completedWork.length > 0 && (
        <article className="card">
          <p className="eyebrow">Выполненные работы</p>
          <ul className="maintenance-list">
            {maintenance.completedWork.map((visit) => (
              <li key={visit.id}>
                {visit.service.name} · {formatMileage(visit.vehicle.mileage)} · {formatPrice(visit.estimateTotal ?? visit.price)}
              </li>
            ))}
          </ul>
        </article>
      )}

      {maintenance && maintenance.inspectionRecommendations.length > 0 && (
        <article className="card">
          <p className="eyebrow">Рекомендации по диагностике</p>
          <ul className="maintenance-list">
            {maintenance.inspectionRecommendations.map((item) => (
              <li key={`${item.appointmentId}-${item.name}`}>
                {item.name} — {SEVERITY_LABELS[item.severity]}
                {item.note ? `. ${item.note}` : ''}
              </li>
            ))}
          </ul>
        </article>
      )}

      <div className="cta-grid">
        <button type="button" className="btn btn-primary" onClick={() => void bookService(false)}>
          Записаться в сервис
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/problem')}>
          Что случилось с автомобилем?
        </button>
      </div>
    </div>
  );
}
