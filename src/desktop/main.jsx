import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { GraduationCap, LogIn, ShieldCheck } from 'lucide-react';
import { SchoolProvider, useSchool } from '../context/SchoolContext';
import ErrorBoundary from '../components/ErrorBoundary';
import Toasts from '../components/Toasts';
import PinModal from '../components/PinModal';
import { RouteLoader } from '../components/Loaders';
import { SCHOOL } from '../data/school';
import '../index.css';

/* ============================================================
   Windows staff app.

   The same staff dashboard as the website — marks, register,
   fee desk with receipt printing, notices, staff — packaged as
   a desktop program (see electron/main.cjs). None of the public
   pages ship in it, exactly as the Android app carries only the
   faculty screens.
   ============================================================ */
const FacultyDashboard = lazy(() => import('../pages/FacultyDashboard'));

function Gate() {
  const { isTeacher, authReady, setPinModalOpen } = useSchool();

  if (!authReady) return <RouteLoader />;
  if (isTeacher) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <div className="pt-6"><FacultyDashboard /></div>
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-parchment-100 via-white to-brass-50">
      <div className="panel p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-ink-950 text-brass-400 flex items-center justify-center mb-5 shadow-lift">
          <GraduationCap className="w-8 h-8" strokeWidth={2.2} />
        </div>
        <span className="eyebrow mx-auto"><ShieldCheck className="w-3.5 h-3.5" /> Staff only</span>
        <h1 className="font-display text-2xl font-extrabold text-ink-950 mt-3">{SCHOOL.shortName} Staff</h1>
        <p className="text-[13px] text-ink-soft mt-2">
          Sign in with the email and password the school gave you — the same as the website and the Android app.
        </p>
        <button onClick={() => setPinModalOpen(true)} className="btn-primary w-full mt-6">
          <LogIn className="w-4 h-4" /> Sign in
        </button>
      </div>
    </div>
  );
}

function DesktopApp() {
  const { isTeacher, setPinModalOpen, authReady } = useSchool();
  // Open the sign-in dialog straight away; it is the only thing to do here.
  React.useEffect(() => { if (authReady && !isTeacher) setPinModalOpen(true); }, [authReady, isTeacher, setPinModalOpen]);
  return (
    <>
      <Gate />
      <PinModal />
      <Toasts />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <SchoolProvider>
          <DesktopApp />
        </SchoolProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
