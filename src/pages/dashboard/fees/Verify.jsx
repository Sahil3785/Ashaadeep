import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, Smartphone, UserSearch } from 'lucide-react';
import { useSchool } from '../../../context/SchoolContext';
import { fees, monthCards, allocate, monthLabel } from '../../../lib/fees';
import { Badge, Modal } from '../../../components/UI';
import { Spinner, EmptyState, SkTable } from '../../../components/Loaders';
import MonthGrid from '../../../components/fees/MonthGrid';
import { inr, dateTime } from '../../../utils/format';
import { useLoad, LoadError, StudentSearch, ReasonModal, ReceiptModal } from './shared';

/* ============================================================
   VERIFY — payments parents reported on the website. Nothing is
   cleared until someone here finds the money in the bank / UPI
   statement and confirms which months it pays.
   ============================================================ */
export default function Verify({ onCount, onChanged }) {
  const { toast, students } = useSchool();
  const { data, error, loading, reload } = useLoad(() => fees.listPayments({ status: 'pending', limit: 300 }), []);
  const [verifying, setVerifying] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [receiptId, setReceiptId] = useState(null);

  useEffect(() => { if (data) onCount?.(data.length); }, [data, onCount]);

  const matchFor = (p) =>
    students.find(s => s.student_id === p.claimed_student_id) ||
    students.find(s => s.class === p.class && String(s.roll_no) === String(p.roll_no));

  const reject = async (reason) => {
    try {
      await fees.reject(rejecting.id, reason);
      toast(`The claim from ${rejecting.student_name} was rejected.`, 'info', 'Rejected');
      setRejecting(null);
      reload();
      onChanged?.();
    } catch (e) { toast(e.message, 'error', 'Not rejected'); }
  };

  return (
    <div className="panel p-5 sm:p-7">
      <div className="flex items-start gap-3 mb-5">
        <ShieldCheck className="w-5 h-5 text-brass-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-display text-lg font-extrabold text-ink-950">Online payments to verify</h3>
          <p className="text-[13px] text-ink-soft mt-1 max-w-2xl">
            Find each UTR number in the school's bank or UPI statement. If the money is there, verify it — the
            months are marked paid and a receipt is issued. If it is not, reject it with a reason.
          </p>
        </div>
      </div>

      {error ? <LoadError message={error} onRetry={reload} /> :
       loading && !data ? <SkTable rows={4} cols={5} /> :
       data.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nothing waiting">Every payment reported online has been checked.</EmptyState>
      ) : (
        <div className="space-y-2.5">
          {data.map(p => {
            const m = matchFor(p);
            return (
              <div key={p.id} className="rounded-2xl border border-ink-900/8 bg-white p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-extrabold text-ink-950">{p.student_name}</p>
                    <span className="text-[11.5px] text-ink-faint">Class {p.class} · Roll {p.roll_no}</span>
                    {m ? <Badge tone="garden">On register</Badge> : <Badge tone="rose">No match</Badge>}
                  </div>
                  <p className="text-[12px] text-ink-soft mt-1">
                    <Smartphone className="w-3 h-3 inline -mt-0.5" /> UTR <strong className="font-mono text-ink-950">{p.utr || '—'}</strong>
                    {' · '}{dateTime(p.paid_at)}{p.contact ? ` · ${p.contact}` : ''}
                  </p>
                  {p.periods?.length > 0 && (
                    <p className="text-[12px] text-ink-700 mt-1">For: {p.periods.map(x => monthLabel(x)).join(', ')}</p>
                  )}
                </div>
                <p className="font-display text-xl font-extrabold font-mono text-ink-950 shrink-0">{inr(p.amount)}</p>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setVerifying({ payment: p, student: m || null })} className="btn-garden text-xs py-2">
                    <CheckCircle2 className="w-4 h-4" /> Verify
                  </button>
                  <button onClick={() => setRejecting(p)} className="btn-danger text-xs py-2">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <VerifyModal job={verifying} onClose={() => setVerifying(null)}
                   onDone={(paymentId) => { setVerifying(null); reload(); setReceiptId(paymentId); }} />
      <ReasonModal open={!!rejecting} onClose={() => setRejecting(null)} onConfirm={reject}
                   title="Reject this payment?" confirmLabel="Reject"
                   lead="Use this when the money is not in the bank statement. The parent's claim stays on record."
                   presets={['UTR not found in bank statement', 'Amount does not match statement', 'Duplicate of an earlier payment', 'Wrong student details']} />
      <ReceiptModal paymentId={receiptId} onClose={() => setReceiptId(null)} />
    </div>
  );
}

function VerifyModal({ job, onClose, onDone }) {
  const { toast, afterFeeChange } = useSchool();
  const [student, setStudent] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const p = job?.payment;

  useEffect(() => { setStudent(job?.student || null); setLedger(null); }, [job]);

  useEffect(() => {
    if (!student) return;
    let alive = true;
    fees.getLedger(student.student_id).then(l => {
      if (!alive) return;
      setLedger(l);
      // Start from the months the parent named, then let the money flow on
      // into the oldest open months if it covers more.
      const cards = monthCards(l.lines, l.session);
      const open = cards.filter(c => c.balance > 0).map(c => c.period);
      let chosen = open.filter(x => (p.periods || []).includes(x));
      let plan = allocate(cards, chosen, p.amount);
      for (const extra of open) {
        if (plan.unallocated <= 0) break;
        if (chosen.includes(extra)) continue;
        chosen = [...chosen, extra];
        plan = allocate(cards, chosen, p.amount);
      }
      setPicked(chosen);
    }, e => toast(e.message, 'error', 'Ledger'));
    return () => { alive = false; };
  }, [student]); // eslint-disable-line react-hooks/exhaustive-deps

  const cards = useMemo(() => (ledger ? monthCards(ledger.lines, ledger.session) : []), [ledger]);
  const plan = useMemo(() => (p ? allocate(cards, picked, p.amount) : null), [cards, picked, p]);
  const exact = plan && plan.unallocated <= 0.009 && plan.total > 0;

  const toggle = (period) => setPicked(x => (x.includes(period) ? x.filter(y => y !== period) : [...x, period]));

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await fees.verify(p.id, student.student_id, plan.lines);
      toast(`${inr(res.amount)} confirmed for ${student.name}. Receipt ${res.receipt_no}.`, 'success', 'Payment verified');
      afterFeeChange(student.student_id);
      onDone(p.id);
    } catch (e) { toast(e.message, 'error', 'Not verified'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={!!job} onClose={onClose} icon={ShieldCheck} size="xl" title="Verify online payment"
           subtitle={p ? `${inr(p.amount)} · UTR ${p.utr || '—'} · reported by ${p.student_name}, Class ${p.class}, Roll ${p.roll_no}` : ''}>
      {p && (!student ? (
        <div>
          <p className="text-[13px] text-ink-700 mb-3 flex items-center gap-2"><UserSearch className="w-4 h-4" /> No student on the register matches what the parent typed. Find the right one:</p>
          <StudentSearch onPick={setStudent} autoFocus />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-ink-50 border border-ink-900/8">
            <div>
              <p className="text-[14px] font-extrabold text-ink-950">{student.name}</p>
              <p className="text-[12px] text-ink-soft">Class {student.class}-{student.section || 'A'} · Roll {student.roll_no}{student.father_name ? ` · ${student.father_name}` : ''}</p>
            </div>
            <button onClick={() => setStudent(null)} className="btn-ghost text-xs py-1.5">Wrong student?</button>
          </div>

          {!ledger ? <div className="py-8 flex justify-center"><Spinner /></div> : (
            <>
              <p className="text-[12px] font-bold text-ink-700">Months this payment covers (tap to change):</p>
              <MonthGrid cards={cards} selected={picked} onToggle={toggle} selectable size="sm" />

              <div className="rounded-2xl border border-ink-900/8 divide-y divide-ink-900/6">
                {plan.lines.map(l => (
                  <div key={l.due_id} className="flex justify-between px-3.5 py-2 text-[12.5px]">
                    <span><strong className="text-ink-950">{monthLabel(l.period)}</strong> · {l.head}</span>
                    <span className="font-mono font-bold">{inr(l.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-3.5 py-2.5 bg-ink-50 text-[13px] font-extrabold">
                  <span>Allocated</span><span className="font-mono">{inr(plan.total)} of {inr(p.amount)}</span>
                </div>
              </div>

              {!exact && (
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-brass-50 border border-brass-200 text-[12.5px] text-ink-700">
                  <AlertCircle className="w-4 h-4 text-brass-600 shrink-0 mt-0.5" />
                  {plan.unallocated > 0
                    ? `${inr(plan.unallocated)} is not matched to any month. Tick more months — or, if the student owes nothing more, reject this and refund the difference at the office.`
                    : 'Tick the months this payment is for.'}
                </div>
              )}

              <button onClick={confirm} disabled={!exact || busy} className="btn-garden w-full">
                {busy ? <Spinner className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />} Money is in the statement — verify & issue receipt
              </button>
            </>
          )}
        </div>
      ))}
    </Modal>
  );
}
