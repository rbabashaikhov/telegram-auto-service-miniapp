import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DemoChrome } from './demo-tour/DemoChrome';
import { isSalesDemoAdminPath } from './demo-tour/eligibility';
import { useDemoTour } from './demo-tour/context';
import { AdminPage, DemoAdminPage } from './pages/AdminPage';
import { AppointmentPage } from './pages/AppointmentPage';
import { ConfirmPage, SuccessPage } from './pages/ConfirmPage';
import { DatePage } from './pages/DatePage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { ProblemPage, ProblemSuccessPage } from './pages/ProblemPage';
import { ServicesPage } from './pages/ServicesPage';
import { SpecialistPage } from './pages/SpecialistPage';
import { TimePage } from './pages/TimePage';
import { VehicleFormPage } from './pages/VehicleFormPage';
import { VehiclesPage } from './pages/VehiclesPage';

export default function App() {
  const location = useLocation();
  const isAdmin = isSalesDemoAdminPath(location.pathname);
  const tour = useDemoTour();

  return (
    <div className={isAdmin ? undefined : 'app-shell'}>
      {tour.showChrome && (
        <DemoChrome
          showTour={tour.demoTourEnabled}
          showAdmin={tour.demoAdminPreviewEnabled}
          onStartTour={tour.start}
        />
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/vehicles/new" element={<VehicleFormPage />} />
        <Route path="/vehicles/:id" element={<VehicleFormPage />} />
        <Route path="/problem" element={<ProblemPage />} />
        <Route path="/problem/success" element={<ProblemSuccessPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/booking/services" element={<ServicesPage />} />
        <Route path="/booking/specialist" element={<SpecialistPage />} />
        <Route path="/booking/date" element={<DatePage />} />
        <Route path="/booking/time" element={<TimePage />} />
        <Route path="/booking/confirm" element={<ConfirmPage />} />
        <Route path="/booking/success" element={<SuccessPage />} />
        <Route path="/appointments/:id" element={<AppointmentPage />} />
        <Route path="/demo/admin" element={<DemoAdminPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
