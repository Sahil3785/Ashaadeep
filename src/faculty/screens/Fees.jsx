import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IndianRupee, Search, ChevronLeft, CheckCircle2, XCircle, Share2, Ban, ShieldCheck, BookOpen, Phone,
} from 'lucide-react';
import { CLASS_LIST } from '../../data/school';
import { useSchool } from '../../context/SchoolContext';
import {
  fees, monthCards, ledgerTotals, allocate, monthLabel, todayKey, PAYMENT_MODES, modeLabel,
} from '../../lib/fees';
import MonthGrid, { MonthLegend } from '../../components/fees/MonthGrid';
import { receiptText } from '../../components/fees/FeeReceipt';
import { Screen, Card, Field, Btn, Pill, Sheet, Empty, inputCls, selectCls } from '../components/Chrome';
import { tap } from '../native';
import { inr, initialsOf, numeric, shortDate } from '../../utils/format';

/* ============================================================
   Fees — the fee desk in a teacher's pocket.

     Collect   find a child, tick months, take cash or UPI
     Verify    confirm payments parents reported online
     Today     today's receipts, to share or cancel

   Same ledger and the same rules as the office dashboard.
   ============================================================ */
export default function Fees({ initialStudentId }) {
  const { feeSummary } = useSchool();
  const [view, setView] = useState('collect');
  const [studentId, setStudentId] = useState(initialStudentId || null);

  useEffect(() => { fees.refreshAllStatus().catch(() => {}); }, []);
  useEffect(() => { if (initialStudentId) { setStudentId(initialStudentId); setView('collect'); } }, [initialStudentId]);

  if (view === 'collect' && studentId) {
    return <StudentFees studentId={studentId} onBack={() => setStudentId(null)} />;
  }

  return (
    <Screen icon={IndianRupee} title="Fees" subtitle="Month-wise fee collection">
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-white border border-ink-900/8 mb-4" role="group" aria-label="Fee sections">
        {[['collect', 'Collect'], ['verify', `Verify${feeSummary?.pending ? ` (${feeSummary.pending})` : ''}`], ['today', 'Today']].map(([id, label]) => (
          <button key={id} onClick={() => { tap(); setView(id); }} aria-pressed={view === id}
                  className={`py-2.5 rounded-xl text-[13px] font-bold transition-colors ${view === id ? 'bg-ink-950 text-brass-300' : 'text-ink-600 active:bg-ink-50'}`}>
            {label}
          </button>
        ))}
      </div>
      {view === 'collect' && <PickStudent onPick={setStudentId} />}
      {view === 'verify' && <VerifyList />}
      {view === 'today' && <TodayList />}
    </Screen>
  );
}

