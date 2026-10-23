import React, { useEffect, useMemo, useState } from 'react';
import {
  IndianRupee, Save, Phone, Pencil, Percent, PlusCircle, History, Settings2, AlertCircle, CheckCircle2, Users,
} from 'lucide-react';
import { useSchool } from '../../../context/SchoolContext';
import {
  fees, monthCards, ledgerTotals, allocate, monthLabel, todayKey, PAYMENT_MODES, modeLabel,
} from '../../../lib/fees';
import { Badge, Modal } from '../../../components/UI';
import { Spinner, EmptyState } from '../../../components/Loaders';
import MonthGrid, { MonthLegend } from '../../../components/fees/MonthGrid';
import { inr, numeric, digitsOnly, shortDate } from '../../../utils/format';
import { useLoad, LoadError, StudentSearch, ReceiptModal, FeeStat } from './shared';

/* ============================================================
   COLLECT — the counter. Find the child, see the twelve months,
   tick the ones being paid, take the money, print the receipt.
   ============================================================ */
export default function Collect({ onSetup, initialStudentId }) {
  const { students } = useSchool();
  const [student, setStudent] = useState(() => students.find(s => s.student_id === initialStudentId) || null);
  useEffect(() => {
    const s = students.find(x => x.student_id === initialStudentId);
    if (s) setStudent(s);
  }, [initialStudentId]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-4">
        <div className="panel p-5 lg:sticky lg:top-24">
          <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2 mb-3">
            <Users className="w-4.5 h-4.5 text-brass-600" /> Find the student
          </h3>
          <StudentSearch onPick={setStudent} selectedId={student?.student_id} autoFocus />
        </div>
      </div>
      <div className="lg:col-span-8">
        {student
          ? <StudentLedger key={student.student_id} studentId={student.student_id} onSetup={onSetup} />
          : (
            <div className="panel p-8">
              <EmptyState icon={IndianRupee} title="Choose a student to collect fees">
                Search by name, roll number, father's name or phone. Their months appear here — tick the
                ones being paid and the amount fills itself in.
              </EmptyState>
            </div>
          )}
      </div>
    </div>
  );
}

