import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Service, Specialist, Vehicle } from '../types';

export interface BookingState {
  vehicle: Vehicle | null;
  service: Service | null;
  specialist: Specialist | null;
  anySpecialist: boolean;
  date: string | null;
  startTime: string | null;
  sourceAppointmentId: number | null;
  warnings: string[];
  setVehicle: (vehicle: Vehicle | null) => void;
  setService: (service: Service | null) => void;
  setSpecialist: (specialist: Specialist | null, anySpecialist?: boolean) => void;
  setDate: (date: string) => void;
  setStartTime: (time: string) => void;
  hydrateRepeat: (params: {
    vehicle: Vehicle | null;
    service: Service | null;
    specialist: Specialist | null;
    sourceAppointmentId: number;
    warnings: string[];
  }) => void;
  selectSpecialistAndDate: (specialist: Specialist | null, date: string, anySpecialist?: boolean) => void;
  reset: () => void;
}

const BookingContext = createContext<BookingState | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [vehicle, setVehicleState] = useState<Vehicle | null>(null);
  const [service, setServiceState] = useState<Service | null>(null);
  const [specialist, setSpecialistState] = useState<Specialist | null>(null);
  const [anySpecialist, setAnySpecialist] = useState(true);
  const [date, setDateState] = useState<string | null>(null);
  const [startTime, setStartTimeState] = useState<string | null>(null);
  const [sourceAppointmentId, setSourceAppointmentId] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const value = useMemo<BookingState>(
    () => ({
      vehicle,
      service,
      specialist,
      anySpecialist,
      date,
      startTime,
      sourceAppointmentId,
      warnings,
      setVehicle: setVehicleState,
      setService: (next) => {
        setServiceState(next);
        setSpecialistState(null);
        setAnySpecialist(true);
        setDateState(null);
        setStartTimeState(null);
      },
      setSpecialist: (next, any = false) => {
        setSpecialistState(next);
        setAnySpecialist(any);
        setDateState(null);
        setStartTimeState(null);
      },
      setDate: (next) => {
        setDateState(next);
        setStartTimeState(null);
      },
      setStartTime: setStartTimeState,
      hydrateRepeat: (params) => {
        setVehicleState(params.vehicle);
        setServiceState(params.service);
        setSpecialistState(params.specialist);
        setAnySpecialist(!params.specialist);
        setDateState(null);
        setStartTimeState(null);
        setSourceAppointmentId(params.sourceAppointmentId);
        setWarnings(params.warnings);
      },
      selectSpecialistAndDate: (nextSpecialist, nextDate, any = false) => {
        setSpecialistState(nextSpecialist);
        setAnySpecialist(any);
        setDateState(nextDate);
        setStartTimeState(null);
      },
      reset: () => {
        setVehicleState(null);
        setServiceState(null);
        setSpecialistState(null);
        setAnySpecialist(true);
        setDateState(null);
        setStartTimeState(null);
        setSourceAppointmentId(null);
        setWarnings([]);
      },
    }),
    [anySpecialist, date, service, sourceAppointmentId, specialist, startTime, vehicle, warnings],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingState {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
