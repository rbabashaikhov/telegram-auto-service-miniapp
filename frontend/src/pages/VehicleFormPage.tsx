import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import { formatMileage } from '../lib/format';
import type { MaintenanceSchedule, Vehicle } from '../types';

export function VehicleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const booking = useBooking();
  const editing = Boolean(id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [schedule, setSchedule] = useState<MaintenanceSchedule | null>(null);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    make: '',
    model: '',
    year: String(new Date().getFullYear()),
    engine: '',
    licensePlate: '',
    vin: '',
    mileage: '',
  });

  useEffect(() => {
    if (!id) return;
    api.getVehicles().then((res) => {
      const vehicle = res.data.find((item: Vehicle) => String(item.id) === id);
      if (!vehicle) return;
      setForm({
        make: vehicle.make,
        model: vehicle.model,
        year: String(vehicle.year),
        engine: vehicle.engine ?? '',
        licensePlate: vehicle.licensePlate ?? '',
        vin: vehicle.vin ?? '',
        mileage: String(vehicle.mileage),
      });
    }).catch((err) => setError(err instanceof Error ? err.message : 'Ошибка'));
  }, [id]);

  async function onIdentify() {
    if (!form.vin.trim()) {
      setError('Введите VIN');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const mileage = form.mileage ? Number(form.mileage) : undefined;
      const res = await api.decodeVin({ vin: form.vin.trim(), mileage });
      const identified = res.data.identification;
      setForm((current) => ({
        ...current,
        make: identified.make || current.make,
        model: identified.model || current.model,
        year: identified.year ? String(identified.year) : current.year,
        engine: identified.engine ?? current.engine,
        vin: identified.vin,
      }));
      setDemoMessage(identified.message);
      setSchedule(res.data.schedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось определить VIN');
    } finally {
      setBusy(false);
    }
  }

  async function loadSchedule(mileageValue: string) {
    if (!form.vin.trim() || !mileageValue) return;
    try {
      const res = await api.decodeVin({ vin: form.vin.trim(), mileage: Number(mileageValue) });
      setSchedule(res.data.schedule);
      if (res.data.identification.message) setDemoMessage(res.data.identification.message);
    } catch {
      setSchedule(null);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const payload = {
        make: form.make.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        engine: form.engine || null,
        licensePlate: form.licensePlate || null,
        vin: form.vin || null,
        mileage: Number(form.mileage || 0),
      };
      if (editing && id) {
        await api.updateVehicle(Number(id), payload);
        navigate('/vehicles');
        return;
      }
      const created = await api.createVehicle(payload);
      booking.setVehicle(created.data);
      navigate(`/vehicles/${created.data.id}/next`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  }

  return (
    <div className="page">
      <TopBar title={editing ? 'Автомобиль' : 'Новый автомобиль'} backTo="/vehicles" />
      {error && <div className="card error-box">{error}</div>}
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        <label>
          VIN
          <input
            value={form.vin}
            onChange={(e) => setForm({ ...form, vin: e.target.value })}
            placeholder="WVGZZZ5NZKM012345"
          />
        </label>
        <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => void onIdentify()}>
          Определить автомобиль
        </button>
        {demoMessage && <p className="hint">{demoMessage}</p>}
        <label>
          Марка
          <input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} required />
        </label>
        <label>
          Модель
          <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
        </label>
        <label>
          Год
          <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
        </label>
        <label>
          Двигатель
          <input value={form.engine} onChange={(e) => setForm({ ...form, engine: e.target.value })} placeholder="2.0 TSI" />
        </label>
        <label>
          Госномер
          <input value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
        </label>
        <label>
          Пробег, км
          <input
            type="number"
            value={form.mileage}
            onChange={(e) => {
              setForm({ ...form, mileage: e.target.value });
              void loadSchedule(e.target.value);
            }}
            required
          />
        </label>
        {schedule && (
          <article className="card">
            <p className="eyebrow">Регламент ТО (демо)</p>
            <p className="muted">{schedule.disclaimer}</p>
            {schedule.nearestMilestone && (
              <p>
                Ближайшее ТО: {schedule.nearestMilestone.name} · {formatMileage(schedule.nearestMilestone.dueMileage)}
              </p>
            )}
            {schedule.recommendedOperations.length > 0 && (
              <ul className="maintenance-list">
                {schedule.recommendedOperations.map((item) => (
                  <li key={item.name}>
                    {item.name} — {item.reason}
                  </li>
                ))}
              </ul>
            )}
          </article>
        )}
        <button type="submit" className="btn btn-primary btn-block">
          Сохранить
        </button>
      </form>
    </div>
  );
}
