import React from 'react';
import { Check, Clock } from 'lucide-react';
import { STATUS_STYLE, monthShort } from '../../lib/fees';
import { inr } from '../../utils/format';

/* ============================================================
   MonthGrid — the twelve months of a session as tiles, coloured
   by what is owed. Used by the office, the app and parents.

   selectable: months with a balance can be ticked for payment.
   ============================================================ */
export default function MonthGrid({ cards, selected = [], onToggle, selectable = false, onOpen, size = 'md' }) {
  const cols = size === 'sm' ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6';
  return (
    <div className={`grid ${cols} gap-2`} role={selectable ? 'group' : undefined} aria-label="Months of the session">
      {cards.map(c => {
        const st = STATUS_STYLE[c.status] || STATUS_STYLE.none;
        const canPick = selectable && c.balance > 0;
        const on = selected.includes(c.period);
        const Tag = canPick || onOpen ? 'button' : 'div';
        return (
          <Tag
            key={c.period}
            type={Tag === 'button' ? 'button' : undefined}
            onClick={canPick ? () => onToggle?.(c.period) : onOpen ? () => onOpen(c) : undefined}
            aria-pressed={canPick ? on : undefined}
            title={c.lines.map(l => `${l.head_name}: ${inr(l.net)}${l.paid ? ` (paid ${inr(l.paid)})` : ''}${l.waived ? ' — waived' : ''}`).join('\n')}
            className={`relative text-left rounded-2xl border px-2.5 py-2 transition-all ${st.cls} ${
              on ? 'ring-2 ring-ink-950 ring-offset-1 scale-[1.02]' : ''} ${
              canPick || onOpen ? 'cursor-pointer hover:-translate-y-0.5 active:scale-95' : ''}`}
          >
            <span className="flex items-center justify-between gap-1">
              <span className="text-[12.5px] font-extrabold">{monthShort(c.period)} <span className="opacity-60 font-bold">{c.period.slice(2, 4)}</span></span>
              {on ? <span className="w-4 h-4 rounded-full bg-ink-950 text-white flex items-center justify-center"><Check className="w-3 h-3" strokeWidth={3} /></span>
                  : <span className={`w-2 h-2 rounded-full ${st.dot}`} />}
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-wide mt-1 opacity-80">{st.label}</span>
            <span className="block text-[12px] font-extrabold font-mono mt-0.5 tabular-nums">
              {c.status === 'none' ? '—' : c.balance > 0 ? inr(c.balance) : inr(c.net)}
            </span>
            {c.awaiting && (
              <span className="absolute -top-1.5 -right-1.5 inline-flex items-center gap-0.5 rounded-full bg-sky-600 text-white text-[8.5px] font-extrabold px-1.5 py-0.5 shadow">
                <Clock className="w-2.5 h-2.5" /> CHECKING
              </span>
            )}
          </Tag>
        );
      })}
    </div>
  );
}

/* Small legend under a grid. */
export function MonthLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] font-bold text-ink-soft">
      {['paid', 'partial', 'overdue', 'due', 'upcoming', 'waived'].map(k => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${STATUS_STYLE[k].dot}`} /> {STATUS_STYLE[k].label}
        </span>
      ))}
    </div>
  );
}
