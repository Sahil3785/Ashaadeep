import React, { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CreditCard, QrCode, Copy, Check, CheckCircle2, Printer, Download, ArrowLeft, ArrowRight,
  ShieldCheck, Info, Smartphone, IndianRupee, Clock, RotateCcw, AlertCircle, Search, CalendarCheck,
} from 'lucide-react';
import { SCHOOL, CLASS_LIST, FEE_STRUCTURE, FEE_NOTES } from '../data/school';
import { useSchool } from '../context/SchoolContext';
import { PageHeader, Reveal, Badge, SectionHeader } from '../components/UI';
import { Spinner } from '../components/Loaders';
import MonthGrid, { MonthLegend } from '../components/fees/MonthGrid';
import FeeReceipt from '../components/fees/FeeReceipt';
import { useCopy } from '../hooks';
import { fees, monthCards, ledgerTotals, monthLabel, todayKey } from '../lib/fees';
import { inr, upiLink, isPhone, nonEmpty, numeric, NAME_INPUT } from '../utils/format';
import { elementToPdf, celebrate } from '../utils/pdf';

const OTHER_CATEGORIES = [
  'Monthly tuition fee', 'Examination fee', 'Bus transport charges', 'Admission / registration fee', 'Other',
];

/* ============================================================
   Fee payment for parents.

     1. Find   — roll number, class and the child's first name
     2. Months — which months are paid, which are due; tick some
     3. Pay    — UPI QR for the exact amount, then the UTR number
     4. Done   — an acknowledgement, pending the office's check

   The parent's word clears nothing: the payment waits until the
   office finds the UTR in the bank statement and verifies it,
   which is when the months turn green and a receipt is issued.
   ============================================================ */
