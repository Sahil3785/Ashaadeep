import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard, QrCode, Copy, Check, CheckCircle2, Printer, Download, ArrowLeft,
  ArrowRight, ShieldCheck, Info, Smartphone, Receipt, IndianRupee, Clock, RotateCcw, AlertCircle,
} from 'lucide-react';
import { SCHOOL, CLASS_LIST, FEE_STRUCTURE, FEE_NOTES } from '../data/school';
import { useSchool } from '../context/SchoolContext';
import { isConfigured } from '../lib/api';
import { PageHeader, Reveal, Badge, SectionHeader } from '../components/UI';
import { Spinner } from '../components/Loaders';
import { useCopy } from '../hooks';
import { inr, dateTime, upiLink, makeTxnId, isPhone, nonEmpty } from '../utils/format';
import { elementToPdf, celebrate } from '../utils/pdf';

const FEE_CATEGORIES = [
  'Monthly tuition fee',
  'Quarterly composite fee',
  'Examination & sports fund',
  'Annual settlement',
  'Bus transport charges',
  'Admission / registration fee',
];

const PRESETS = [
  { label: 'Monthly', amount: 1800, note: 'Class 9–10 tuition' },
  { label: 'Quarterly', amount: 5400, note: 'Three months' },
  { label: 'Half-yearly', amount: 10800, note: 'Six months' },
  { label: 'Annual', amount: 21600, note: 'Full session' },
];

