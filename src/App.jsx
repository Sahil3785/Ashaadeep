import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

import { SchoolProvider } from './context/SchoolContext';
import Background from './components/Background';
import Header from './components/Header';
import Footer from './components/Footer';
import NoticeTicker from './components/NoticeTicker';
import Toasts from './components/Toasts';
import PinModal from './components/PinModal';
import ProtectedRoute from './components/ProtectedRoute';
import { ScrollReset, BackToTop } from './components/ScrollToTop';
import { SplashScreen, RouteLoader, TopProgressBar } from './components/Loaders';

/* ============================================================
   ROUTE SPLITTING
   Home loads eagerly because it is the landing page; everything
   else is a lazy chunk so the first paint stays small. The
   Suspense fallback below covers the download.
   ============================================================ */
import Home from './pages/Home';

const Results          = lazy(() => import('./pages/Results'));
const Fees             = lazy(() => import('./pages/Fees'));
const About            = lazy(() => import('./pages/About'));
const Academics        = lazy(() => import('./pages/Academics'));
const Syllabus         = lazy(() => import('./pages/Syllabus'));
const Faculty          = lazy(() => import('./pages/Faculty'));
const Gallery          = lazy(() => import('./pages/Gallery'));
const Notices          = lazy(() => import('./pages/Notices'));
const Achievements     = lazy(() => import('./pages/Achievements'));
const Admissions       = lazy(() => import('./pages/Admissions'));
const Contact          = lazy(() => import('./pages/Contact'));
const Faq              = lazy(() => import('./pages/Faq'));
const FacultyDashboard = lazy(() => import('./pages/FacultyDashboard'));
const FacultyAppPage   = lazy(() => import('./pages/FacultyApp'));
const NotFound         = lazy(() => import('./pages/NotFound'));

export default function App() {
  const booted = useBootSequence();

  if (!booted.done) return <SplashScreen progress={booted.progress} />;

  return (
    <SchoolProvider>
      <Shell />
    </SchoolProvider>
  );
}

/* ============================================================
   useBootSequence — drives the splash screen.
   It advances a progress value while the browser settles (fonts,
   first chunk, stylesheet), then hands over to the app. The
   minimum visible time keeps it from flashing on a fast machine,
   and the hard cap stops a slow font request from stalling the
   whole site.
   ============================================================ */
function useBootSequence() {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Skip the splash entirely if the visitor has already seen it this session.
    if (sessionStorage.getItem('ada.booted') === '1') {
      setDone(true);
      return;
    }

    const MIN_VISIBLE = 1100;  // never flash shorter than this
    const HARD_CAP = 2600;     // never hold the site longer than this
    const start = performance.now();
    let raf = 0;
    let settled = false;

    // Creep the bar toward 88% on its own so it always looks alive.
    const tick = () => {
      setProgress(p => (p < 0.88 ? p + (0.88 - p) * 0.035 : p));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const finish = () => {
      if (settled) return;
      settled = true;
      cancelAnimationFrame(raf);
      setProgress(1);
      const elapsed = performance.now() - start;
      const wait = Math.max(MIN_VISIBLE - elapsed, 260);
      setTimeout(() => {
        try { sessionStorage.setItem('ada.booted', '1'); } catch { /* private mode */ }
        setDone(true);
      }, wait);
    };

    // Wait for fonts if the browser supports it, otherwise just for load.
    const fonts = document.fonts?.ready ?? Promise.resolve();
    Promise.race([fonts, new Promise(r => setTimeout(r, HARD_CAP))]).then(finish);

    const cap = setTimeout(finish, HARD_CAP);
    return () => { cancelAnimationFrame(raf); clearTimeout(cap); };
  }, []);

  return { progress, done };
}

/* ============================================================
   Shell — header, animated page area, footer and overlays.
   ============================================================ */
function Shell() {
  const location = useLocation();
  const [navigating, setNavigating] = useState(false);

  // Flash the top progress bar briefly on each route change.
  useEffect(() => {
    setNavigating(true);
    const t = setTimeout(() => setNavigating(false), 420);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <>
      <Background />
      <ScrollReset />
      <TopProgressBar active={navigating} />

      {/* Skip link — the first thing a keyboard or screen-reader user meets. */}
      <a href="#main"
         className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]
                    focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-ink-950 focus:text-brass-300
                    focus:text-sm focus:font-bold focus:shadow-float">
        Skip to the main content
      </a>

      <div className="relative z-10 min-h-screen flex flex-col">
        <Header />
        <NoticeTicker />

        <main id="main" className="flex-1">
          {/* `key` on the wrapper restarts the entry animation per route. */}
          <div key={location.pathname} className="animate-fade-up">
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/results" element={<Results />} />
                <Route path="/fees" element={<Fees />} />
                <Route path="/about" element={<About />} />
                <Route path="/academics" element={<Academics />} />
                <Route path="/syllabus" element={<Syllabus />} />
                <Route path="/faculty" element={<Faculty />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/notices" element={<Notices />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/admissions" element={<Admissions />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/app" element={<FacultyAppPage />} />

                {/* Staff only — guarded, and it explains itself rather than redirecting. */}
                <Route path="/faculty-dashboard" element={
                  <ProtectedRoute><FacultyDashboard /></ProtectedRoute>
                } />

                {/* Legacy aliases, so older links and bookmarks still land somewhere real. */}
                <Route path="/result" element={<Results />} />
                <Route path="/fee" element={<Fees />} />
                <Route path="/teacher" element={
                  <ProtectedRoute><FacultyDashboard /></ProtectedRoute>
                } />
                <Route path="/campus" element={<Gallery />} />
                <Route path="/download" element={<FacultyAppPage />} />

                {/* Everything else */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
        </main>

        <Footer />
      </div>

      {/* Overlays live outside the scroll container. */}
      <PinModal />
      <Toasts />
      <BackToTop />
    </>
  );
}
