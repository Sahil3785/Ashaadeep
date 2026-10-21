import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft } from 'lucide-react';
import { pushDismiss } from '../dismissStack';
import SyncBar from './SyncBar';

/* ============================================================
   Screen — the standard frame for every screen in the app.
   A fixed title bar, a scrolling body, and padding that clears
   the bottom navigation bar.
   ============================================================ */
export function Screen({ title, subtitle, icon: Icon, onBack, action, children }) {
  return (
    <div className="flex flex-col min-h-full">
      {/* title bar */}
      <header className="sticky top-0 z-30 bg-ink-950 text-white px-4 pt-3 pb-4 shadow-lift">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} aria-label="Go back"
                    className="w-9 h-9 -ml-1 rounded-xl bg-white/10 flex items-center justify-center active:scale-90 transition-transform">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {Icon && !onBack && (
            <span className="w-9 h-9 rounded-xl bg-brass-400 text-ink-950 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" strokeWidth={2.3} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-extrabold leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-[11.5px] text-ink-300 leading-snug truncate">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>

      {/* Connection / sync status, shown only when there is something to say. */}
      <SyncBar />

      {/* body — bottom padding clears the tab bar */}
      <div className="flex-1 px-4 pt-4 pb-28">{children}</div>
    </div>
  );
}

/* ============================================================
   Card — a plain white block used throughout the app.
   ============================================================ */
export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`bg-white rounded-2xl border border-ink-900/8 shadow-soft ${className}`} {...rest}>
      {children}
    </div>
  );
}

/* ============================================================
   Field — label + control + error, sized for thumbs.
   Inputs are 16px minimum so Android never zooms on focus.
   ============================================================ */
export function Field({ label, error, hint, required, children }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-ink-soft mb-1.5">
        {label}{required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
      {error
        ? <p className="text-[11.5px] font-semibold text-rose-600 mt-1.5">{error}</p>
        : hint ? <p className="text-[11.5px] text-ink-faint mt-1.5">{hint}</p> : null}
    </div>
  );
}

/* Shared control styling. text-base keeps Android from zooming in. */
export const inputCls = (error) =>
  `w-full rounded-2xl border bg-white px-3.5 py-3 text-base text-ink-950 outline-none transition-all
   placeholder:text-ink-faint placeholder:text-sm
   ${error ? 'border-rose-400 ring-4 ring-rose-400/15' : 'border-ink-900/15 focus:border-brass-400 focus:ring-4 focus:ring-brass-400/20'}`;

export const selectCls = (error) => `${inputCls(error)} app-select font-semibold appearance-none bg-no-repeat`;

/* ============================================================
   Btn — full-width by default, with a pressed state that is
   obvious on a touch screen.
   ============================================================ */
export function Btn({ variant = 'primary', className = '', children, ...rest }) {
  const base = 'w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-bold transition-all active:scale-[.97] disabled:opacity-55 disabled:active:scale-100';
  const variants = {
    primary: 'bg-gradient-to-br from-brass-400 to-brass-500 text-ink-950 shadow-brass',
    ink: 'bg-ink-950 text-white shadow-lift',
    garden: 'bg-gradient-to-br from-garden-400 to-garden-600 text-white shadow-lift',
    ghost: 'bg-white text-ink-700 border border-ink-900/12',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest}>{children}</button>;
}

/* ============================================================
   Pill — compact status label.
   ============================================================ */
export function Pill({ tone = 'ink', children, className = '' }) {
  const tones = {
    brass: 'bg-brass-100 text-brass-800 border-brass-200',
    garden: 'bg-garden-100 text-garden-800 border-garden-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    ink: 'bg-ink-100 text-ink-600 border-ink-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

/* ============================================================
   Sheet — a bottom sheet, which is the Android-native way to
   show a secondary form without leaving the screen.
   ============================================================ */
export function Sheet({ open, onClose, title, children }) {
  // Callers pass an inline arrow, which changes identity every render. Holding
  // it in a ref lets the effect below depend only on `open`, so the scroll lock
  // is not torn down and rebuilt on every unrelated re-render.
  const closeRef = React.useRef(onClose);
  React.useEffect(() => { closeRef.current = onClose; }, [onClose]);

  React.useEffect(() => {
    if (!open) return;

    // Lock the page behind the sheet.
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';

    // Register with the back-button stack so Android's back gesture
    // closes this sheet rather than changing screen.
    const unregister = pushDismiss(() => closeRef.current?.());

    return () => { html.style.overflow = prev; unregister(); };
  }, [open]);

  if (!open) return null;

  // Portalled to <body>: rendered inside the animated screen, the sheet was
  // trapped in that screen's stacking context and the bottom nav (z-40)
  // painted over its last buttons, whatever z-index the sheet had.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-950/55 animate-fade-in" onClick={onClose} />
      <div className="app-sheet-panel relative w-full max-h-[88vh] overflow-y-auto bg-white rounded-t-3xl shadow-float animate-sheet-up">
        {/* grab handle */}
        <div className="sticky top-0 bg-white pt-3 pb-2 rounded-t-3xl">
          <div className="w-10 h-1 rounded-full bg-ink-200 mx-auto" />
          {title && <h2 className="font-display text-base font-extrabold text-ink-950 text-center mt-2.5 px-5">{title}</h2>}
        </div>
        <div className="px-5 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* ============================================================
   StatBox — a compact figure tile for the overview screen.
   ============================================================ */
export function StatBox({ icon: Icon, value, label, tone = 'brass', sub }) {
  const tones = {
    brass: 'bg-brass-100 text-brass-700',
    garden: 'bg-garden-100 text-garden-700',
    ink: 'bg-ink-100 text-ink-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <Card className="p-4">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${tones[tone]}`}>
        {Icon && <Icon className="w-4.5 h-4.5" strokeWidth={2.3} />}
      </span>
      <p className="font-display text-2xl font-extrabold text-ink-950 tabular-nums leading-none">{value}</p>
      <p className="text-[12px] font-bold text-ink-800 mt-1.5 leading-tight">{label}</p>
      {sub && <p className="text-[10.5px] text-ink-faint mt-0.5 leading-snug">{sub}</p>}
    </Card>
  );
}

/* ============================================================
   Empty — shared "nothing here" block.
   ============================================================ */
export function Empty({ icon: Icon, title, children, action }) {
  return (
    <Card className="p-8 text-center">
      {Icon && (
        <span className="w-12 h-12 rounded-2xl bg-ink-100 text-ink-400 flex items-center justify-center mx-auto mb-3">
          <Icon className="w-6 h-6" />
        </span>
      )}
      <p className="font-display text-base font-extrabold text-ink-950">{title}</p>
      {children && <p className="text-[13px] text-ink-soft mt-1.5 leading-relaxed">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}
