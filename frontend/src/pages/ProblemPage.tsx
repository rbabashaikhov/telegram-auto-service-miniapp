import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';

const CATEGORIES = [
  { id: 'noise', label: 'Посторонний звук' },
  { id: 'dashboard', label: 'Ошибка на панели' },
  { id: 'brakes', label: 'Проблемы с тормозами' },
  { id: 'suspension', label: 'Подвеска' },
  { id: 'engine', label: 'Двигатель' },
  { id: 'electrical', label: 'Электрика' },
  { id: 'vibration', label: 'Вибрация' },
  { id: 'other', label: 'Другое' },
];

export function ProblemPage() {
  const navigate = useNavigate();
  const booking = useBooking();
  const [category, setCategory] = useState('noise');
  const [description, setDescription] = useState('При повороте руля слышен стук спереди.');
  const [desiredDate, setDesiredDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!booking.vehicle) {
      navigate('/vehicles');
      return;
    }
    try {
      await api.createServiceRequest({
        vehicleId: booking.vehicle.id,
        description,
        symptomCategory: category,
        desiredDate: desiredDate || null,
      });
      navigate('/problem/success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку');
    }
  }

  return (
    <div className="page">
      <TopBar title="Что случилось?" backTo="/" />
      {error && <div className="card error-box">{error}</div>}
      <form className="stack" data-demo-tour="problem-form" onSubmit={(event) => void onSubmit(event)}>
        <p className="lead">Что случилось с автомобилем?</p>
        <div className="chip-row">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip ${category === item.id ? 'is-active' : ''}`}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label>
          Опишите подробнее
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Желаемая дата
          <input type="date" value={desiredDate} onChange={(e) => setDesiredDate(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary btn-block">
          Отправить заявку
        </button>
      </form>
    </div>
  );
}

export function ProblemSuccessPage() {
  return (
    <div className="page">
      <TopBar title="Заявка" backTo="/" />
      <article className="card">
        <p className="eyebrow">Принято</p>
        <h2>Заявка принята</h2>
        <p className="lead">Сервис свяжется с вами или предложит время диагностики.</p>
      </article>
    </div>
  );
}
