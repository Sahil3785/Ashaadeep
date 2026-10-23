import React from 'react';
import { LayoutDashboard, PlusCircle, Users, IndianRupee, Settings } from 'lucide-react';
import { tap } from '../native';

export const TABS = [
  { id: 'overview', label: 'Home',     icon: LayoutDashboard },
  { id: 'marks',    label: 'Marks',    icon: PlusCircle },
  { id: 'fees',     label: 'Fees',     icon: IndianRupee },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'settings', label: 'More',     icon: Settings },
];

/* ============================================================
   BottomNav — the primary navigation, placed within thumb reach
   the way an Android app expects. It hides itself while the
   soft keyboard is open (see .keyboard-open in faculty.css) so
   it never sits on top of the field being typed into.
   ============================================================ */
export default function BottomNav({ active, onChange }) {
  return (
    <nav className="app-bottom-nav fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-ink-900/10 shadow-[0_-4px_16px_rgba(13,18,35,.07)]"
         aria-label="Main sections">
      <div className="flex items-stretch">
        {TABS.map(t => {
          const Icon = t.icon;
          // Enrolment opens from Students, so keep that tab lit while it is open.
          const on = active === t.id || (t.id === 'students' && active === 'enrol');
          return (
            <button
              key={t.id}
              onClick={() => { if (!on) { tap(); onChange(t.id); } }}
              aria-current={on ? 'page' : undefined}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 active:bg-ink-50 transition-colors relative"
            >
              {/* active indicator rides along the top edge */}
              <span className={`absolute top-0 h-0.5 rounded-full bg-brass-500 transition-all duration-300 ${on ? 'w-8 opacity-100' : 'w-0 opacity-0'}`} />
              <Icon className={`w-5 h-5 transition-colors ${on ? 'text-brass-600' : 'text-ink-400'}`}
                    strokeWidth={on ? 2.5 : 2} />
              <span className={`text-[10.5px] font-bold transition-colors ${on ? 'text-ink-950' : 'text-ink-faint'}`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* breathing room for the gesture bar on tall phones */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