export default function Fees() {
  const { toast } = useSchool();
  const [params] = useSearchParams();

  const [step, setStep] = useState(1);
  const [who, setWho] = useState({ name: params.get('name') || '', roll: params.get('roll') || '', cls: params.get('cls') || '10TH', phone: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [statement, setStatement] = useState(null);   // { status, student, lines, awaiting }
  const [picked, setPicked] = useState([]);
  const [custom, setCustom] = useState({ amount: '', category: OTHER_CATEGORIES[0] });
  const [utr, setUtr] = useState('');
  const [done, setDone] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [copied, copy] = useCopy();

  const set = (k) => (e) => { setWho(f => ({ ...f, [k]: e.target.value })); setErrors(x => ({ ...x, [k]: undefined })); };

  const cards = useMemo(() => (statement?.status === 'success'
    ? monthCards(statement.lines, null, { awaiting: statement.awaiting || [] }) : []), [statement]);
  const totals = useMemo(() => ledgerTotals(statement?.lines), [statement]);
  const ledgerMode = statement?.status === 'success';
  const amount = ledgerMode
    ? Math.round(cards.filter(c => picked.includes(c.period)).reduce((a, c) => a + c.balance, 0) * 100) / 100
    : Number(custom.amount) || 0;

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  /* 1 → 2: look the child up */
  const find = async (e) => {
    e?.preventDefault();
    const next = {};
    if (!nonEmpty(who.name)) next.name = "Enter the student's first name.";
    if (!nonEmpty(who.roll)) next.roll = 'Enter the roll number.';
    if (who.phone && !isPhone(who.phone)) next.phone = 'Enter a valid 10-digit mobile number.';
    if (Object.keys(next).length) { setErrors(next); return; }
    setBusy(true);
    try {
      const res = await fees.statement(who.roll, who.cls, who.name);
      setStatement(res);
      if (res.status === 'success') {
        const c = monthCards(res.lines, null, { awaiting: res.awaiting || [] });
        setPicked(c.filter(x => x.balance > 0 && !x.awaiting && ['overdue', 'due', 'partial'].includes(x.status)).map(x => x.period));
      }
      setStep(2);
      scrollTop();
    } catch (err) {
      toast(err.message, 'error', 'Could not look up');
    } finally { setBusy(false); }
  };

  // Arriving from a withheld marksheet: details are already in the link.
  useEffect(() => {
    if (params.get('roll') && params.get('name')) find();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (period) => setPicked(p => (p.includes(period) ? p.filter(x => x !== period) : [...p, period]));

  /* 2 → 3 */
  const toPay = () => {
    if (!(amount >= 1)) return toast(ledgerMode ? 'Tick at least one month to pay.' : 'Enter the amount to pay.', 'error', 'Nothing to pay');
    if (amount > 200000) return toast('For amounts above ₹2,00,000 please pay at the school office.', 'error', 'Amount too large');
    setStep(3); scrollTop();
  };

  const note = `Fee ${who.cls} R${who.roll} ${ledgerMode ? picked.map(p => monthLabel(p)).join(' ') : ''}`.slice(0, 60);
  const upi = upiLink({ upiId: SCHOOL.upiId, payeeName: SCHOOL.payeeName, amount, note });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=4&data=${encodeURIComponent(upi)}`;

  /* 3 → 4: report the payment */
  const submit = async (e) => {
    e.preventDefault();
    const ref = utr.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z0-9]{6,30}$/.test(ref)) {
      setErrors({ utr: 'Enter the 12-digit UPI reference / UTR number from your payment app.' });
      return;
    }
    setBusy(true);
    try {
      const periods = ledgerMode ? [...picked].sort() : [];
      const res = await fees.submitOnline({
        roll: who.roll, cls: who.cls, name: who.name, periods, amount, utr: ref, phone: who.phone,
        category: ledgerMode ? 'School fee' : custom.category,
      });
      setDone({
        payment: {
          receipt_no: res.reference, txn_ref: res.reference, status: 'pending', amount, mode: 'upi', utr: ref,
          student_name: statement?.student?.name || who.name.toUpperCase(), class: statement?.student?.class || who.cls,
          roll_no: statement?.student?.roll_no || who.roll, paid_on: todayKey(), periods,
          category: ledgerMode ? 'School fee' : custom.category, session: statement?.session || SCHOOL.session,
        },
        items: ledgerMode ? cards.filter(c => periods.includes(c.period)).flatMap(c =>
          c.lines.filter(l => l.balance > 0).map(l => ({ period: c.period, head_name: l.head_name, amount: l.balance }))) : [],
        matched: res.matched,
      });
      setStep(4); scrollTop(); celebrate();
    } catch (err) {
      toast(err.message, 'error', 'Not submitted');
    } finally { setBusy(false); }
  };

  const download = async () => {
    setExporting(true);
    try { await elementToPdf('fee-receipt', `FeePayment_${done.payment.receipt_no}`); }
    catch (err) { toast(err.message || 'The PDF could not be generated. Try printing instead.', 'error', 'Export failed'); }
    finally { setExporting(false); }
  };

  const startOver = () => {
    setStep(1); setStatement(null); setPicked([]); setUtr(''); setDone(null); setErrors({});
    setCustom({ amount: '', category: OTHER_CATEGORIES[0] });
    scrollTop();
  };

  return (
    <>
      <PageHeader icon={CreditCard} eyebrow="Fee payment" title="Pay the school fee online"
        lead="See exactly which months are paid and which are due, pay by UPI for the months you choose, and get an acknowledgement at once. No transaction charge is added.">
        <div className="flex flex-wrap gap-2">
          <Badge tone="garden" icon={ShieldCheck}>Zero surcharge</Badge>
          <Badge tone="brass" icon={CalendarCheck}>Month-wise</Badge>
          <Badge tone="ink" icon={Clock}>Verified within a working day</Badge>
        </div>
      </PageHeader>

      <div className="max-w-3xl mx-auto px-4 pb-10"><Stepper step={step} /></div>

      <div className="max-w-3xl mx-auto px-4 pb-16">
        {/* ================= 1 — FIND ================= */}
        {step === 1 && (
          <Reveal>
            <form onSubmit={find} className="panel p-6 sm:p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="fname" className="field-label">Student's first name <span className="text-rose-500">*</span></label>
                  <input id="fname" value={who.name} onChange={set('name')} {...NAME_INPUT} placeholder="e.g. AMAN"
                         className={`field uppercase ${errors.name ? 'field-error' : ''}`} />
                  {errors.name ? <FieldError>{errors.name}</FieldError>
                    : <p className="text-[11px] text-ink-faint mt-1.5">As written in the school register. The full name works too.</p>}
                </div>
                <div>
                  <label htmlFor="froll" className="field-label">Roll number <span className="text-rose-500">*</span></label>
                  <input id="froll" value={who.roll} onChange={numeric(set('roll'))} inputMode="numeric" autoComplete="off"
                         placeholder="e.g. 3" className={`field ${errors.roll ? 'field-error' : ''}`} />
                  {errors.roll && <FieldError>{errors.roll}</FieldError>}
                </div>
                <div>
                  <label htmlFor="fcls" className="field-label">Class <span className="text-rose-500">*</span></label>
                  <select id="fcls" value={who.cls} onChange={set('cls')} className="field font-semibold">
                    {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="fphone" className="field-label">Your mobile number <span className="text-ink-faint font-normal">(optional)</span></label>
                  <input id="fphone" value={who.phone} onChange={numeric(set('phone'))} inputMode="tel" maxLength={10}
                         placeholder="e.g. 9812045678" className={`field ${errors.phone ? 'field-error' : ''}`} />
                  {errors.phone ? <FieldError>{errors.phone}</FieldError>
                    : <p className="text-[11px] text-ink-faint mt-1.5">So the office can call you if anything does not match.</p>}
                </div>
              </div>
              <button type="submit" disabled={busy} className="btn-ink w-full">
                {busy ? <><Spinner className="w-4 h-4" /> Looking up…</> : <><Search className="w-4 h-4" /> Show fee details</>}
              </button>
            </form>
          </Reveal>
        )}

        {/* ================= 2 — MONTHS ================= */}
        {step === 2 && statement && (
          <Reveal>
            <div className="panel p-6 sm:p-8 space-y-5">
              {ledgerMode ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">Session {statement.session} · Class {statement.student.class}-{statement.student.section} · Roll {statement.student.roll_no}</p>
                      <h2 className="font-display text-xl font-extrabold text-ink-950">{statement.student.name}</h2>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] font-bold text-ink-faint uppercase">Overdue now</p>
                      <p className={`font-display text-xl font-extrabold font-mono ${totals.overdue > 0 ? 'text-rose-600' : 'text-garden-700'}`}>{inr(totals.overdue)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[12.5px] font-bold text-ink-700 mb-2.5">Tick the months you want to pay</p>
                    <MonthGrid cards={cards} selected={picked} onToggle={toggle} selectable />
                    <div className="mt-3"><MonthLegend /></div>
                    {cards.some(c => c.awaiting) && (
                      <p className="text-[12px] text-sky-700 font-semibold mt-2.5">
                        Months marked “Checking” already have a payment from you that the office is verifying — no need to pay them again.
                      </p>
                    )}
                  </div>

                  {picked.length === 0 && totals.overdue <= 0 && (
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-garden-50 border border-garden-200">
                      <CheckCircle2 className="w-4.5 h-4.5 text-garden-600 shrink-0 mt-0.5" />
                      <p className="text-[12.5px] text-ink-700">Nothing is due right now. To pay ahead, tick the upcoming months.</p>
                    </div>
                  )}

                  {picked.length > 0 && (
                    <div className="rounded-2xl border border-ink-900/8 divide-y divide-ink-900/6 overflow-hidden">
                      {cards.filter(c => picked.includes(c.period)).map(c => (
                        <div key={c.period} className="flex justify-between px-4 py-2.5 text-[13px] bg-white">
                          <span><strong className="text-ink-950">{monthLabel(c.period, true)}</strong>
                            <span className="text-ink-faint"> · {c.lines.filter(l => l.balance > 0).map(l => l.head_name).join(', ')}</span></span>
                          <span className="font-mono font-bold">{inr(c.balance)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className={`flex items-start gap-3 p-4 rounded-2xl border ${statement.status === 'not_found' ? 'bg-brass-50 border-brass-200' : 'bg-ink-50 border-ink-200'}`}>
                    {statement.status === 'not_found'
                      ? <AlertCircle className="w-5 h-5 text-brass-600 shrink-0" />
                      : <Info className="w-5 h-5 text-ink-400 shrink-0" />}
                    <p className="text-[13px] text-ink-700 leading-relaxed">
                      {statement.status === 'not_found'
                        ? <>We could not find a student with roll {who.roll} in Class {who.cls} named “{who.name.toUpperCase()}”. Check the details, or pay
                            an amount the office told you — they will match it by hand.</>
                        : <>Month-wise fees for {statement.student?.name} are not online yet. Pay the amount the office told you; it will be added to the record.</>}
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="field-label" htmlFor="camt">Amount (₹) <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brass-600 pointer-events-none" />
                        <input id="camt" value={custom.amount} inputMode="numeric" autoComplete="off"
                               onChange={numeric(e => setCustom(c => ({ ...c, amount: e.target.value })))}
                               className="field pl-10 text-lg font-extrabold" />
                      </div>
                    </div>
                    <div>
                      <label className="field-label" htmlFor="ccat">Paying towards</label>
                      <select id="ccat" value={custom.category} onChange={e => setCustom(c => ({ ...c, category: e.target.value }))} className="field font-semibold">
                        {OTHER_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button onClick={() => setStep(1)} className="btn-ghost sm:w-40"><ArrowLeft className="w-4 h-4" /> Back</button>
                <button onClick={toPay} disabled={!(amount >= 1)} className="btn-garden flex-1">
                  <QrCode className="w-4 h-4" /> Pay {inr(amount)} by UPI <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Reveal>
        )}

        {/* ================= 3 — PAY ================= */}
        {step === 3 && (
          <Reveal dir="zoom">
            <div className="panel-brass p-6 sm:p-9">
              <div className="relative text-center">
                <Badge tone="garden" icon={Smartphone}>Scan with any UPI app</Badge>
                <h2 className="font-display text-2xl font-extrabold text-ink-950 mt-3">Pay {inr(amount)}</h2>
                <p className="text-xs text-ink-soft mt-1.5">Google Pay · PhonePe · Paytm · BHIM · any bank UPI app</p>

                <div className="inline-block mt-6 p-4 bg-white rounded-3xl shadow-float border-2 border-garden-400">
                  <img src={qrUrl} alt={`UPI QR code to pay ${inr(amount)} to ${SCHOOL.name}`} width="220" height="220" className="w-52 h-52 mx-auto block" />
                  <p className="text-[10px] font-bold text-ink-faint mt-2 uppercase tracking-wider">Check the name shows “{SCHOOL.payeeName}”</p>
                </div>

                <div className="mt-3.5 flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-ink-950">
                  <div className="text-left min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">School UPI ID</p>
                    <p className="font-mono text-sm font-extrabold text-brass-300 truncate">{SCHOOL.upiId}</p>
                  </div>
                  <button onClick={() => { copy(SCHOOL.upiId); toast('UPI ID copied.', 'success'); }}
                          className="shrink-0 px-3 py-2 rounded-xl bg-white/10 text-white text-[11px] font-bold inline-flex items-center gap-1.5 hover:bg-white/20">
                    {copied ? <><Check className="w-3.5 h-3.5 text-garden-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <a href={upi} className="btn-ghost w-full mt-3.5 sm:hidden"><Smartphone className="w-4 h-4" /> Open a UPI app on this phone</a>

                <form onSubmit={submit} className="mt-6 text-left rounded-3xl bg-white border border-ink-900/8 p-5 shadow-soft">
                  <label htmlFor="utr" className="field-label">After paying, enter the UPI reference / UTR number <span className="text-rose-500">*</span></label>
                  <input id="utr" value={utr} onChange={e => { setUtr(e.target.value); setErrors({}); }} autoComplete="off" autoCapitalize="characters"
                         placeholder="e.g. 429815637284" className={`field font-mono text-lg tracking-wider ${errors.utr ? 'field-error' : ''}`} />
                  {errors.utr ? <FieldError>{errors.utr}</FieldError>
                    : <p className="text-[11px] text-ink-faint mt-1.5">Shown on the success screen of your UPI app, usually 12 digits.</p>}
                  <button type="submit" disabled={busy} className="btn-garden w-full mt-4">
                    {busy ? <><Spinner className="w-4 h-4" /> Sending…</> : <><CheckCircle2 className="w-4 h-4" /> I have paid — send to the office</>}
                  </button>
                </form>

                <button onClick={() => setStep(2)} className="mt-4 text-xs font-bold text-ink-soft hover:text-ink-950 inline-flex items-center gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" /> Change the months
                </button>
              </div>
            </div>
          </Reveal>
        )}

        {/* ================= 4 — DONE ================= */}
        {step === 4 && done && (
          <div className="space-y-5">
            <Reveal dir="zoom">
              <div className="panel p-7 text-center no-print">
                <div className="w-16 h-16 mx-auto rounded-full bg-garden-100 border-2 border-garden-400 flex items-center justify-center mb-4 animate-pop-in">
                  <CheckCircle2 className="w-9 h-9 text-garden-600" strokeWidth={2.4} />
                </div>
                <Badge tone="brass">Waiting for the office to verify</Badge>
                <h2 className="font-display text-2xl font-extrabold text-ink-950 mt-3">{inr(done.payment.amount)} reported</h2>
                <p className="text-xs text-ink-soft mt-2 max-w-md mx-auto leading-relaxed">
                  Reference <strong className="font-mono text-ink-950">{done.payment.receipt_no}</strong>. The office will match
                  UTR {done.payment.utr} with the bank statement, usually within one working day. The months then show as paid
                  and the official receipt is issued{done.matched ? '' : ' — as the details did not match the register exactly, they may call you first'}.
                </p>
                <div className="flex flex-wrap justify-center gap-2.5 mt-6">
                  <button onClick={() => window.print()} className="btn-ghost text-xs"><Printer className="w-4 h-4" /> Print</button>
                  <button onClick={download} disabled={exporting} className="btn-ink text-xs">
                    {exporting ? <><Spinner className="w-4 h-4" /> Building PDF…</> : <><Download className="w-4 h-4" /> Save acknowledgement</>}
                  </button>
                  <Link to="/results" className="btn-primary text-xs">Results <ArrowRight className="w-3.5 h-3.5" /></Link>
                </div>
              </div>
            </Reveal>
            <div className="print-area"><FeeReceipt payment={done.payment} items={done.items} /></div>
            <div className="text-center no-print">
              <button onClick={startOver} className="btn-ghost text-xs"><RotateCcw className="w-3.5 h-3.5" /> Pay for another child</button>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Fee structure ---------- */}
      {step === 1 && (
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <SectionHeader eyebrow="Fee structure" icon={IndianRupee} title={`Published fees for session ${SCHOOL.session}`}
                         lead="Tuition charges by class group. Transport is billed separately by route." />
          <Reveal>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-ink-950 text-white text-left">
                      {['Class group', 'Admission', 'Monthly', 'Quarterly', 'Annual', 'Exam fee'].map((h, i) => (
                        <th key={h} className={`p-3.5 font-bold text-xs uppercase tracking-wider ${i ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-900/6">
                    {FEE_STRUCTURE.map((f, i) => (
                      <tr key={f.group} className={`${i % 2 ? 'bg-parchment-100/60' : 'bg-white'} hover:bg-brass-50/60 transition-colors`}>
                        <td className="p-3.5 font-bold text-ink-950">{f.group}</td>
                        <td className="p-3.5 text-right font-mono text-ink-700">{inr(f.admission)}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-ink-950">{inr(f.monthly)}</td>
                        <td className="p-3.5 text-right font-mono text-ink-700">{inr(f.quarterly)}</td>
                        <td className="p-3.5 text-right font-mono text-ink-700">{inr(f.annual)}</td>
                        <td className="p-3.5 text-right font-mono text-ink-700">{inr(f.exam)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
          <Reveal>
            <div className="card p-6 mt-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-faint mb-3.5">Please note</p>
              <ul className="space-y-2.5">
                {FEE_NOTES.map(n => (
                  <li key={n} className="flex gap-2.5 text-[13px] text-ink-soft leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-garden-500 shrink-0 mt-0.5" /> {n}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>
      )}
    </>
  );
}

function Stepper({ step }) {
  const steps = ['Student', 'Months', 'Pay', 'Done'];
  return (
    <div className="flex items-center">
      {steps.map((label, i) => {
        const n = i + 1, isDone = step > n, active = step === n;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-extrabold transition-all duration-400 ${
                isDone ? 'bg-garden-500 text-white shadow-lift' : active ? 'bg-ink-950 text-brass-300 shadow-lift scale-110' : 'bg-white text-ink-300 border border-ink-900/10'}`}>
                {isDone ? <Check className="w-5 h-5" strokeWidth={3} /> : n}
              </div>
              <span className={`text-[11px] font-bold whitespace-nowrap ${active ? 'text-ink-950' : 'text-ink-faint'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-1 mx-2 mb-6 rounded-full bg-ink-900/8 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-garden-400 to-garden-600 transition-all duration-600 ease-out"
                     style={{ width: isDone ? '100%' : '0%' }} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function FieldError({ children }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 mt-1.5">
      <AlertCircle className="w-3 h-3 shrink-0" /> {children}
    </p>
  );
}

