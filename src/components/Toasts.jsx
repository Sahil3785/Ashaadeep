import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useSchool } from '../context/SchoolContext';

/* ============================================================
   Toasts — bottom-right stack. Each toast carries an icon and a
   left colour rail matching its type, plus a draining timer bar
   so the reader can see it is about to disappear.
   ============================================================ */
const STYLES = {
  success: { Icon: CheckCircle2,   rail: 'bg-garden-500', tint: 'text-garden-600', bar: 'bg-garden-400' },
  error:   { Icon: XCircle,        rail: 'bg-rose-500',   tint: 'text-rose-600',   bar: 'bg-rose-400'   },
  warning: { Icon: AlertTriangle,  rail: 'bg-brass-500',  tint: 'text-brass-600',  bar: 'bg-brass-400'  },
  info:    { Icon: Info,           rail: 'bg-ink-500',    tint: 'text-ink-600',    bar: 'bg-ink-400'    },
};

export default function Toasts() {
  const { toasts, dismissToast } = useSchool();
  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[95] flex flex-col-reverse gap-2.5 w-[min(22rem,calc(100vw-2.5rem))] no-print"
      role="region" aria-live="polite" aria-label="Notifications"
    >
      {toasts.map(t => {
        const { Icon, rail, tint, bar } = STYLES[t.type] || STYLES.info;
        return (
          <div key={t.id}
               className="relative overflow-hidden rounded-2xl bg-white shadow-float border border-ink-900/10 animate-toast-in">
            {/* colour rail */}
            <span className={`absolute left-0 top-0 bottom-0 w-1 ${rail}`} />

            <div className="flex items-start gap-3 p-3.5 pl-4.5">
              <Icon className={`w-4.5 h-4.5 shrink-0 mt-0.5 ${tint}`} strokeWidth={2.3} />
              <div className="flex-1 min-w-0">
                {t.title && <p className="text-[13px] font-extrabold text-ink-950 leading-tight">{t.title}</p>}
                <p className={`text-xs text-ink-soft leading-snug ${t.title ? 'mt-0.5' : ''}`}>{t.message}</p>
              </div>
              <button onClick={() => dismissToast(t.id)} aria-label="Dismiss notification"
                      className="shrink-0 w-6 h-6 rounded-lg text-ink-300 hover:text-ink-900 hover:bg-ink-50 flex items-center justify-center transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* draining timer, matched to the 5s auto-dismiss in the context */}
            <span className={`absolute bottom-0 left-0 h-[2px] ${bar} origin-left`}
                  style={{ animation: 'bar-grow 5s linear reverse forwards', width: '100%' }} />
          </div>
        );
      })}
    </div>
  );
}
