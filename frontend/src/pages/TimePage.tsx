import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import type { SlotOption } from '../types';

export function TimePage() {
  const navigate = useNavigate();
  const booking = useBooking();
  const [slots, setSlots] = useState<SlotOption[]>([]);

  useEffect(() => {
    if (!booking.service || !booking.date) {
      navigate('/booking/date');
      return;
    }
    api
      .getSlots(booking.service.id, booking.date, booking.anySpecialist ? null : booking.specialist?.id)
      .then((res) => setSlots(res.data.slots));
  }, [booking.anySpecialist, booking.date, booking.service, booking.specialist, navigate]);

  return (
    <div className="page">
      <TopBar title="Время" backTo="/booking/date" />
      <div className="slot-grid" data-demo-tour="available-slots">
        {slots.map((slot) => (
          <button
            key={`${slot.time}-${slot.specialistId}`}
            type="button"
            className="slot-btn"
            onClick={() => {
              booking.setStartTime(slot.time);
              if (booking.anySpecialist) {
                booking.selectSpecialistAndDate(
                  { id: slot.specialistId, name: slot.specialistName, specialization: '', description: '', active: true, displayOrder: 0 },
                  booking.date!,
                  true,
                );
                booking.setStartTime(slot.time);
              }
              navigate('/booking/confirm');
            }}
          >
            {slot.time}
            {booking.anySpecialist && <small>{slot.specialistName}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}
