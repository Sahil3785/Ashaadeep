import React from 'react';
import { GraduationCap } from 'lucide-react';
import { SCHOOL } from '../data/school';

/* ============================================================
   1. Skeleton primitives
   Every loading state is built from these so the placeholder
   always has the same silhouette as the real content.
   ============================================================ */
export function Sk({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Sk key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/* A card-shaped placeholder: image band, title, body lines. */
export function SkCard({ media = true }) {
  return (
    <div className="card p-0 overflow-hidden">
      {media && <Sk className="h-44 w-full rounded-none" />}
      <div className="p-5 space-y-3">
        <Sk className="h-2.5 w-20" />
        <Sk className="h-4 w-3/4" />
        <SkText lines={2} />
      </div>
    </div>
  );
}

export function SkCardGrid({ count = 6, cols = 'sm:grid-cols-2 lg:grid-cols-3', media = true }) {
  return (
    <div className={`grid grid-cols-1 ${cols} gap-6`}>
      {Array.from({ length: count }).map((_, i) => <SkCard key={i} media={media} />)}
    </div>
  );
}

/* Table placeholder — used by the faculty register. */
export function SkTable({ rows = 6, cols = 6 }) {
  return (
    <div className="card overflow-hidden">
      <div className="bg-ink-50 p-3 flex gap-4 border-b border-ink-900/10">
        {Array.from({ length: cols }).map((_, i) => <Sk key={i} className="h-3 flex-1" />)}
      </div>
      <div className="divide-y divide-ink-900/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3.5 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Sk key={c} className={`h-3 flex-1 ${c === 0 ? 'max-w-[48px]' : ''}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Stat-tile row placeholder. */
export function SkStats({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5 space-y-3">
          <Sk className="h-10 w-10 rounded-2xl" />
          <Sk className="h-7 w-24" />
          <Sk className="h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}

/* Marksheet placeholder — mirrors the real document layout. */
export function SkDocument() {
  return (
    <div className="card p-8 space-y-5">
      <div className="flex items-center gap-4 border-b border-ink-900/10 pb-5">
        <Sk className="h-14 w-14 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Sk className="h-5 w-2/3" />
          <Sk className="h-3 w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Sk className="h-2.5 w-16" />
            <Sk className="h-4 w-full" />
          </div>
        ))}
      </div>
      <SkTable rows={6} cols={6} />
    </div>
  );
}

/* ============================================================
   2. Spinner — a brass ring used inside buttons and small spots.
   ============================================================ */
export function Spinner({ className = 'w-5 h-5', label = 'Loading' }) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/* ============================================================
   3. SplashScreen — the first-paint animation.
   Shows the crest drawing itself in, the school name, and a
   determinate progress bar. Mounted by App on the very first
   load only, never on later navigations.
   ============================================================ */
export function SplashScreen({ progress = 0 }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
         style={{ background: 'linear-gradient(165deg,#fffdf6 0%,#fbfaf7 50%,#f2f5fa 100%)' }}>
      {/* soft brass glow behind the crest */}
      <div className="absolute w-[32rem] h-[32rem] rounded-full blur-[90px] opacity-60"
           style={{ background: 'radial-gradient(circle,rgba(251,180,32,.35),transparent 68%)' }} />

      <div className="relative flex flex-col items-center text-center px-6">
        {/* Crest: rotating dashed ring + pulsing cap */}
        <div className="relative w-28 h-28 mb-7">
          <svg className="absolute inset-0 w-full h-full animate-spin-slow" viewBox="0 0 112 112" fill="none">
            <circle cx="56" cy="56" r="52" stroke="#f59e0b" strokeOpacity=".35"
                    strokeWidth="2" strokeDasharray="10 8" strokeLinecap="round" />
          </svg>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 112 112" fill="none">
            <circle cx="56" cy="56" r="52" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray="327" strokeDashoffset={327 - 327 * Math.min(progress, 1)}
                    style={{ transition: 'stroke-dashoffset .3s linear' }}
                    transform="rotate(-90 56 56)" />
          </svg>
          <div className="absolute inset-[18px] rounded-full bg-ink-950 shadow-float flex items-center justify-center animate-ring-pulse">
            <GraduationCap className="w-9 h-9 text-brass-400" strokeWidth={2.2} />
          </div>
        </div>

        <p className="text-[10px] font-extrabold uppercase tracking-[.3em] text-brass-700 animate-fade-in">
          Est. {SCHOOL.established} · {SCHOOL.village}, {SCHOOL.district}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink-950 mt-2.5 animate-fade-up">
          {SCHOOL.name}
        </h1>
        <p className="font-serif italic text-sm text-ink-soft mt-1.5 animate-fade-up" style={{ animationDelay: '.1s' }}>
          {SCHOOL.tagline}
        </p>

        {/* Determinate progress bar */}
        <div className="mt-8 w-56 h-1.5 rounded-full bg-ink-900/8 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-brass-400 via-brass-500 to-garden-500"
               style={{ width: `${Math.min(progress, 1) * 100}%`, transition: 'width .3s ease' }} />
        </div>
        <p className="mt-3 text-[11px] font-semibold text-ink-faint tabular-nums">
          Preparing the portal · {Math.round(Math.min(progress, 1) * 100)}%
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   4. RouteLoader — the Suspense fallback shown while a page
   chunk downloads. Deliberately light: a thin top bar plus a
   centred crest, so it never flashes a big empty box.
   ============================================================ */
export function RouteLoader() {
  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center gap-5" role="status" aria-live="polite">
      <div className="relative w-16 h-16">
        <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="#f59e0b" strokeOpacity=".16" strokeWidth="4" />
          <path d="M60 32a28 28 0 0 0-28-28" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-ink-900" />
        </div>
      </div>
      <p className="text-xs font-semibold text-ink-soft">Loading page…</p>
    </div>
  );
}

/* ============================================================
   5. TopProgressBar — a 2px brass bar across the very top that
   runs during route changes, the way a browser's own bar does.
   ============================================================ */
export function TopProgressBar({ active }) {
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    if (!active) { setWidth(100); const t = setTimeout(() => setWidth(0), 320); return () => clearTimeout(t); }
    setWidth(12);
    // Creep toward 90% so it always feels like progress, then snap to 100 on finish.
    const id = setInterval(() => setWidth(w => (w < 90 ? w + (90 - w) * 0.18 : w)), 180);
    return () => clearInterval(id);
  }, [active]);

  if (width === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[90] h-[3px] pointer-events-none">
      <div className="h-full bg-gradient-to-r from-brass-400 via-brass-500 to-garden-500 shadow-brass"
           style={{ width: `${width}%`, transition: 'width .22s ease', opacity: width >= 100 ? 0 : 1 }} />
    </div>
  );
}

/* ============================================================
   6. EmptyState — shared "nothing here" panel.
   ============================================================ */
export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="card p-10 text-center animate-pop-in">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="font-display text-lg font-bold text-ink-950">{title}</h3>
      {children && <p className="lead text-sm mt-2 max-w-md mx-auto">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
