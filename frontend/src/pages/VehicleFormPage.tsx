import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import type { Vehicle } from '../types';

export function VehicleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [error, setError] = useState<string | null>(null);
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
      } else {
        await api.createVehicle(payload);
      }
      navigate('/vehicles');
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
          VIN
          <input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
        </label>
        <label>
          Пробег, км
          <input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} required />
        </label>
        <button type="submit" className="btn btn-primary btn-block">
          Сохранить
        </button>
      </form>
    </div>
  );
}