function StudentLedger({ studentId, onSetup }) {
  const { students, toast, isAdmin, afterFeeChange } = useSchool();
  const student = students.find(s => s.student_id === studentId);
  const { data, error, loading, reload } = useLoad(() => fees.getLedger(studentId), [studentId]);

  const [picked, setPicked] = useState([]);              // periods ticked
  const [amounts, setAmounts] = useState({});            // due_id → typed amount (part payment)
  const [form, setForm] = useState({ mode: 'cash', reference: '', paidOn: todayKey(), note: '' });
  const [busy, setBusy] = useState(false);
  const [receiptId, setReceiptId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showCharge, setShowCharge] = useState(false);

  const awaiting = useMemo(() => (data?.payments || []).filter(p => p.status === 'pending').flatMap(p => p.periods || []), [data]);
  const cards = useMemo(() => (data ? monthCards(data.lines, data.session, { awaiting }) : []), [data, awaiting]);
  const totals = useMemo(() => ledgerTotals(data?.lines), [data]);

  // A fresh ledger starts with nothing ticked.
  useEffect(() => { setPicked([]); setAmounts({}); }, [data]);

  const plan = useMemo(() => allocate(cards, picked), [cards, picked]);
  const lines = plan.lines.map(l => ({ ...l, typed: amounts[l.due_id], amount: amounts[l.due_id] != null ? Number(amounts[l.due_id]) || 0 : l.amount, max: l.amount }));
  const total = Math.round(lines.reduce((a, l) => a + l.amount, 0) * 100) / 100;

  const toggle = (period) => setPicked(p => (p.includes(period) ? p.filter(x => x !== period) : [...p, period]));
  const pickOverdue = () => setPicked(cards.filter(c => c.balance > 0 && ['overdue', 'partial', 'due'].includes(c.status)).map(c => c.period));
  const pickUpTo = (period) => setPicked(cards.filter(c => c.balance > 0 && c.period <= period).map(c => c.period));

  const needsRef = ['cheque', 'upi', 'bank', 'card'].includes(form.mode);

  const submit = async (e) => {
    e.preventDefault();
    const bad = lines.find(l => !(l.amount > 0) || l.amount > l.max);
    if (!lines.length) return toast('Tick at least one month.', 'error', 'Nothing selected');
    if (bad) return toast(`${bad.head} for ${monthLabel(bad.period)} must be between ₹1 and ${inr(bad.max)}.`, 'error', 'Check the amounts');
    if (needsRef && !form.reference.trim()) return toast(`Enter the ${form.mode === 'cheque' ? 'cheque number' : 'transaction reference'}.`, 'error', 'Reference needed');

    setBusy(true);
    try {
      const res = await fees.collect({
        studentId, lines: lines.map(l => ({ due_id: l.due_id, amount: l.amount })),
        mode: form.mode, reference: form.reference.trim(), paidOn: form.paidOn, note: form.note.trim(), source: 'counter',
      });
      toast(`${inr(res.amount)} received from ${student?.name}. Receipt ${res.receipt_no}.`, 'success', 'Fee collected');
      setForm(f => ({ ...f, reference: '', note: '' }));
      afterFeeChange(studentId);
      await reload();
      setReceiptId(res.payment_id);
    } catch (err) {
      toast(err.message, 'error', 'Not saved');
    } finally {
      setBusy(false);
    }
  };

  if (!student) return null;
  if (error) return <LoadError message={error} onRetry={reload} />;
  if (loading && !data) return <div className="panel p-10 flex justify-center"><Spinner /></div>;

  const noLedger = !data.session || data.lines.length === 0;

  return (
    <div className="space-y-5">
      {/* who */}
      <div className="panel p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">Class {student.class}-{student.section || 'A'} · Roll {student.roll_no}</p>
            <h3 className="font-display text-xl font-extrabold text-ink-950 truncate">{student.name}</h3>
            <p className="text-[12.5px] text-ink-soft mt-0.5">
              {student.father_name ? `Father: ${student.father_name}` : 'No parent name on file'}
              {student.contact && <> · <a href={`tel:${student.contact}`} className="font-bold text-ink-800 hover:underline inline-flex items-center gap-1"><Phone className="w-3 h-3" />{student.contact}</a></>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Badge tone={student.fee_status === 'PAID' ? 'garden' : 'rose'}>{student.fee_status}</Badge>
            {isAdmin && !noLedger && (
              <>
                <button onClick={() => setShowAdjust(true)} className="btn-ghost text-xs py-1.5"><Percent className="w-3.5 h-3.5" /> Concession / transport</button>
                <button onClick={() => setShowCharge(true)} className="btn-ghost text-xs py-1.5"><PlusCircle className="w-3.5 h-3.5" /> Add charge</button>
              </>
            )}
          </div>
        </div>

        {noLedger ? (
          <div className="mt-5 flex items-start gap-3 p-4 rounded-2xl bg-brass-50 border border-brass-200">
            <AlertCircle className="w-5 h-5 text-brass-600 shrink-0" />
            <div className="text-[13px] text-ink-700">
              {data.session
                ? <>No fees are set for this student yet. Check that Class {student.class} has rates in Setup and that dues have been generated.</>
                : <>The fee ledger has not been set up.</>}
              {isAdmin && <button onClick={onSetup} className="block mt-2 font-bold text-brass-800 hover:underline">Open fee setup →</button>}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
              <FeeStat label="Session total" value={inr(totals.net)} />
              <FeeStat label="Paid" value={inr(totals.paid)} tone="garden" />
              <FeeStat label="Overdue now" value={inr(totals.overdue)} tone={totals.overdue > 0 ? 'rose' : 'ink'} />
              <FeeStat label="Still to come" value={inr(totals.balance - totals.overdue)} tone="brass" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-5 mb-2.5">
              <p className="text-[12px] font-bold text-ink-700">
                {editMode ? 'Tap a month to change its amount, concession or waive it.' : 'Tick the months being paid'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {!editMode && <>
                  <button type="button" onClick={pickOverdue} className="px-2.5 py-1 rounded-lg border border-ink-900/12 text-[11.5px] font-bold hover:bg-ink-50">All due</button>
                  <button type="button" onClick={() => pickUpTo(cards.filter(c => c.balance > 0).at(-1)?.period || '')} className="px-2.5 py-1 rounded-lg border border-ink-900/12 text-[11.5px] font-bold hover:bg-ink-50">Whole session</button>
                  {picked.length > 0 && <button type="button" onClick={() => setPicked([])} className="px-2.5 py-1 rounded-lg text-[11.5px] font-bold text-rose-600 hover:bg-rose-50">Clear</button>}
                </>}
                {isAdmin && (
                  <button type="button" onClick={() => { setEditMode(m => !m); setPicked([]); }}
                          className={`px-2.5 py-1 rounded-lg border text-[11.5px] font-bold inline-flex items-center gap-1 ${editMode ? 'bg-ink-950 text-brass-300 border-ink-950' : 'border-ink-900/12 hover:bg-ink-50'}`}>
                    <Pencil className="w-3 h-3" /> {editMode ? 'Done editing' : 'Edit months'}
                  </button>
                )}
              </div>
            </div>

            <MonthGrid cards={cards} selected={picked} onToggle={toggle} selectable={!editMode}
                       onOpen={editMode ? (c) => c.lines.length && setEditCard(c) : undefined} />
            <div className="mt-3"><MonthLegend /></div>
            {awaiting.length > 0 && (
              <p className="text-[11.5px] text-sky-700 font-semibold mt-2">
                “Checking” months have an online payment from the parent waiting in the Verify tab — verify it there instead of collecting again.
              </p>
            )}
          </>
        )}
      </div>

      {/* take the money */}
      {!noLedger && lines.length > 0 && (
        <form onSubmit={submit} className="panel p-5 sm:p-6">
          <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2 mb-3">
            <IndianRupee className="w-4.5 h-4.5 text-garden-600" /> Payment
          </h3>

          <div className="rounded-2xl border border-ink-900/8 divide-y divide-ink-900/6 overflow-hidden">
            {lines.map(l => (
              <div key={l.due_id} className="flex items-center gap-3 px-3.5 py-2.5 bg-white">
                <span className="w-16 text-[12px] font-extrabold text-ink-950">{monthLabel(l.period)}</span>
                <span className="flex-1 text-[12.5px] text-ink-700 truncate">{l.head}</span>
                <div className="relative w-32">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-ink-faint">₹</span>
                  <input value={l.typed ?? String(l.max)} inputMode="decimal" autoComplete="off"
                         onChange={numeric(e => setAmounts(a => ({ ...a, [l.due_id]: e.target.value })), { decimal: true })}
                         aria-label={`${l.head} ${monthLabel(l.period)} amount`}
                         className={`field py-1.5 pl-6 text-right font-mono font-bold text-[13px] ${l.amount > l.max || !(l.amount > 0) ? 'field-error' : ''}`} />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between px-3.5 py-3 bg-ink-950 text-white">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-300">{picked.length} {picked.length === 1 ? 'month' : 'months'} · total</span>
              <span className="font-display text-xl font-extrabold font-mono text-brass-300">{inr(total)}</span>
            </div>
          </div>
          <p className="text-[11px] text-ink-faint mt-1.5">Lower an amount to take a part payment — the rest stays due on that month.</p>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="field-label">Paid by</label>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_MODES.filter(([m]) => m !== 'online').map(([m, label]) => (
                  <button key={m} type="button" onClick={() => setForm(f => ({ ...f, mode: m }))}
                          className={`px-3 py-2 rounded-xl text-[12px] font-bold border transition-colors ${
                            form.mode === m ? 'bg-ink-950 text-brass-300 border-ink-950' : 'bg-white text-ink-700 border-ink-900/12 hover:bg-ink-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="fc-date">Date received</label>
              <input id="fc-date" type="date" max={todayKey()} value={form.paidOn}
                     onChange={e => setForm(f => ({ ...f, paidOn: e.target.value }))} className="field" />
            </div>
            {needsRef && (
              <div>
                <label className="field-label" htmlFor="fc-ref">{form.mode === 'cheque' ? 'Cheque number & bank' : 'Transaction / UTR number'} <span className="text-rose-500">*</span></label>
                <input id="fc-ref" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                       autoComplete="off" className="field font-mono" maxLength={60} />
              </div>
            )}
            <div className={needsRef ? '' : 'sm:col-span-2'}>
              <label className="field-label" htmlFor="fc-note">Note <span className="text-ink-faint font-normal">(optional)</span></label>
              <input id="fc-note" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                     className="field" maxLength={200} placeholder="e.g. paid by elder brother" />
            </div>
          </div>

          <button type="submit" disabled={busy} className="btn-garden w-full mt-5">
            {busy ? <><Spinner className="w-4 h-4" /> Saving…</> : <><Save className="w-4 h-4" /> Receive {inr(total)} & print receipt</>}
          </button>
        </form>
      )}

      {/* history */}
      {!noLedger && <PaymentHistory payments={data.payments} onOpen={setReceiptId} />}

      <ReceiptModal paymentId={receiptId} onClose={() => setReceiptId(null)} onChanged={reload} />
      {isAdmin && <>
        <EditMonthModal card={editCard} onClose={() => setEditCard(null)} onSaved={() => { setEditCard(null); afterFeeChange(studentId); reload(); }} />
        <AdjustModal open={showAdjust} studentId={studentId} adjustments={data.adjustments}
                     onClose={() => setShowAdjust(false)} onSaved={() => { setShowAdjust(false); afterFeeChange(studentId); reload(); }} />
        <ChargeModal open={showCharge} studentId={studentId} session={data.session}
                     onClose={() => setShowCharge(false)} onSaved={() => { setShowCharge(false); afterFeeChange(studentId); reload(); }} />
      </>}
    </div>
  );
}

const STATUS_TONE = { verified: 'garden', pending: 'brass', rejected: 'ink', cancelled: 'rose' };

function PaymentHistory({ payments, onOpen }) {
  return (
    <div className="panel p-5 sm:p-6">
      <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2 mb-3">
        <History className="w-4.5 h-4.5 text-brass-600" /> Receipts this session
      </h3>
      {payments.length === 0 ? (
        <p className="text-[13px] text-ink-soft">No payments yet.</p>
      ) : (
        <div className="divide-y divide-ink-900/6">
          {payments.map(p => (
            <button key={p.id} onClick={() => p.status !== 'pending' && onOpen(p.id)}
                    className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-ink-50/60 rounded-xl px-2 -mx-2">
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold text-ink-950 truncate">
                  {(p.periods || []).length ? p.periods.map(x => monthLabel(x)).join(', ') : p.category}
                </span>
                <span className="block text-[11px] text-ink-faint">
                  {shortDate(p.paid_on)} · {modeLabel(p.mode)} · {p.receipt_no || p.txn_ref}
                </span>
              </span>
              <span className="text-[13px] font-extrabold font-mono text-ink-950">{inr(p.amount)}</span>
              <Badge tone={STATUS_TONE[p.status] || 'ink'}>{p.status === 'pending' ? 'to verify' : p.status}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Principal: change one month — amount, concession, waive, note. */
function EditMonthModal({ card, onClose, onSaved }) {
  const { toast } = useSchool();
  const [rows, setRows] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (card) { setRows(card.lines.map(l => ({ ...l, amount: String(l.amount), concession: String(l.concession) }))); setNote(''); }
  }, [card]);

  const save = async () => {
    setBusy(true);
    try {
      for (const r of rows) {
        const orig = card.lines.find(l => l.id === r.id);
        const a = Number(r.amount), c = Number(r.concession);
        if (a !== orig.amount || c !== orig.concession || r.waived !== orig.waived || note.trim()) {
          await fees.updateDue(r.id, { amount: a, concession: c, waived: r.waived, note: note.trim() || null });
        }
      }
      toast(`${monthLabel(card.period, true)} updated.`, 'success', 'Saved');
      onSaved();
    } catch (e) { toast(e.message, 'error', 'Not saved'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={!!card} onClose={onClose} icon={Pencil} title={card ? `Edit ${monthLabel(card.period, true)}` : ''}
           subtitle="Changes are recorded in the activity log. Amounts already paid cannot be reduced below what was received." size="md">
      {card && (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.id} className="rounded-2xl border border-ink-900/8 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-extrabold text-ink-950">{r.head_name}</p>
                <span className="text-[11px] text-ink-faint">Paid {inr(r.paid)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[11px] font-bold text-ink-soft">Amount
                  <input value={r.amount} inputMode="decimal" className="field mt-1 font-mono"
                         onChange={numeric(e => setRows(x => x.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y))), { decimal: true })} />
                </label>
                <label className="text-[11px] font-bold text-ink-soft">Concession
                  <input value={r.concession} inputMode="decimal" className="field mt-1 font-mono"
                         onChange={numeric(e => setRows(x => x.map((y, j) => (j === i ? { ...y, concession: e.target.value } : y))), { decimal: true })} />
                </label>
              </div>
              <label className="flex items-center gap-2 mt-2.5 text-[12.5px] font-semibold text-ink-700">
                <input type="checkbox" checked={!!r.waived} className="w-4 h-4 accent-ink-900"
                       onChange={e => setRows(x => x.map((y, j) => (j === i ? { ...y, waived: e.target.checked } : y)))} />
                Waive this month (nothing is owed)
              </label>
            </div>
          ))}
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason / note (recommended)" className="field" maxLength={200} />
          <button onClick={save} disabled={busy} className="btn-primary w-full">
            {busy ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Save changes
          </button>
        </div>
      )}
    </Modal>
  );
}

/* Principal: concessions, a transport route fare, opting into optional heads. */
function AdjustModal({ open, studentId, adjustments, onClose, onSaved }) {
  const { toast } = useSchool();
  const { data: setup } = useLoad(() => (open ? fees.getSetup() : Promise.resolve(null)), [open]);
  const [rows, setRows] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!setup) return;
    const next = {};
    for (const h of setup.heads.filter(x => x.is_active)) {
      const a = adjustments.find(x => x.head_id === h.id);
      next[h.id] = {
        opted: a ? a.opted : !(h.is_optional || h.frequency === 'one_time'),
        amountOverride: a?.amount_override != null ? String(a.amount_override) : '',
        pct: a ? String(Number(a.concession_pct) || '') : '', flat: a ? String(Number(a.concession_flat) || '') : '',
        reason: a?.reason || '', existed: !!a,
      };
    }
    setRows(next);
  }, [setup, adjustments]);

  const set = (id, k, v) => setRows(r => ({ ...r, [id]: { ...r[id], [k]: v } }));

  const save = async () => {
    setBusy(true);
    try {
      for (const h of setup.heads.filter(x => x.is_active)) {
        const r = rows[h.id];
        const defaultOpted = !(h.is_optional || h.frequency === 'one_time');
        const touched = r.existed || r.opted !== defaultOpted || r.amountOverride || r.pct || r.flat;
        if (!touched) continue;
        await fees.setAdjustment({
          studentId, headId: h.id, opted: r.opted, amountOverride: r.amountOverride || null,
          concessionPct: Number(r.pct) || 0, concessionFlat: Number(r.flat) || 0, reason: r.reason,
        });
      }
      toast('Months not yet paid have been re-priced.', 'success', 'Concessions saved');
      onSaved();
    } catch (e) { toast(e.message, 'error', 'Not saved'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} icon={Percent} title="Concessions & optional fees" size="lg"
           subtitle="Applies to every month of the session that has not been paid or edited by hand.">
      {!setup ? <div className="py-8 flex justify-center"><Spinner /></div> : (
        <div className="space-y-3">
          {setup.heads.filter(h => h.is_active).map(h => {
            const r = rows[h.id]; if (!r) return null;
            const optional = h.is_optional || h.frequency === 'one_time';
            return (
              <div key={h.id} className="rounded-2xl border border-ink-900/8 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-extrabold text-ink-950">{h.name}
                    <span className="ml-2 text-[10.5px] font-bold text-ink-faint uppercase">{h.frequency.replace('_', '-')}{optional ? ' · opt-in' : ''}</span></p>
                  <label className="flex items-center gap-2 text-[12px] font-bold text-ink-700">
                    <input type="checkbox" checked={r.opted} onChange={e => set(h.id, 'opted', e.target.checked)} className="w-4 h-4 accent-garden-600" />
                    {optional ? 'Charge this' : 'Applies'}
                  </label>
                </div>
                {r.opted && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
                    <label className="text-[11px] font-bold text-ink-soft">Own amount (₹)
                      <input value={r.amountOverride} placeholder="class rate" inputMode="decimal" className="field mt-1 py-2 font-mono"
                             onChange={e => set(h.id, 'amountOverride', digitsOnly(e.target.value, { decimal: true }))} />
                    </label>
                    <label className="text-[11px] font-bold text-ink-soft">Concession %
                      <input value={r.pct} inputMode="decimal" className="field mt-1 py-2 font-mono"
                             onChange={e => set(h.id, 'pct', digitsOnly(e.target.value, { decimal: true }))} />
                    </label>
                    <label className="text-[11px] font-bold text-ink-soft">or ₹ off
                      <input value={r.flat} inputMode="decimal" className="field mt-1 py-2 font-mono"
                             onChange={e => set(h.id, 'flat', digitsOnly(e.target.value, { decimal: true }))} />
                    </label>
                    <label className="text-[11px] font-bold text-ink-soft">Reason
                      <input value={r.reason} placeholder="Sibling, staff ward…" className="field mt-1 py-2"
                             onChange={e => set(h.id, 'reason', e.target.value)} />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
          <button onClick={save} disabled={busy} className="btn-primary w-full">
            {busy ? <Spinner className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} Save and re-price
          </button>
        </div>
      )}
    </Modal>
  );
}

/* Principal: a one-off charge — late fine, arrears from before the ledger. */
function ChargeModal({ open, studentId, session, onClose, onSaved }) {
  const { toast } = useSchool();
  const { data: setup } = useLoad(() => (open ? fees.getSetup() : Promise.resolve(null)), [open]);
  const [f, setF] = useState({ headId: '', period: todayKey().slice(0, 7), amount: '', note: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (setup && !f.headId) setF(x => ({ ...x, headId: (setup.heads.find(h => h.name === 'Late fine') || setup.heads[0])?.id || '' }));
  }, [setup]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await fees.addDue({ studentId, period: `${f.period}-01`, headId: f.headId, amount: Number(f.amount), note: f.note });
      toast(`${inr(f.amount)} added to ${monthLabel(`${f.period}-01`, true)}.`, 'success', 'Charge added');
      setF(x => ({ ...x, amount: '', note: '' }));
      onSaved();
    } catch (err) { toast(err.message, 'error', 'Not added'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} icon={PlusCircle} title="Add a charge" size="sm"
           subtitle="A late fine, a lost book, or arrears carried over from before this system.">
      {!setup ? <div className="py-8 flex justify-center"><Spinner /></div> : (
        <form onSubmit={save} className="space-y-3">
          <select value={f.headId} onChange={e => setF(x => ({ ...x, headId: e.target.value }))} className="field font-semibold">
            {setup.heads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <input type="month" value={f.period} onChange={e => setF(x => ({ ...x, period: e.target.value }))}
                 min={session?.starts_on?.slice(0, 7)} className="field" aria-label="Month" />
          <input value={f.amount} inputMode="decimal" placeholder="Amount (₹)" className="field font-mono font-bold"
                 onChange={numeric(e => setF(x => ({ ...x, amount: e.target.value })), { decimal: true })} />
          <input value={f.note} onChange={e => setF(x => ({ ...x, note: e.target.value }))} placeholder="Note" className="field" maxLength={200} />
          <button type="submit" disabled={busy || !(Number(f.amount) > 0)} className="btn-primary w-full">
            {busy ? <Spinner className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />} Add charge
          </button>
        </form>
      )}
    </Modal>
  );
}
