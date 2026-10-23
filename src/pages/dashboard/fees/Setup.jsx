import React, { useEffect, useMemo, useState } from 'react';
import { Settings2, Save, Plus, Zap, AlertTriangle, Lock, CalendarRange } from 'lucide-react';
import { CLASS_LIST } from '../../../data/school';
import { useSchool } from '../../../context/SchoolContext';
import { fees, monthKey, monthLabel, sessionIdFor, sessionMonths } from '../../../lib/fees';
import { Badge, Modal } from '../../../components/UI';
import { Spinner } from '../../../components/Loaders';
import { digitsOnly, inr } from '../../../utils/format';
import { useLoad, LoadError } from './shared';

const FREQ = [['monthly', 'Every month'], ['annual', 'Once a year'], ['one_time', 'One-time (opt-in)']];

/* ============================================================
   SETUP — the session, the fee heads and the class-wise rate
   card. Saving re-prices every month nobody has paid yet; months
   already paid or edited by hand are never touched.
   ============================================================ */
export default function Setup() {
  const { toast, isAdmin, refresh } = useSchool();
  const { data, error, loading, reload } = useLoad(() => fees.getSetup(), []);
  const [s, setS] = useState(null);
  const [rates, setRates] = useState({});   // `${class}|${head}` → '1800'
  const [busy, setBusy] = useState(false);
  const [headModal, setHeadModal] = useState(null);
  const [confirmGen, setConfirmGen] = useState(false);

  useEffect(() => {
    if (!data) return;
    const start = data.session?.starts_on || `${new Date().getFullYear()}-04-01`;
    setS({
      id: data.session?.id || sessionIdFor(monthKey(start)),
      start: start.slice(0, 7), due_day: String(data.session?.due_day || 10),
      billing_from: (data.session?.billing_from || start).slice(0, 7),
      billing_enabled: !!data.session?.billing_enabled,
    });
    setRates(Object.fromEntries(data.rates.map(r => [`${r.class}|${r.head_id}`, String(r.amount)])));
  }, [data]);

  const heads = useMemo(() => (data?.heads || []).filter(h => h.is_active), [data]);
  const months = useMemo(() => (s ? sessionMonths({ starts_on: `${s.start}-01`, months: 12 }) : []), [s]);

  // What a full session costs per class, as a sanity check on the rate card.
  const annual = (cls) => heads.reduce((a, h) => {
    if (h.is_optional || h.frequency === 'one_time') return a;
    const v = Number(rates[`${cls}|${h.id}`]) || 0;
    return a + (h.frequency === 'monthly' ? v * 12 : v);
  }, 0);

  const save = async (generate) => {
    setBusy(true);
    try {
      const res = await fees.saveSetup({
        id: s.id, starts_on: `${s.start}-01`, due_day: Number(s.due_day) || 10,
        billing_from: `${s.billing_from}-01`, generate,
        rates: CLASS_LIST.flatMap(c => heads.map(h => ({ class: c, head_id: h.id, amount: Number(rates[`${c}|${h.id}`]) || 0 }))),
      });
      toast(generate || s.billing_enabled
        ? `Saved. ${res.lines_changed} month lines added or re-priced; paid months were not touched.`
        : 'Saved. Press "Start billing" when the rates are right.', 'success', 'Fee setup saved');
      setConfirmGen(false);
      await reload();
      refresh();
    } catch (e) { toast(e.message, 'error', 'Not saved'); }
    finally { setBusy(false); }
  };

  if (error) return <LoadError message={error} onRetry={reload} />;
  if (loading || !s) return <div className="panel p-10 flex justify-center"><Spinner /></div>;
  const ro = !isAdmin;

  return (
    <div className="space-y-5">
      {ro && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-ink-50 border border-ink-900/8 text-[13px] text-ink-700">
          <Lock className="w-4 h-4" /> Only the principal can change the fee setup. You can view it here.
        </div>
      )}

      <div className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2">
            <CalendarRange className="w-4.5 h-4.5 text-brass-600" /> Session
          </h3>
          {s.billing_enabled ? <Badge tone="garden">Billing on</Badge> : <Badge tone="brass">Not billing yet</Badge>}
        </div>
        <div className="grid sm:grid-cols-4 gap-4">
          <label className="text-[12px] font-bold text-ink-soft">Session
            <input value={s.id} disabled={ro} onChange={e => setS(x => ({ ...x, id: e.target.value }))} className="field mt-1 font-mono" placeholder="2026-27" />
          </label>
          <label className="text-[12px] font-bold text-ink-soft">First month
            <input type="month" value={s.start} disabled={ro}
                   onChange={e => setS(x => ({ ...x, start: e.target.value, id: sessionIdFor(`${e.target.value}-01`) }))} className="field mt-1" />
          </label>
          <label className="text-[12px] font-bold text-ink-soft">Fee due by (day of month)
            <input value={s.due_day} disabled={ro} inputMode="numeric" className="field mt-1"
                   onChange={e => setS(x => ({ ...x, due_day: digitsOnly(e.target.value).slice(0, 2) }))} />
          </label>
          <label className="text-[12px] font-bold text-ink-soft">Bill from month
            <select value={s.billing_from} disabled={ro} onChange={e => setS(x => ({ ...x, billing_from: e.target.value }))} className="field mt-1 font-semibold">
              {months.map(m => <option key={m} value={m.slice(0, 7)}>{monthLabel(m, true)}</option>)}
            </select>
          </label>
        </div>
        <p className="text-[11.5px] text-ink-faint mt-2.5 leading-relaxed">
          Starting mid-year? Set “Bill from” to the month you go live, so earlier months are not shown as unpaid.
          Any arrears from before can be added per student with “Add charge”.
        </p>
      </div>

      <div className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2">
            <Settings2 className="w-4.5 h-4.5 text-brass-600" /> Rate card (₹ per class)
          </h3>
          {!ro && <button onClick={() => setHeadModal({ name: '', frequency: 'monthly', due_month: 1, is_optional: false, sort: (data.heads.length + 1) * 10 })} className="btn-ghost text-xs py-1.5"><Plus className="w-3.5 h-3.5" /> Fee head</button>}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {data.heads.map(h => (
            <button key={h.id} disabled={ro} onClick={() => setHeadModal(h)}
                    className={`px-2.5 py-1 rounded-lg border text-[11.5px] font-bold ${h.is_active ? 'bg-white border-ink-900/12 text-ink-800' : 'bg-ink-50 border-ink-200 text-ink-400 line-through'}`}>
              {h.name} <span className="font-semibold text-ink-faint">· {FREQ.find(f => f[0] === h.frequency)?.[1]}{h.is_optional ? ', opt-in' : ''}</span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-ink-faint border-b border-ink-900/8">
                <th className="p-2 sticky left-0 bg-white">Class</th>
                {heads.map(h => <th key={h.id} className="p-2 min-w-[7rem]">{h.name}</th>)}
                <th className="p-2 text-right">Year (standard)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/6">
              {CLASS_LIST.map(c => (
                <tr key={c}>
                  <td className="p-2 font-extrabold text-ink-950 sticky left-0 bg-white">{c}</td>
                  {heads.map(h => (
                    <td key={h.id} className="p-1.5">
                      <input value={rates[`${c}|${h.id}`] ?? ''} disabled={ro} inputMode="decimal" placeholder="0"
                             aria-label={`${h.name} for ${c}`}
                             onChange={e => setRates(r => ({ ...r, [`${c}|${h.id}`]: digitsOnly(e.target.value, { decimal: true }) }))}
                             className="field py-1.5 px-2.5 font-mono text-[13px]" />
                    </td>
                  ))}
                  <td className="p-2 text-right font-mono font-bold text-ink-700 whitespace-nowrap">{inr(annual(c))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11.5px] text-ink-faint mt-2.5">
          Opt-in heads (transport, admission, fines) use the class rate only for students they are switched on for —
          set that, or a child's own route fare, from Collect → Concession / transport.
        </p>
      </div>

      {!ro && (
        <div className="flex flex-col sm:flex-row gap-3">
          {s.billing_enabled ? (
            <button onClick={() => save(false)} disabled={busy} className="btn-primary flex-1">
              {busy ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Save & re-price unpaid months
            </button>
          ) : (
            <>
              <button onClick={() => save(false)} disabled={busy} className="btn-ghost flex-1"><Save className="w-4 h-4" /> Save draft</button>
              <button onClick={() => setConfirmGen(true)} disabled={busy} className="btn-garden flex-1"><Zap className="w-4 h-4" /> Start billing — generate dues</button>
            </>
          )}
        </div>
      )}

      <Modal open={confirmGen} onClose={() => setConfirmGen(false)} icon={AlertTriangle} title="Start billing?" size="sm"
             subtitle={`Every active student gets their months from ${monthLabel(`${s.billing_from}-01`, true)} onward. Anyone with a month past its due date and unpaid will show PENDING, and their marksheet is withheld until it is paid.`}>
        <p className="text-[12.5px] text-ink-700 mb-4">
          If families have already paid some of those months, either set “Bill from” later, or collect those months
          right after with the date they actually paid.
        </p>
        <button onClick={() => save(true)} disabled={busy} className="btn-garden w-full">
          {busy ? <Spinner className="w-4 h-4" /> : <Zap className="w-4 h-4" />} Yes, generate dues
        </button>
      </Modal>

      <HeadModal head={headModal} onClose={() => setHeadModal(null)} onSaved={() => { setHeadModal(null); reload(); }} />
    </div>
  );
}

function HeadModal({ head, onClose, onSaved }) {
  const { toast } = useSchool();
  const [h, setH] = useState(head);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setH(head); }, [head]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await fees.saveHead(h); toast(`${h.name} saved.`, 'success'); onSaved(); }
    catch (err) { toast(err.message, 'error', 'Not saved'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={!!head} onClose={onClose} icon={Settings2} title={head?.id ? 'Edit fee head' : 'New fee head'} size="sm">
      {h && (
        <form onSubmit={save} className="space-y-3">
          <input value={h.name} onChange={e => setH(x => ({ ...x, name: e.target.value }))} placeholder="e.g. Computer fee" className="field" maxLength={60} />
          <select value={h.frequency} onChange={e => setH(x => ({ ...x, frequency: e.target.value }))} className="field font-semibold">
            {FREQ.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          {h.frequency !== 'monthly' && (
            <label className="block text-[12px] font-bold text-ink-soft">Charged in session month no.
              <input value={String(h.due_month)} inputMode="numeric" className="field mt-1"
                     onChange={e => setH(x => ({ ...x, due_month: Math.min(Math.max(Number(digitsOnly(e.target.value)) || 1, 1), 12) }))} />
            </label>
          )}
          <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-700">
            <input type="checkbox" checked={!!h.is_optional} onChange={e => setH(x => ({ ...x, is_optional: e.target.checked }))} className="w-4 h-4 accent-ink-900" />
            Opt-in — only for students it is switched on for
          </label>
          {h.id && (
            <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-700">
              <input type="checkbox" checked={h.is_active !== false} onChange={e => setH(x => ({ ...x, is_active: e.target.checked }))} className="w-4 h-4 accent-garden-600" />
              Active (switching off removes unpaid months of this head)
            </label>
          )}
          <button type="submit" disabled={busy || !h.name?.trim()} className="btn-primary w-full">
            {busy ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Save
          </button>
        </form>
      )}
    </Modal>
  );
}
