import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GraduationCap } from 'lucide-react';
import { SchoolProvider, useSchool } from '../context/SchoolContext';
import Toasts from '../components/Toasts';
import ErrorBoundary from '../components/ErrorBoundary';
import BottomNav, { TABS } from './components/BottomNav';
import Login from './Login';
import Overview from './screens/Overview';
import Marks from './screens/Marks';
import Students from './screens/Students';
import Enrol from './screens/Enrol';
import Settings from './screens/Settings';
import Fees from './screens/Fees';
import { initNative, onBackButton } from './native';
import { popDismiss } from './dismissStack';

export default function FacultyApp() {
  const [booted, setBooted] = useState(false);

  // Initialise the native layer (status bar, keyboard listeners) before
  // the first paint so the chrome never flashes the wrong colour.
  useEffect(() => {
    let done = false;
    initNative().finally(() => {
      // A short hold so the splash does not flicker on a fast device.
      setTimeout(() => { if (!done) setBooted(true); }, 600);
    });
    return () => { done = true; };
  }, []);

  if (!booted) return <Splash />;

  return (
    <ErrorBoundary>
      <SchoolProvider>
        <Gate />
      </SchoolProvider>
    </ErrorBoundary>
  );
}

/* ============================================================
   Gate — PIN screen or the app proper.
   ============================================================ */
function Gate() {
  const { isTeacher } = useSchool();
  return isTeacher ? <Shell /> : (<><Login /><Toasts /></>);
}

/* ============================================================
   Shell — the signed-in app: one screen at a time plus the
   bottom navigation, with the Android back button wired up.
   ============================================================ */
function Shell() {
  const [tab, setTab] = useState('overview');
  // A screen can be opened on a particular student (Home → a fee defaulter).
  const [focus, setFocus] = useState(null);

  const go = useCallback((next, studentId = null) => {
    setTab(next);
    setFocus(studentId);
    // Each screen scrolls independently; start every one at the top.
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  /* Android back button:
       - an overlay is open → close it
       - not on Home        → go to Home
       - on Home            → return false so Android minimises the app
     Returning false rather than exiting matches what users expect:
     back from the first screen should not kill the app outright.

     The handler is held in a ref and registered once. Re-registering on
     every tab change would churn the native listener needlessly. */
  const tabRef = useRef(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  useEffect(() => onBackButton(() => {
    if (popDismiss()) return true;                       // close an open sheet
    if (tabRef.current !== 'overview') { go('overview'); return true; }
    return false;                                        // minimise the app
  }), [go]);

  const screens = {
    overview: <Overview onGo={go} />,
    marks: <Marks />,
    fees: <Fees initialStudentId={focus} />,
    students: <Students onGo={go} />,
    enrol: <Enrol onDone={go} />,
    settings: <Settings />,
  };

  return (
    <div className="min-h-screen bg-parchment-100">
      {/* key restarts the entry animation whenever the screen changes */}
      <div key={tab} className="animate-screen-in">
        {screens[tab]}
      </div>
      <BottomNav active={tab} onChange={go} />
      <Toasts />
    </div>
  );
}

/* ============================================================
   Splash — matches the Android launch theme so the handover
   from the native splash to the web view is seamless.
   ============================================================ */
function Splash() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ink-950 text-white">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-3xl bg-brass-500/25 blur-2xl animate-pulse" />
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-brass-400 to-brass-600 flex items-center justify-center shadow-brass">
          <GraduationCap className="w-10 h-10 text-ink-950" strokeWidth={2.3} />
        </div>
      </div>
      <p className="font-display text-base font-extrabold mt-5">Asha Deep Adarsh</p>
      <p className="text-[11px] text-brass-400 font-bold tracking-[.2em] mt-1">FACULTY APP</p>
    </div>
  );
}
