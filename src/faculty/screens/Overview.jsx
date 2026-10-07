import React from 'react';
import {
  Users, CheckCircle2, FileSpreadsheet, IndianRupee,
  LayoutDashboard, ChevronRight, Phone, PlusCircle, UserPlus,
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { Screen, Card, StatBox, Pill, Empty } from '../components/Chrome';
import { initialsOf, inr } from '../../utils/format';

/* ============================================================
   Overview — the landing screen: today's numbers, who still
   owes fees, and shortcuts into the two most common tasks.
   ============================================================ */
export default function Overview({ onGo }) {
  const { stats, students, payments, school } = useSchool();
  const pending = students.filter(s => s.fee_status !== 'PAID');
  const collected = payments.reduce((a, p) => a + (Number(p.amount) || 0), 0);

  return (
    <Screen
      icon={LayoutDashboard}
      title="Faculty Dashboard"
      subtitle={`${school.shortName} · Session ${school.session}`}
    >
      {/* figures */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox icon={Users} value={stats.totalStudents} label="Students on roll"
                 sub={`Across ${stats.classCount} classes`} tone="ink" />
        <StatBox icon={CheckCircle2} value={`${stats.collectionRate}%`} label="Fees collected"
                 sub={`${stats.paid} paid · ${stats.pending} pending`} tone="garden" />
        <StatBox icon={FileSpreadsheet} value={stats.totalMarks} label="Mark entries"
                 sub="All terms and subjects" tone="brass" />
        <StatBox icon={IndianRupee} value={payments.length} label="Payments logged"
                 sub={collected ? `${inr(collected)} total` : 'None yet on this device'} tone="brass" />
      </div>

      {/* shortcuts */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button onClick={() => onGo('marks')}
                className="flex items-center gap-2.5 p-4 rounded-2xl bg-ink-950 text-white active:scale-[.97] transition-transform text-left">
          <PlusCircle className="w-5 h-5 text-brass-400 shrink-0" />
          <span className="text-[13px] font-bold leading-tight">Enter<br />marks</span>
        </button>
        <button onClick={() => onGo('enrol')}
                className="flex items-center gap-2.5 p-4 rounded-2xl bg-garden-600 text-white active:scale-[.97] transition-transform text-left">
          <UserPlus className="w-5 h-5 shrink-0" />
          <span className="text-[13px] font-bold leading-tight">Enrol a<br />student</span>
        </button>
      </div>

      {/* class strength */}
      <h2 className="text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-faint mt-7 mb-2.5">
        Class strength
      </h2>
      <Card className="divide-y divide-ink-900/6">
        {stats.byClass.map(c => (
          <div key={c.cls} className="flex items-center gap-3 px-4 py-3">
            <span className="w-11 shrink-0 text-[13px] font-extrabold text-ink-950">{c.cls}</span>
            <div className="flex-1 min-w-0">
              <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                <div className={`h-full rounded-full ${c.pending > 0 ? 'bg-brass-400' : 'bg-garden-500'}`}
                     style={{ width: `${(c.count / Math.max(...stats.byClass.map(x => x.count), 1)) * 100}%` }} />
              </div>
            </div>
            <span className="text-[12px] font-bold text-ink-700 tabular-nums w-7 text-right">{c.count}</span>
            {c.pending > 0
              ? <Pill tone="rose">{c.pending} due</Pill>
              : <Pill tone="garden">clear</Pill>}
          </div>
        ))}
      </Card>

      {/* fees outstanding */}
      <h2 className="text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-faint mt-7 mb-2.5">
        Fees outstanding
      </h2>
      {pending.length === 0 ? (
        <Card className="p-5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-garden-600 shrink-0" />
          <p className="text-[13px] font-semibold text-garden-900">
            Every student on the register is marked paid.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-ink-900/6">
          {pending.map(s => (
            <button key={s.student_id} onClick={() => onGo('students')}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-ink-50 transition-colors text-left">
              <span className="w-9 h-9 shrink-0 rounded-xl bg-rose-500 text-white flex items-center justify-center text-[11px] font-extrabold">
                {initialsOf(s.name)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-bold text-ink-950 truncate">{s.name}</span>
                <span className="block text-[11.5px] text-ink-soft">
                  Roll #{s.roll_no} · {s.class}-{s.section || 'A'}
                </span>
              </span>
              {s.contact && (
                <a href={`tel:${s.contact}`} onClick={e => e.stopPropagation()}
                   aria-label={`Call ${s.name}'s guardian`}
                   className="w-9 h-9 shrink-0 rounded-xl bg-garden-100 text-garden-700 flex items-center justify-center active:scale-90 transition-transform">
                  <Phone className="w-4 h-4" />
                </a>
              )}
              <ChevronRight className="w-4 h-4 text-ink-300 shrink-0" />
            </button>
          ))}
        </Card>
      )}

      <p className="text-[11px] text-ink-faint text-center mt-6 leading-relaxed px-2">
        Everything you save is stored on this device. It does not sync with the website
        or with other teachers' phones.
      </p>
    </Screen>
  );
}
