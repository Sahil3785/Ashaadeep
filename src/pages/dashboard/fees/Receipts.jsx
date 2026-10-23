import React, { useMemo, useState } from 'react';
import { BookOpen, Download, Search } from 'lucide-react';
import { fees, monthLabel, modeLabel, todayKey, monthKey, downloadCsv } from '../../../lib/fees';
import { Badge } from '../../../components/UI';
import { SkTable, EmptyState } from '../../../components/Loaders';
import { inr, shortDate } from '../../../utils/format';
import { useLoad, LoadError, ReceiptModal, FeeStat } from './shared';

const RANGES = [
  ['today', 'Today'], ['week', 'Last 7 days'], ['month', 'This month'], ['session', 'This session'], ['custom', 'Custom'],
];
const STATUS = [['verified', 'Active'], ['cancelled', 'Cancelled'], ['rejected', 'Rejected'], ['pending', 'To verify'], ['all', 'All']];
const TONE = { verified: 'garden', pending: 'brass', rejected: 'ink', cancelled: 'rose' };

const shiftDays = (key, n) => {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(y, m - 1, d + n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

/* ============================================================
   RECEIPTS — the day book: every receipt in a date range, the
   totals by payment mode for cashing up, reprint and cancel.
   ============================================================ */
export default function Receipts() {
  const today = todayKey();
  const [range, setRange] = useState('today');
  const [custom, setCustom] = useState({ from: shiftDays(today, -30), to: today });
  const [status, setStatus] = useState('verified');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);

  const { from, to } = useMemo(() => {
    if (range === 'today') return { from: today, to: today };
    if (range === 'week') return { from: shiftDays(today, -6), to: today };
    if (range === 'month') return { from: monthKey(today), to: today };
    if (range === 'session') {
      const y = Number(today.slice(0, 4)) - (Number(today.slice(5, 7)) < 4 ? 1 : 0);
      return { from: `${y}-04-01`, to: today };
    }
    return custom;
  }, [range, custom, today]);

  const list = useLoad(() => fees.listPayments({ status, from, to, q, limit: 1000 }), [status, from, to, q]);
  const summary = useLoad(() => fees.collectionSummary(from, to), [from, to]);

  const exportCsv = () => downloadCsv(`Fee_daybook_${from}_to_${to}.csv`,
    ['Receipt', 'Date', 'Student', 'Class', 'Roll', 'Months', 'Heads', 'Mode', 'Reference', 'Amount', 'Status', 'Note'],
    (list.data || []).map(p => [p.receipt_no || p.txn_ref, p.paid_on, p.student_name, p.class, p.roll_no,
      (p.periods || []).map(x => monthLabel(x)).join(' '), p.category, modeLabel(p.mode), p.utr || '',
      p.amount, p.status, p.cancel_reason || p.note || '']));

  const byMode = summary.data?.by_mode || {};

  return (
    <div className="space-y-5">
      <div className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map(([id, label]) => (
            <button key={id} onClick={() => setRange(id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${range === id ? 'bg-ink-950 text-brass-300 border-ink-950' : 'bg-white text-ink-700 border-ink-900/12 hover:bg-ink-50'}`}>
              {label}
            </button>
          ))}
          {range === 'custom' && (
            <span className="flex items-center gap-2">
              <input type="date" value={custom.from} max={custom.to} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} className="field py-1.5 w-40" aria-label="From" />
              <input type="date" value={custom.to} min={custom.from} max={today} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} className="field py-1.5 w-40" aria-label="To" />
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-4">
          <FeeStat label="Collected" value={inr(summary.data?.total || 0)} note={`${summary.data?.receipts || 0} receipts · ${shortDate(from)}${from !== to ? ` – ${shortDate(to)}` : ''}`} tone="garden" />
          <FeeStat label="Cash" value={inr(byMode.cash || 0)} note="Should be in the cash box" />
          <FeeStat label="UPI / bank" value={inr((byMode.upi || 0) + (byMode.bank || 0) + (byMode.online || 0) + (byMode.card || 0))} note="Check against the statement" />
          <FeeStat label="Cheque" value={inr(byMode.cheque || 0)} note="Deposit and watch for bounces" />
        </div>
      </div>

      <div className="panel p-5 sm:p-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-center mb-4">
          <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2 shrink-0">
            <BookOpen className="w-4.5 h-4.5 text-brass-600" /> Day book
          </h3>
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Student, receipt no., UTR or roll" className="field pl-10 py-2" />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)} className="field py-2 md:w-40 font-semibold" aria-label="Status">
            {STATUS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <button onClick={exportCsv} disabled={!list.data?.length} className="btn-ghost text-xs shrink-0"><Download className="w-4 h-4" /> Excel / CSV</button>
        </div>

        {list.error ? <LoadError message={list.error} onRetry={list.reload} /> :
         list.loading && !list.data ? <SkTable rows={6} cols={6} /> :
         list.data.length === 0 ? <EmptyState icon={BookOpen} title="No receipts in this range" /> : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-ink-faint border-b border-ink-900/8">
                  <th className="p-2.5">Receipt</th><th className="p-2.5">Student</th><th className="p-2.5 hidden md:table-cell">Months</th>
                  <th className="p-2.5 hidden sm:table-cell">Mode</th><th className="p-2.5 text-right">Amount</th><th className="p-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/6">
                {list.data.map(p => (
                  <tr key={p.id} onClick={() => p.status !== 'pending' && setOpenId(p.id)}
                      className={`${p.status !== 'pending' ? 'cursor-pointer hover:bg-brass-50/50' : ''} ${p.status === 'cancelled' ? 'opacity-60' : ''}`}>
                    <td className="p-2.5 whitespace-nowrap">
                      <p className="font-mono text-[12px] font-bold text-ink-950">{p.receipt_no || p.txn_ref}</p>
                      <p className="text-[11px] text-ink-faint">{shortDate(p.paid_on)}</p>
                    </td>
                    <td className="p-2.5">
                      <p className="font-bold text-ink-950 text-[13px]">{p.student_name}</p>
                      <p className="text-[11px] text-ink-faint">{p.class} · Roll {p.roll_no}</p>
                    </td>
                    <td className="p-2.5 hidden md:table-cell text-[12px] text-ink-700">{(p.periods || []).map(x => monthLabel(x)).join(', ') || p.category}</td>
                    <td className="p-2.5 hidden sm:table-cell text-[12px]">{modeLabel(p.mode)}{p.utr ? <span className="block font-mono text-[10.5px] text-ink-faint">{p.utr}</span> : null}</td>
                    <td className={`p-2.5 text-right font-extrabold font-mono whitespace-nowrap ${p.status === 'cancelled' ? 'line-through' : ''}`}>{inr(p.amount)}</td>
                    <td className="p-2.5 text-right"><Badge tone={TONE[p.status]}>{p.status === 'verified' ? 'active' : p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReceiptModal paymentId={openId} onClose={() => setOpenId(null)} onChanged={() => { list.reload(); summary.reload(); }} />
    </div>
  );
}

