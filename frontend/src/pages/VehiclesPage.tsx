import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import { formatMileage } from '../lib/format';
import type { Vehicle } from '../types';

export function VehiclesPage() {
  const navigate = useNavigate();
  const booking = useBooking();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.getVehicles();
      setVehicles(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="page">
      <TopBar title="Автомобили" backTo="/" />
      {error && <div className="card error-box">{error}</div>}
      {vehicles.map((vehicle) => (
        <article key={vehicle.id} className={`card ${vehicle.isActive ? 'is-active' : ''}`}>
          <h2>{vehicle.title}</h2>
          <p className="muted">
            {vehicle.subtitle} · {formatMileage(vehicle.mileage)}
          </p>
          <div className="row-actions">
            {!vehicle.isActive && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  await api.activateVehicle(vehicle.id);
                  booking.setVehicle(vehicle);
                  await load();
                }}
              >
                Выбрать
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => navigate(`/vehicles/${vehicle.id}`)}>
              Пробег
            </button>
          </div>
        </article>
      ))}
      <Link className="btn btn-primary btn-block" to="/vehicles/new">
        Добавить автомобиль
      </Link>
    </div>
  );
}
