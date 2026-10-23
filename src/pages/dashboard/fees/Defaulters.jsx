import React, { useState } from 'react';
import { AlertTriangle, Download, MessageCircle, Phone, BarChart3 } from 'lucide-react';
import { CLASS_LIST, SCHOOL } from '../../../data/school';
import { fees, monthLabel, reminderText, waLink, downloadCsv } from '../../../lib/fees';
import { SkTable, EmptyState } from '../../../components/Loaders';
import { inr } from '../../../utils/format';
import { useLoad, LoadError, FeeStat } from './shared';

/* ============================================================
   DEFAULTERS — who owes what, class by class, with a one-tap
   WhatsApp reminder to the parent and an export for the office.
   ============================================================ */
export default function Defaulters({ onCollect }) {
  const [cls, setCls] = useState('');
  const summary = useLoad(() => fees.classSummary(), []);
  const list = useLoad(() => fees.defaulters({ cls: cls || null }), [cls]);

  const totals = (summary.data || []).reduce((a, c) => ({
    billed: a.billed + Number(c.billed), collected: a.collected + Number(c.collected),
    overdue: a.overdue + Number(c.overdue), defaulters: a.defaulters + Number(c.defaulters),
  }), { billed: 0, collected: 0, overdue: 0, defaulters: 0 });
  const rate = totals.billed ? Math.round(((totals.billed - totals.overdue) / totals.billed) * 100) : 0;

  const exportCsv = () => downloadCsv(`Fee_defaulters_${cls || 'all'}.csv`,
    ['Class', 'Section', 'Roll', 'Student', 'Father', 'Contact', 'Months pending', 'Amount'],
    (list.data || []).map(d => [d.class, d.section, d.roll_no, d.name, d.father_name || '', d.contact || '',
      d.months.map(m => monthLabel(m)).join(' '), d.amount]));

  return (
    <div className="space-y-5">
      <div className="panel p-5 sm:p-6">
        <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2 mb-4">
          <BarChart3 className="w-4.5 h-4.5 text-brass-600" /> Collection so far this session
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <FeeStat label="Due till today" value={inr(totals.billed)} />
          <FeeStat label="Received" value={inr(totals.collected)} tone="garden" />
          <FeeStat label="Overdue" value={inr(totals.overdue)} tone="rose" note={`${totals.defaulters} students`} />
          <FeeStat label="Collection rate" value={`${rate}%`} tone={rate >= 85 ? 'garden' : rate >= 60 ? 'brass' : 'rose'} />
        </div>

        {summary.error ? <div className="mt-4"><LoadError message={summary.error} onRetry={summary.reload} /></div> :
         summary.data && summary.data.length > 0 && (
          <div className="overflow-x-auto -mx-2 mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-ink-faint border-b border-ink-900/8">
                  <th className="p-2">Class</th><th className="p-2 text-right">Students</th><th className="p-2 text-right">Due till today</th>
                  <th className="p-2 text-right">Received</th><th className="p-2 text-right">Overdue</th><th className="p-2 text-right">Defaulters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/6">
                {[...summary.data].sort((a, b) => CLASS_LIST.indexOf(a.class) - CLASS_LIST.indexOf(b.class)).map(c => (
                  <tr key={c.class} onClick={() => setCls(c.class)} className={`cursor-pointer hover:bg-brass-50/50 ${cls === c.class ? 'bg-brass-50' : ''}`}>
                    <td className="p-2 font-extrabold text-ink-950">{c.class}</td>
                    <td className="p-2 text-right tabular-nums">{c.students}</td>
                    <td className="p-2 text-right font-mono">{inr(c.billed)}</td>
                    <td className="p-2 text-right font-mono text-garden-700">{inr(c.collected)}</td>
                    <td className="p-2 text-right font-mono font-bold text-rose-600">{inr(c.overdue)}</td>
                    <td className="p-2 text-right tabular-nums">{c.defaulters}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2 flex-1">
            <AlertTriangle className="w-4.5 h-4.5 text-rose-500" /> Fees overdue {cls && `· Class ${cls}`}
          </h3>
          <select value={cls} onChange={e => setCls(e.target.value)} className="field py-2 sm:w-40 font-semibold" aria-label="Class">
            <option value="">All classes</option>
            {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={exportCsv} disabled={!list.data?.length} className="btn-ghost text-xs"><Download className="w-4 h-4" /> Excel / CSV</button>
        </div>

        {list.error ? <LoadError message={list.error} onRetry={list.reload} /> :
         list.loading && !list.data ? <SkTable rows={6} cols={5} /> :
         list.data.length === 0 ? <EmptyState icon={AlertTriangle} title="No overdue fees">Everyone is up to date{cls ? ` in Class ${cls}` : ''}.</EmptyState> : (
          <div className="divide-y divide-ink-900/6">
            {list.data.map(d => {
              const wa = waLink(d.contact, reminderText({ school: SCHOOL.name, name: d.name, cls: d.class, months: d.months, amount: d.amount }));
              return (
                <div key={d.student_id} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-extrabold text-ink-950">{d.name}
                      <span className="ml-2 text-[11.5px] font-semibold text-ink-faint">{d.class}-{d.section} · Roll {d.roll_no}</span></p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {d.months.map(m => <span key={m} className="px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[10.5px] font-bold text-rose-700">{monthLabel(m)}</span>)}
                    </div>
                  </div>
                  <p className="font-display text-lg font-extrabold font-mono text-rose-600 md:w-28 md:text-right">{inr(d.amount)}</p>
                  <div className="flex gap-1.5">
                    {d.contact && <a href={`tel:${d.contact}`} className="btn-ghost text-xs py-1.5" aria-label={`Call ${d.name}'s parent`}><Phone className="w-3.5 h-3.5" /></a>}
                    {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn-garden text-xs py-1.5"><MessageCircle className="w-3.5 h-3.5" /> Remind</a>}
                    <button onClick={() => onCollect?.(d.student_id)} className="btn-primary text-xs py-1.5">Collect</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