/* ---------- choose a student ---------- */
function PickStudent({ onPick }) {
  const { students } = useSchool();
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('ALL');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return students.filter(x => (cls === 'ALL' || x.class === cls) &&
      (!s || x.name.toLowerCase().includes(s) || String(x.roll_no) === s || (x.father_name || '').toLowerCase().includes(s)))
      .sort((a, b) => CLASS_LIST.indexOf(a.class) - CLASS_LIST.indexOf(b.class) || Number(a.roll_no) - Number(b.roll_no))
      .slice(0, 40);
  }, [students, q, cls]);

  return (
    <>
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Name, roll or father" autoComplete="off" className={`${inputCls()} pl-10`} />
        </div>
        <select value={cls} onChange={e => setCls(e.target.value)} className={`${selectCls()} w-24`} aria-label="Class">
          <option value="ALL">All</option>
          {CLASS_LIST.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      {shown.length === 0 ? <Empty icon={Search} title="No student found">Try another name or class.</Empty> : (
        <Card className="divide-y divide-ink-900/6">
          {shown.map(s => (
            <button key={s.student_id} onClick={() => { tap(); onPick(s.student_id); }}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-ink-50 text-left">
              <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-[11px] font-extrabold ${s.fee_status === 'PAID' ? 'bg-garden-100 text-garden-700' : 'bg-rose-500 text-white'}`}>
                {initialsOf(s.name)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-bold text-ink-950 truncate">{s.name}</span>
                <span className="block text-[11.5px] text-ink-soft">{s.class}-{s.section || 'A'} · Roll {s.roll_no}</span>
              </span>
              <Pill tone={s.fee_status === 'PAID' ? 'garden' : 'rose'}>{s.fee_status}</Pill>
            </button>
          ))}
        </Card>
      )}
    </>
  );
}

/* ---------- one student's months, and collecting ---------- */
function StudentFees({ studentId, onBack }) {
  const { students, toast, afterFeeChange } = useSchool();
  const student = students.find(s => s.student_id === studentId);
  const [ledger, setLedger] = useState(null);
  const [picked, setPicked] = useState([]);
  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({ mode: 'cash', reference: '', paidOn: todayKey(), note: '' });
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const load = useCallback(async () => {
    try { setLedger(await fees.getLedger(studentId)); setPicked([]); }
    catch (e) { toast(e.message, 'error', 'Could not load fees'); }
  }, [studentId, toast]);
  useEffect(() => { load(); }, [load]);

  const awaiting = useMemo(() => (ledger?.payments || []).filter(p => p.status === 'pending').flatMap(p => p.periods || []), [ledger]);
  const cards = useMemo(() => (ledger ? monthCards(ledger.lines, ledger.session, { awaiting }) : []), [ledger, awaiting]);
  const totals = useMemo(() => ledgerTotals(ledger?.lines), [ledger]);
  const plan = useMemo(() => allocate(cards, picked), [cards, picked]);
  const needsRef = ['cheque', 'upi', 'bank', 'card'].includes(form.mode);

  const toggle = (p) => { tap(); setPicked(x => (x.includes(p) ? x.filter(y => y !== p) : [...x, p])); };

  const collect = async () => {
    if (needsRef && !form.reference.trim()) { tap('error'); return toast('Enter the transaction or cheque number.', 'error', 'Reference needed'); }
    setBusy(true);
    try {
      const res = await fees.collect({ studentId, lines: plan.lines, mode: form.mode, reference: form.reference.trim(),
                                       paidOn: form.paidOn, note: form.note.trim(), source: 'app' });
      tap('success');
      setSheet(false);
      setForm(f => ({ ...f, reference: '', note: '' }));
      afterFeeChange(studentId);
      setReceipt(await fees.getPayment(res.payment_id));
      load();
    } catch (e) { tap('error'); toast(e.message, 'error', 'Not saved'); }
    finally { setBusy(false); }
  };

  if (!student) return null;
  const noLedger = ledger && (!ledger.session || ledger.lines.length === 0);

  return (
    <Screen title={student.name} subtitle={`${student.class}-${student.section || 'A'} · Roll ${student.roll_no}`} onBack={onBack}
            action={student.contact && (
              <a href={`tel:${student.contact}`} aria-label="Call parent" className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><Phone className="w-4 h-4" /></a>
            )}>
      {!ledger ? <Card className="p-8 text-center text-[13px] text-ink-soft">Loading…</Card> :
       noLedger ? <Empty icon={IndianRupee} title="No fees set up">The principal sets fee rates and starts billing from the website dashboard → Fees → Setup.</Empty> : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[['Paid', totals.paid, 'text-garden-700'], ['Overdue', totals.overdue, totals.overdue ? 'text-rose-600' : 'text-ink-950'], ['To come', totals.balance - totals.overdue, 'text-ink-950']].map(([k, v, c]) => (
              <Card key={k} className="p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">{k}</p>
                <p className={`text-[15px] font-extrabold font-mono mt-0.5 ${c}`}>{inr(v)}</p>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-bold text-ink-700">Tick months to collect</p>
            <button onClick={() => setPicked(cards.filter(c => c.balance > 0 && ['overdue', 'due', 'partial'].includes(c.status)).map(c => c.period))}
                    className="text-[12px] font-bold text-brass-700 px-2 py-1 active:bg-brass-50 rounded-lg">All due</button>
          </div>
          <MonthGrid cards={cards} selected={picked} onToggle={toggle} selectable size="sm" />
          <div className="mt-3"><MonthLegend /></div>

          <h2 className="text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-faint mt-6 mb-2.5">Receipts</h2>
          {ledger.payments.length === 0 ? <Card className="p-4 text-[13px] text-ink-soft">No payments yet this session.</Card> : (
            <Card className="divide-y divide-ink-900/6">
              {ledger.payments.map(p => (
                <button key={p.id} onClick={async () => p.status !== 'pending' && setReceipt(await fees.getPayment(p.id))}
                        className="w-full flex items-center gap-3 px-4 py-3 active:bg-ink-50 text-left">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-bold text-ink-950 truncate">{(p.periods || []).map(x => monthLabel(x)).join(', ') || p.category}</span>
                    <span className="block text-[11px] text-ink-faint">{shortDate(p.paid_on)} · {modeLabel(p.mode)}</span>
                  </span>
                  <span className="text-[13px] font-extrabold font-mono">{inr(p.amount)}</span>
                  <Pill tone={p.status === 'verified' ? 'garden' : p.status === 'pending' ? 'brass' : 'rose'}>{p.status === 'verified' ? 'paid' : p.status}</Pill>
                </button>
              ))}
            </Card>
          )}

          {picked.length > 0 && (
            <div className="fixed left-0 right-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 px-4 app-float-bar">
              <Btn variant="garden" onClick={() => { tap(); setSheet(true); }}>
                Collect {inr(plan.total)} · {picked.length} {picked.length === 1 ? 'month' : 'months'}
              </Btn>
            </div>
          )}
        </>
      )}

      <Sheet open={sheet} onClose={() => setSheet(false)} title={`Collect ${inr(plan.total)}`}>
        <div className="space-y-4">
          <Card className="divide-y divide-ink-900/6">
            {plan.lines.map(l => (
              <div key={l.due_id} className="flex justify-between px-3.5 py-2 text-[12.5px]">
                <span><strong>{monthLabel(l.period)}</strong> · {l.head}</span><span className="font-mono font-bold">{inr(l.amount)}</span>
              </div>
            ))}
          </Card>
          <Field label="Paid by">
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_MODES.filter(([m]) => ['cash', 'upi', 'cheque', 'bank'].includes(m)).map(([m, label]) => (
                <button key={m} type="button" onClick={() => { tap(); setForm(f => ({ ...f, mode: m })); }}
                        className={`py-2.5 rounded-xl text-[12.5px] font-bold border ${form.mode === m ? 'bg-ink-950 text-brass-300 border-ink-950' : 'bg-white text-ink-700 border-ink-900/15'}`}>
                  {label}
                </button>
              ))}
            </div>
          </Field>
          {needsRef && (
            <Field label={form.mode === 'cheque' ? 'Cheque number & bank' : 'Transaction / UTR number'} required>
              <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} autoComplete="off" className={`${inputCls()} font-mono`} />
            </Field>
          )}
          <Field label="Date received">
            <input type="date" max={todayKey()} value={form.paidOn} onChange={e => setForm(f => ({ ...f, paidOn: e.target.value }))} className={inputCls()} />
          </Field>
          <Field label="Note (optional)">
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className={inputCls()} maxLength={200} />
          </Field>
          <Btn variant="garden" disabled={busy} onClick={collect}>{busy ? 'Saving…' : `Receive ${inr(plan.total)}`}</Btn>
        </div>
      </Sheet>

      <ReceiptSheet receipt={receipt} onClose={() => setReceipt(null)} onChanged={() => { afterFeeChange(studentId); load(); }} />
    </Screen>
  );
}

/* ---------- a receipt: share it, or cancel it ---------- */
function ReceiptSheet({ receipt, onClose, onChanged }) {
  const { toast } = useSchool();
  const [reason, setReason] = useState('');
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setAsking(false); setReason(''); }, [receipt]);
  const p = receipt?.payment;

  const share = async () => {
    const text = receiptText(p, receipt.items);
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: `Receipt ${p.receipt_no}`, text });
    } catch {
      try { await navigator.share?.({ text }); } catch { /* cancelled */ }
    }
  };

  const cancel = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await fees.cancel(p.id, reason.trim());
      tap('success');
      toast(`Receipt ${p.receipt_no} cancelled.`, 'warning', 'Cancelled');
      onChanged?.(); onClose();
    } catch (e) { tap('error'); toast(e.message, 'error', 'Not cancelled'); }
    finally { setBusy(false); }
  };

  return (
    <Sheet open={!!p} onClose={onClose} title={p ? `Receipt ${p.receipt_no || ''}` : ''}>
      {p && (
        <div className="space-y-4">
          <Card className="p-4 text-center">
            {p.status === 'verified' ? <CheckCircle2 className="w-9 h-9 text-garden-600 mx-auto" /> : <Ban className="w-9 h-9 text-rose-500 mx-auto" />}
            <p className="font-display text-2xl font-extrabold text-ink-950 mt-2">{inr(p.amount)}</p>
            <p className="text-[12px] text-ink-soft mt-1">{p.student_name} · {p.class} · Roll {p.roll_no}</p>
            <p className="text-[11.5px] text-ink-faint mt-0.5">{shortDate(p.paid_on)} · {modeLabel(p.mode)}{p.utr ? ` · ${p.utr}` : ''}</p>
            {p.status === 'cancelled' && <p className="text-[12px] font-bold text-rose-600 mt-2">Cancelled — {p.cancel_reason}</p>}
          </Card>
          <Card className="divide-y divide-ink-900/6">
            {receipt.items.map((i, k) => (
              <div key={k} className="flex justify-between px-3.5 py-2 text-[12.5px]">
                <span><strong>{monthLabel(i.period)}</strong> · {i.head_name}</span><span className="font-mono font-bold">{inr(i.amount)}</span>
              </div>
            ))}
          </Card>
          <Btn variant="ink" onClick={share}><Share2 className="w-4.5 h-4.5" /> Share receipt</Btn>
          {p.status === 'verified' && (asking ? (
            <div className="space-y-2.5">
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is it being cancelled?" className={inputCls()} autoFocus />
              <Btn variant="danger" disabled={busy || !reason.trim()} onClick={cancel}>{busy ? 'Cancelling…' : 'Confirm cancel'}</Btn>
            </div>
          ) : (
            <Btn variant="danger" onClick={() => setAsking(true)}><Ban className="w-4.5 h-4.5" /> Cancel this receipt</Btn>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/* ---------- online payments waiting ---------- */
function VerifyList() {
  const { students, toast, afterFeeChange, refreshFeeSummary } = useSchool();
  const [rows, setRows] = useState(null);
  const [job, setJob] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [picked, setPicked] = useState([]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setRows(await fees.listPayments({ status: 'pending', limit: 200 })); } catch (e) { toast(e.message, 'error'); setRows([]); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const studentFor = (p) => students.find(s => s.student_id === p.claimed_student_id) ||
    students.find(s => s.class === p.class && String(s.roll_no) === String(p.roll_no));

  const open = async (p) => {
    tap();
    const s = studentFor(p);
    setJob({ p, s }); setLedger(null); setReason('');
    if (!s) return;
    const l = await fees.getLedger(s.student_id);
    const cards = monthCards(l.lines, l.session);
    const openMonths = cards.filter(c => c.balance > 0).map(c => c.period);
    let chosen = openMonths.filter(x => (p.periods || []).includes(x));
    for (const extra of openMonths) {
      if (allocate(cards, chosen, p.amount).unallocated <= 0) break;
      if (!chosen.includes(extra)) chosen = [...chosen, extra];
    }
    setLedger(l); setPicked(chosen);
  };

  const cards = useMemo(() => (ledger ? monthCards(ledger.lines, ledger.session) : []), [ledger]);
  const plan = job && ledger ? allocate(cards, picked, job.p.amount) : null;
  const exact = plan && plan.unallocated <= 0.009 && plan.total > 0;

  const verify = async () => {
    setBusy(true);
    try {
      await fees.verify(job.p.id, job.s.student_id, plan.lines);
      tap('success'); toast(`${inr(job.p.amount)} verified for ${job.s.name}.`, 'success', 'Verified');
      afterFeeChange(job.s.student_id); setJob(null); load();
    } catch (e) { tap('error'); toast(e.message, 'error', 'Not verified'); }
    finally { setBusy(false); }
  };

  const reject = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await fees.reject(job.p.id, reason.trim());
      toast('Payment claim rejected.', 'info'); setJob(null); load(); refreshFeeSummary();
    } catch (e) { toast(e.message, 'error', 'Not rejected'); }
    finally { setBusy(false); }
  };

  if (!rows) return <Card className="p-8 text-center text-[13px] text-ink-soft">Loading…</Card>;
  return (
    <>
      {rows.length === 0 ? <Empty icon={ShieldCheck} title="Nothing to verify">Every online payment has been checked.</Empty> : (
        <Card className="divide-y divide-ink-900/6">
          {rows.map(p => (
            <button key={p.id} onClick={() => open(p)} className="w-full flex items-center gap-3 px-4 py-3 active:bg-ink-50 text-left">
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-bold text-ink-950 truncate">{p.student_name}</span>
                <span className="block text-[11.5px] text-ink-soft truncate">{p.class} · Roll {p.roll_no} · UTR {p.utr}</span>
              </span>
              <span className="text-[14px] font-extrabold font-mono">{inr(p.amount)}</span>
            </button>
          ))}
        </Card>
      )}
      <p className="text-[11px] text-ink-faint text-center mt-4 px-3 leading-relaxed">
        Verify only after finding the UTR in the school's bank or UPI statement.
      </p>

      <Sheet open={!!job} onClose={() => setJob(null)} title={job ? `${inr(job.p.amount)} · UTR ${job.p.utr}` : ''}>
        {job && (
          <div className="space-y-4">
            {!job.s ? (
              <Card className="p-4 text-[13px] text-ink-700">
                No student on the register matches {job.p.student_name} (Class {job.p.class}, roll {job.p.roll_no}).
                Verify this one from the website dashboard, where you can search the register — or reject it.
              </Card>
            ) : !ledger ? <Card className="p-6 text-center text-[13px] text-ink-soft">Loading…</Card> : (
              <>
                <p className="text-[13px] font-bold text-ink-950">{job.s.name} · {job.s.class} · Roll {job.s.roll_no}</p>
                <MonthGrid cards={cards} selected={picked} selectable size="sm"
                           onToggle={(x) => setPicked(v => (v.includes(x) ? v.filter(y => y !== x) : [...v, x]))} />
                <p className={`text-[12.5px] font-bold ${exact ? 'text-garden-700' : 'text-brass-700'}`}>
                  Matched {inr(plan.total)} of {inr(job.p.amount)}{exact ? '' : ' — tick the months this pays for'}
                </p>
                <Btn variant="garden" disabled={!exact || busy} onClick={verify}><CheckCircle2 className="w-4.5 h-4.5" /> Verify & issue receipt</Btn>
              </>
            )}
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason, if rejecting (e.g. UTR not in statement)" className={inputCls()} />
            <Btn variant="danger" disabled={busy || !reason.trim()} onClick={reject}><XCircle className="w-4.5 h-4.5" /> Reject</Btn>
          </div>
        )}
      </Sheet>
    </>
  );
}

/* ---------- today's receipts ---------- */
function TodayList() {
  const { toast } = useSchool();
  const [rows, setRows] = useState(null);
  const [sum, setSum] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const today = todayKey();

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([fees.listPayments({ status: 'all', from: today, to: today, limit: 500 }), fees.collectionSummary(today, today)]);
      setRows(r.filter(p => p.status !== 'pending')); setSum(s);
    } catch (e) { toast(e.message, 'error'); setRows([]); }
  }, [today, toast]);
  useEffect(() => { load(); }, [load]);

  if (!rows) return <Card className="p-8 text-center text-[13px] text-ink-soft">Loading…</Card>;
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Card className="p-3.5"><p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">Collected today</p>
          <p className="text-lg font-extrabold font-mono text-garden-700 mt-0.5">{inr(sum?.total || 0)}</p></Card>
        <Card className="p-3.5"><p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">Cash in hand</p>
          <p className="text-lg font-extrabold font-mono text-ink-950 mt-0.5">{inr(sum?.by_mode?.cash || 0)}</p></Card>
      </div>
      {rows.length === 0 ? <Empty icon={BookOpen} title="No receipts today" /> : (
        <Card className="divide-y divide-ink-900/6">
          {rows.map(p => (
            <button key={p.id} onClick={async () => { tap(); setReceipt(await fees.getPayment(p.id)); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 active:bg-ink-50 text-left ${p.status === 'cancelled' ? 'opacity-55' : ''}`}>
              <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-bold text-ink-950 truncate">{p.student_name}</span>
                <span className="block text-[11.5px] text-ink-soft truncate">{p.receipt_no} · {modeLabel(p.mode)} · {(p.periods || []).map(x => monthLabel(x)).join(', ')}</span>
              </span>
              <span className={`text-[14px] font-extrabold font-mono ${p.status === 'cancelled' ? 'line-through' : ''}`}>{inr(p.amount)}</span>
            </button>
          ))}
        </Card>
      )}
      <ReceiptSheet receipt={receipt} onClose={() => setReceipt(null)} onChanged={load} />
    </>
  );
}