export default function Fees() {
  const { recordPayment, toast, students } = useSchool();

  const [step, setStep] = useState(1);          // 1 details → 2 scan → 3 receipt
  const [form, setForm] = useState({ name: '', roll: '', cls: '10TH', phone: '', category: FEE_CATEGORIES[1], amount: '5400' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [txn, setTxn] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [copied, copy] = useCopy();

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(err => ({ ...err, [k]: undefined }));
  };

  /* Look the student up so we can show their dues while typing.

     This only works in offline demo mode. Once the school database is
     connected the students table is deliberately NOT readable by the
     public — otherwise anyone could pull every child's name, parents and
     phone number straight out of this page. Parents then simply enter the
     amount the school told them, which is what they do at the counter. */
  const matched = useMemo(() => {
    if (isConfigured) return null;
    return students.find(s =>
      String(s.roll_no) === form.roll.trim() && s.class.toUpperCase() === form.cls.toUpperCase()
    );
  }, [students, form.roll, form.cls]);

  /* -------- Step 1 → 2 : validate, then show the QR -------- */
  const toQr = (e) => {
    e.preventDefault();
    const next = {};
    if (!nonEmpty(form.name)) next.name = "Enter the student's full name.";
    if (!nonEmpty(form.roll)) next.roll = 'Enter the roll number.';
    if (form.phone && !isPhone(form.phone)) next.phone = 'Enter a valid 10-digit Indian mobile number.';
    const amt = Number(form.amount);
    if (!amt || amt < 1) next.amount = 'Enter the amount you want to pay.';
    else if (amt > 100000) next.amount = 'For amounts above ₹1,00,000 please pay at the office counter.';

    if (Object.keys(next).length) {
      setErrors(next);
      toast('Please correct the highlighted fields.', 'error', 'Check the form');
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* -------- Step 2 → 3 : confirm payment, issue receipt -------- */
  const confirm = async () => {
    setBusy(true);
    // Stand-in for the payment-gateway callback a live build would wait on.
    await new Promise(r => setTimeout(r, 1100));
    const id = makeTxnId();
    setTxn({ id, at: new Date().toISOString(), ...form, amount: Number(form.amount) });
    recordPayment({ txn: id, ...form, amount: Number(form.amount) });
    setBusy(false);
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    celebrate();
    toast('Payment recorded and the fee ledger has been updated.', 'success', 'Payment successful');
  };

  const download = async () => {
    setExporting(true);
    try {
      await elementToPdf('receipt', `FeeReceipt_${txn.id}`);
      toast('The receipt PDF has been saved to your downloads.', 'success', 'Download complete');
    } catch (err) {
      toast(err.message || 'The PDF could not be generated. Try printing instead.', 'error', 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const startOver = () => {
    setStep(1); setTxn(null); setErrors({});
    setForm({ name: '', roll: '', cls: '10TH', phone: '', category: FEE_CATEGORIES[1], amount: '5400' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=4&data=${encodeURIComponent(
    upiLink({ upiId: SCHOOL.upiId, payeeName: SCHOOL.payeeName, amount: form.amount, note: `Fee Roll${form.roll} ${form.cls}` })
  )}`;

  return (
    <>
      <PageHeader
        icon={CreditCard}
        eyebrow="Fee payment"
        title="Pay the school fee online"
        lead="Generate a UPI QR code for the exact amount, pay from any UPI app, and the portal issues a digital receipt immediately. No transaction charge is added."
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="garden" icon={ShieldCheck}>Zero surcharge</Badge>
          <Badge tone="brass" icon={Receipt}>Instant receipt</Badge>
          <Badge tone="ink" icon={Clock}>Ledger updated at once</Badge>
        </div>
      </PageHeader>

      <div className="max-w-3xl mx-auto px-4 pb-10">
        <Stepper step={step} />
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16">

        {/* ================= STEP 1 — DETAILS ================= */}
        {step === 1 && (
          <Reveal>
            <form onSubmit={toQr} className="panel p-6 sm:p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="fname" className="field-label">Student's full name <span className="text-rose-500">*</span></label>
                  <input id="fname" value={form.name}
                         onChange={e => { setForm(f => ({ ...f, name: e.target.value.toUpperCase() })); setErrors(x => ({ ...x, name: undefined })); }}
                         placeholder="e.g. AMAN VERMA"
                         className={`field uppercase ${errors.name ? 'field-error' : ''}`} />
                  {errors.name && <FieldError>{errors.name}</FieldError>}
                </div>

                <div>
                  <label htmlFor="froll" className="field-label">Roll number <span className="text-rose-500">*</span></label>
                  <input id="froll" value={form.roll} onChange={set('roll')} inputMode="numeric"
                         placeholder="e.g. 3" className={`field ${errors.roll ? 'field-error' : ''}`} />
                  {errors.roll && <FieldError>{errors.roll}</FieldError>}
                </div>

                <div>
                  <label htmlFor="fcls" className="field-label">Class <span className="text-rose-500">*</span></label>
                  <select id="fcls" value={form.cls} onChange={set('cls')} className="field font-semibold">
                    {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="fphone" className="field-label">Mobile number <span className="text-ink-faint font-normal">(optional)</span></label>
                  <input id="fphone" value={form.phone} onChange={set('phone')} inputMode="tel"
                         placeholder="e.g. 9812045678" className={`field ${errors.phone ? 'field-error' : ''}`} />
                  {errors.phone ? <FieldError>{errors.phone}</FieldError>
                    : <p className="text-[11px] text-ink-faint mt-1.5">We send the receipt copy here if provided.</p>}
                </div>

                <div>
                  <label htmlFor="fcat" className="field-label">What is this payment for? <span className="text-rose-500">*</span></label>
                  <select id="fcat" value={form.category} onChange={set('category')} className="field font-semibold">
                    {FEE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* live dues lookup */}
              {!isConfigured && form.roll.trim() && (
                matched ? (
                  <div className={`flex items-start gap-3 p-3.5 rounded-2xl border ${
                    matched.fee_status === 'PAID'
                      ? 'bg-garden-50 border-garden-200'
                      : 'bg-brass-50 border-brass-200'
                  }`}>
                    {matched.fee_status === 'PAID'
                      ? <CheckCircle2 className="w-4.5 h-4.5 text-garden-600 shrink-0 mt-0.5" />
                      : <AlertCircle className="w-4.5 h-4.5 text-brass-600 shrink-0 mt-0.5" />}
                    <p className="text-[12.5px] leading-relaxed">
                      <strong className="font-extrabold text-ink-950">{matched.name}</strong> found in the
                      Class {matched.class}-{matched.section || 'A'} register.{' '}
                      {matched.fee_status === 'PAID'
                        ? 'The ledger currently shows no outstanding dues — you can still pay in advance for the next term.'
                        : 'The ledger shows an outstanding balance for this term.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-ink-50 border border-ink-200">
                    <Info className="w-4.5 h-4.5 text-ink-400 shrink-0 mt-0.5" />
                    <p className="text-[12.5px] text-ink-soft leading-relaxed">
                      No student with roll #{form.roll.trim()} in Class {form.cls} was found in the register.
                      You can still pay — just make sure the roll number and class are right so the office can match it.
                    </p>
                  </div>
                )
              )}

              {/* amount */}
              <div>
                <label htmlFor="famt" className="field-label">Amount to pay (INR) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brass-600 pointer-events-none" />
                  <input id="famt" type="number" min="1" value={form.amount} onChange={set('amount')}
                         className={`field pl-10 text-lg font-extrabold text-ink-950 ${errors.amount ? 'field-error' : ''}`} />
                </div>
                {errors.amount && <FieldError>{errors.amount}</FieldError>}

                <div className="flex flex-wrap gap-2 mt-3">
                  {PRESETS.map(p => (
                    <button key={p.label} type="button"
                            onClick={() => { setForm(f => ({ ...f, amount: String(p.amount) })); setErrors(x => ({ ...x, amount: undefined })); }}
                            className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all text-left ${
                              String(p.amount) === form.amount
                                ? 'bg-brass-400 text-ink-950 border-brass-500 shadow-brass'
                                : 'bg-white text-ink-700 border-ink-900/10 hover:border-brass-300'
                            }`}>
                      <span className="block">{p.label} · {inr(p.amount)}</span>
                      <span className="block opacity-70 font-semibold">{p.note}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-garden w-full">
                <QrCode className="w-4 h-4" /> Generate UPI QR for {inr(form.amount || 0)}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </Reveal>
        )}

        {/* ================= STEP 2 — SCAN ================= */}
        {step === 2 && (
          <Reveal dir="zoom">
            <div className="panel-brass p-6 sm:p-9">
              <div className="relative text-center">
                <Badge tone="garden" icon={Smartphone}>Scan with any UPI app</Badge>
                <h2 className="font-display text-2xl font-extrabold text-ink-950 mt-3">
                  Pay {inr(form.amount)}
                </h2>
                <p className="text-xs text-ink-soft mt-1.5">
                  Google Pay · PhonePe · Paytm · BHIM · any bank UPI app
                </p>

                {/* QR */}
                <div className="inline-block mt-6 p-4 bg-white rounded-3xl shadow-float border-2 border-garden-400">
                  <img src={qrUrl} alt={`UPI QR code to pay ${inr(form.amount)} to ${SCHOOL.name}`}
                       width="220" height="220" className="w-52 h-52 mx-auto block" />
                  <p className="text-[10px] font-bold text-ink-faint mt-2 uppercase tracking-wider">
                    Verify the name shows "{SCHOOL.payeeName}"
                  </p>
                </div>

                {/* payment summary */}
                <div className="mt-6 rounded-3xl bg-white border border-ink-900/8 divide-y divide-ink-900/6 text-left shadow-soft">
                  {[
                    ['Student', `${form.name} · Roll #${form.roll} · ${form.cls}`],
                    ['Towards', form.category],
                    ['Amount', inr(form.amount)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center gap-4 px-4 py-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{k}</span>
                      <span className="text-[13px] font-extrabold text-ink-950 text-right">{v}</span>
                    </div>
                  ))}
                </div>

                {/* UPI ID copy row */}
                <div className="mt-3.5 flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-ink-950">
                  <div className="text-left min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">School UPI ID</p>
                    <p className="font-mono text-sm font-extrabold text-brass-300 truncate">{SCHOOL.upiId}</p>
                  </div>
                  <button onClick={() => { copy(SCHOOL.upiId); toast('UPI ID copied to the clipboard.', 'success'); }}
                          className="shrink-0 px-3 py-2 rounded-xl bg-white/10 text-white text-[11px] font-bold inline-flex items-center gap-1.5 hover:bg-white/18 transition-colors">
                    {copied ? <><Check className="w-3.5 h-3.5 text-garden-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>

                {/* mobile deep link */}
                <a href={upiLink({ upiId: SCHOOL.upiId, payeeName: SCHOOL.payeeName, amount: form.amount, note: `Fee Roll${form.roll} ${form.cls}` })}
                   className="btn-ghost w-full mt-3.5 sm:hidden">
                  <Smartphone className="w-4 h-4" /> Open a UPI app on this phone
                </a>

                <button onClick={confirm} disabled={busy} className="btn-garden w-full mt-5">
                  {busy ? <><Spinner className="w-4 h-4" /> Verifying the payment…</>
                        : <><CheckCircle2 className="w-4 h-4" /> I have completed the payment</>}
                </button>

                <button onClick={() => setStep(1)} className="mt-3 text-xs font-bold text-ink-soft hover:text-ink-950 inline-flex items-center gap-1.5 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Change the details
                </button>

                <div className="flex gap-2.5 mt-5 p-3.5 rounded-2xl bg-white/70 border border-brass-200 text-left">
                  <Info className="w-4 h-4 text-brass-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-ink-soft leading-relaxed">
                    Press the confirm button only after your UPI app shows the payment as successful. This
                    demonstration portal has no live gateway attached, so the confirmation is simulated —
                    on the real deployment the bank's callback would confirm it automatically.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* ================= STEP 3 — RECEIPT ================= */}
        {step === 3 && txn && (
          <div className="space-y-5">
            <Reveal dir="zoom">
              <div className="panel p-7 text-center no-print">
                <div className="w-16 h-16 mx-auto rounded-full bg-garden-100 border-2 border-garden-400 flex items-center justify-center mb-4 animate-pop-in">
                  <CheckCircle2 className="w-9 h-9 text-garden-600" strokeWidth={2.4} />
                </div>
                <Badge tone="garden">Payment successful</Badge>
                <h2 className="font-display text-2xl font-extrabold text-ink-950 mt-3">
                  {inr(txn.amount)} received
                </h2>
                <p className="text-xs text-ink-soft mt-2 max-w-sm mx-auto leading-relaxed">
                  Reference <strong className="font-mono text-ink-950">{txn.id}</strong>. The fee ledger has been
                  updated, so any marksheet that was on hold is now available.
                </p>

                <div className="flex flex-wrap justify-center gap-2.5 mt-6">
                  <button onClick={() => window.print()} className="btn-ghost text-xs">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button onClick={download} disabled={exporting} className="btn-ink text-xs">
                    {exporting ? <><Spinner className="w-4 h-4" /> Building PDF…</>
                               : <><Download className="w-4 h-4" /> Download receipt</>}
                  </button>
                  <Link to="/results" className="btn-primary text-xs">
                    Check the result now <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </Reveal>

            <Receipt_ txn={txn} />

            <div className="text-center no-print">
              <button onClick={startOver} className="btn-ghost text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> Make another payment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Fee structure table ---------- */}
      {step === 1 && (
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <SectionHeader
            eyebrow="Fee structure" icon={IndianRupee}
            title={`Published fees for session ${SCHOOL.session}`}
            lead="Tuition charges by class group. Transport is billed separately by route."
          />

          <Reveal>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-ink-950 text-white text-left">
                      <th className="p-3.5 font-bold text-xs uppercase tracking-wider">Class group</th>
                      <th className="p-3.5 font-bold text-xs uppercase tracking-wider text-right">Admission</th>
                      <th className="p-3.5 font-bold text-xs uppercase tracking-wider text-right">Monthly</th>
                      <th className="p-3.5 font-bold text-xs uppercase tracking-wider text-right">Quarterly</th>
                      <th className="p-3.5 font-bold text-xs uppercase tracking-wider text-right">Annual</th>
                      <th className="p-3.5 font-bold text-xs uppercase tracking-wider text-right">Exam fee</th>
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
                    <CheckCircle2 className="w-4 h-4 text-garden-500 shrink-0 mt-0.5" />
                    {n}
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

/* ============================================================
   Stepper — the three-stage progress indicator.
   ============================================================ */
function Stepper({ step }) {
  const steps = [
    { n: 1, label: 'Student details' },
    { n: 2, label: 'Scan & pay' },
    { n: 3, label: 'Receipt' },
  ];
  return (
    <div className="flex items-center">
      {steps.map((s, i) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-extrabold transition-all duration-400 ${
                done ? 'bg-garden-500 text-white shadow-lift'
                     : active ? 'bg-ink-950 text-brass-300 shadow-lift scale-110'
                              : 'bg-white text-ink-300 border border-ink-900/10'
              }`}>
                {done ? <Check className="w-5 h-5" strokeWidth={3} /> : s.n}
              </div>
              <span className={`text-[11px] font-bold text-center whitespace-nowrap ${active ? 'text-ink-950' : 'text-ink-faint'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-1 mx-2 mb-6 rounded-full bg-ink-900/8 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-garden-400 to-garden-600 transition-all duration-600 ease-out"
                     style={{ width: step > s.n ? '100%' : '0%' }} />
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

/* ============================================================
   Receipt_ — the printable payment voucher.
   ============================================================ */
function Receipt_({ txn }) {
  return (
    <div id="receipt" className="document doc-watermark print-area relative rounded-3xl p-6 sm:p-9"
         style={{ border: '3px solid #18213c' }}>

      <div className="text-center pb-5 mb-5" style={{ borderBottom: '2px solid #18213c' }}>
        <h2 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-wide" style={{ color: '#18213c' }}>
          {SCHOOL.name}
        </h2>
        <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#4a5578' }}>{SCHOOL.address}</p>
        <p className="text-[10px] mt-0.5" style={{ color: '#8792b0' }}>
          School Code {SCHOOL.schoolCode} · {SCHOOL.phone} · {SCHOOL.email}
        </p>
        <div className="inline-block mt-3 px-4 py-1.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider"
             style={{ background: '#d4f7e3', color: '#0b4933', border: '1px solid #aceecb' }}>
          ✓ Payment received · Official fee receipt
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-5">
        {[
          ['Receipt number', txn.id, true],
          ['Date & time', dateTime(txn.at), false],
          ['Student name', txn.name, false],
          ['Class & roll', `${txn.cls} · Roll #${txn.roll}`, false],
          ['Paid towards', txn.category, false],
          ['Payment mode', `UPI · ${SCHOOL.upiId}`, true],
        ].map(([k, v, mono]) => (
          <div key={k}>
            <span className="block text-[9px] font-extrabold uppercase tracking-wider" style={{ color: '#8792b0' }}>{k}</span>
            <strong className={`block text-[12.5px] font-bold mt-0.5 ${mono ? 'font-mono' : ''}`} style={{ color: '#18213c' }}>
              {v}
            </strong>
          </div>
        ))}
      </div>

      {/* amount block */}
      <div className="flex items-center justify-between gap-4 p-5 rounded-xl"
           style={{ background: '#18213c' }}>
        <div>
          <p className="text-[9.5px] font-extrabold uppercase tracking-wider" style={{ color: '#9fb0d4' }}>Total amount received</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#cbd4e9' }}>Rupees only · no transaction charge applied</p>
        </div>
        <p className="font-display text-3xl font-extrabold font-mono shrink-0" style={{ color: '#fbb420' }}>
          {inr(txn.amount)}
        </p>
      </div>

      <div className="flex justify-between items-end gap-6 mt-8 pt-6" style={{ borderTop: '2px solid #d7dce8' }}>
        <div className="text-[10.5px]" style={{ color: '#4a5578' }}>
          <p style={{ color: '#18213c', fontWeight: 700 }}>Accounts Department</p>
          <p className="mt-0.5" style={{ color: '#8792b0' }}>
            Computer-generated receipt. Please retain it for your records — fees once paid are not refundable.
          </p>
        </div>
        <div className="text-center shrink-0">
          <div className="w-36 pt-1.5 text-[11px] font-extrabold"
               style={{ borderTop: '2px solid #18213c', color: '#18213c' }}>
            Accounts Officer
          </div>
        </div>
      </div>
    </div>
  );
}
