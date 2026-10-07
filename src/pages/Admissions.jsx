import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, CheckCircle2, FileText, Send, AlertCircle, Phone, Calendar,
  ClipboardList, UserPlus, ArrowRight, Info, IndianRupee, Clock, Sparkles,
} from 'lucide-react';
import { SCHOOL, FEE_STRUCTURE } from '../data/school';
import { useSchool } from '../context/SchoolContext';
import { PageHeader, Reveal, SectionHeader, Badge, IconTile, toneFor } from '../components/UI';
import { Spinner } from '../components/Loaders';
import { inr, isPhone, nonEmpty, isEmail } from '../utils/format';

const CLASS_OPTIONS = [
  'Pre-Primary (PP1)', 'Pre-Primary (PP2)', 'Class 1', 'Class 2', 'Class 3', 'Class 4',
  'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10 (subject to seats)',
];

const STEPS = [
  { n: 1, icon: ClipboardList, title: 'Submit the enquiry', body: 'Fill the form on this page, or collect a printed form from the school office between 8:00 AM and 2:30 PM on any working day.' },
  { n: 2, icon: Phone, title: 'Counsellor calls you', body: 'An admissions counsellor telephones within one working day to answer your questions and fix a convenient time for you to visit.' },
  { n: 3, icon: UserPlus, title: 'Visit with your child', body: 'Bring the documents listed below. For PP1 to Class 5 there is only a short friendly interaction — no written test. Classes 6 to 9 sit a basic placement assessment.' },
  { n: 4, icon: CheckCircle2, title: 'Confirm the seat', body: 'Pay the admission and first-term fee at the counter or through this portal. The class teacher is assigned and the child starts the following Monday.' },
];

const DOCUMENTS = [
  { doc: 'Birth certificate', note: 'Original plus one photocopy', required: true },
  { doc: "Child's Aadhaar card", note: 'Photocopy', required: true },
  { doc: 'Four passport-size photographs', note: 'Recent, light background', required: true },
  { doc: 'Transfer certificate (TC)', note: 'From the previous school — Class 1 and above only', required: false },
  { doc: 'Last report card', note: 'Previous class marksheet — Class 1 and above only', required: false },
  { doc: "Parent's Aadhaar card", note: 'Either parent, photocopy', required: true },
  { doc: 'Caste or income certificate', note: 'Only if applying for a fee concession', required: false },
  { doc: 'Vaccination record', note: 'Pre-Primary admissions only', required: false },
];

export default function Admissions() {
  const { submitEnquiry, toast } = useSchool();
  const [form, setForm] = useState({
    parent: '', phone: '', email: '', student: '', cls: CLASS_OPTIONS[0],
    village: '', dob: '', message: '', transport: 'No',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(x => ({ ...x, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!nonEmpty(form.parent)) next.parent = "Enter the parent or guardian's name.";
    if (!isPhone(form.phone)) next.phone = 'Enter a valid 10-digit Indian mobile number.';
    if (form.email && !isEmail(form.email)) next.email = 'That email address does not look right.';
    if (!nonEmpty(form.student)) next.student = "Enter the child's name.";
    if (!nonEmpty(form.village)) next.village = 'Tell us which village or town you are from.';

    if (Object.keys(next).length) {
      setErrors(next);
      toast('Please correct the highlighted fields.', 'error', 'Check the form');
      // Move focus to the first field with a problem.
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }

    setBusy(true);
    await new Promise(r => setTimeout(r, 1000));
    submitEnquiry(form);
    setBusy(false);
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <PageHeader
        icon={Award}
        eyebrow={`Session ${SCHOOL.session}`}
        title="Admissions are open"
        lead="Pre-Primary through Class 9 are open now. Class 10 depends on seat availability and a transfer certificate. There is no written entrance test below Class 6 — just a short conversation so we know where your child stands."
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="garden" icon={CheckCircle2}>No test below Class 6</Badge>
          <Badge tone="brass" icon={IndianRupee}>Sibling &amp; girl-child concessions</Badge>
          <Badge tone="ink" icon={Clock}>Counsellor calls in 1 working day</Badge>
        </div>
      </PageHeader>

      <div className="max-w-6xl mx-auto px-4 pb-20">

        {/* ---------- Four-step process ---------- */}
        <SectionHeader
          eyebrow="How it works" icon={ClipboardList}
          title="Four steps, start to finish"
          lead="Most families complete the whole process in a single visit."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.n} delay={i * 90}>
                <article className="card-lift p-6 h-full relative">
                  {/* connecting arrow on desktop */}
                  {i < STEPS.length - 1 && (
                    <ArrowRight className="hidden lg:block absolute top-9 -right-4 w-5 h-5 text-brass-300 z-10" />
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <IconTile icon={Icon} tone={toneFor(i)} hover={false} />
                    <span className="font-display text-3xl font-extrabold text-ink-200">{s.n}</span>
                  </div>
                  <h3 className="font-display text-[15px] font-extrabold text-ink-950">{s.title}</h3>
                  <p className="text-[12.5px] text-ink-soft mt-2 leading-relaxed">{s.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">

          {/* ================= ENQUIRY FORM ================= */}
          <div className="lg:col-span-7">
            {done ? (
              <Reveal dir="zoom">
                <div className="panel p-8 sm:p-10 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-garden-100 border-2 border-garden-400 flex items-center justify-center mb-5 animate-pop-in">
                    <CheckCircle2 className="w-9 h-9 text-garden-600" strokeWidth={2.4} />
                  </div>
                  <Badge tone="garden">Enquiry received</Badge>
                  <h3 className="font-display text-2xl font-extrabold text-ink-950 mt-3">
                    Thank you, {form.parent.split(' ')[0]}
                  </h3>
                  <p className="lead text-sm mt-3 max-w-md mx-auto">
                    We have your enquiry for <strong className="text-ink-950">{form.student}</strong> ({form.cls}).
                    An admissions counsellor will telephone <strong className="text-ink-950">{form.phone}</strong> within
                    one working day. If you would rather not wait, call the office directly.
                  </p>

                  <div className="flex flex-wrap justify-center gap-3 mt-7">
                    <a href={`tel:${SCHOOL.phoneRaw}`} className="btn-primary">
                      <Phone className="w-4 h-4" /> Call {SCHOOL.phone}
                    </a>
                    <button onClick={() => { setDone(false); setForm(f => ({ ...f, student: '', dob: '', message: '' })); }}
                            className="btn-ghost">
                      Submit another enquiry
                    </button>
                  </div>

                  <p className="text-[11px] text-ink-faint mt-6">
                    Please keep the document list handy for your visit — it is in the panel beside this form.
                  </p>
                </div>
              </Reveal>
            ) : (
              <Reveal>
                <form onSubmit={submit} className="panel p-6 sm:p-8">
                  <div className="flex items-center gap-2.5 mb-6">
                    <span className="w-10 h-10 rounded-2xl bg-brass-100 text-brass-700 border border-brass-200 flex items-center justify-center">
                      <Send className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-extrabold text-ink-950">Admission enquiry form</h3>
                      <p className="text-[12px] text-ink-soft">Fields marked with an asterisk are required.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="parent" className="field-label">Parent or guardian's name <span className="text-rose-500">*</span></label>
                      <input id="parent" value={form.parent} onChange={set('parent')}
                             placeholder="e.g. Rajesh Verma"
                             className={`field ${errors.parent ? 'field-error' : ''}`} />
                      {errors.parent && <Err>{errors.parent}</Err>}
                    </div>

                    <div>
                      <label htmlFor="phone" className="field-label">Mobile / WhatsApp number <span className="text-rose-500">*</span></label>
                      <input id="phone" value={form.phone} onChange={set('phone')} inputMode="tel"
                             placeholder="e.g. 9812045678"
                             className={`field ${errors.phone ? 'field-error' : ''}`} />
                      {errors.phone && <Err>{errors.phone}</Err>}
                    </div>

                    <div>
                      <label htmlFor="email" className="field-label">Email address <span className="text-ink-faint font-normal">(optional)</span></label>
                      <input id="email" type="email" value={form.email} onChange={set('email')}
                             placeholder="e.g. name@example.com"
                             className={`field ${errors.email ? 'field-error' : ''}`} />
                      {errors.email && <Err>{errors.email}</Err>}
                    </div>

                    <div>
                      <label htmlFor="student" className="field-label">Child's full name <span className="text-rose-500">*</span></label>
                      <input id="student" value={form.student} onChange={set('student')}
                             placeholder="e.g. Aarav Verma"
                             className={`field ${errors.student ? 'field-error' : ''}`} />
                      {errors.student && <Err>{errors.student}</Err>}
                    </div>

                    <div>
                      <label htmlFor="dob" className="field-label">Child's date of birth <span className="text-ink-faint font-normal">(optional)</span></label>
                      <input id="dob" type="date" value={form.dob} onChange={set('dob')} className="field" />
                    </div>

                    <div>
                      <label htmlFor="cls" className="field-label">Class applying for <span className="text-rose-500">*</span></label>
                      <select id="cls" value={form.cls} onChange={set('cls')} className="field font-semibold">
                        {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="village" className="field-label">Village or town <span className="text-rose-500">*</span></label>
                      <input id="village" value={form.village} onChange={set('village')}
                             placeholder="e.g. Karhans / Samalkha / Israna"
                             className={`field ${errors.village ? 'field-error' : ''}`} />
                      {errors.village && <Err>{errors.village}</Err>}
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="transport" className="field-label">Will you need bus transport?</label>
                      <select id="transport" value={form.transport} onChange={set('transport')} className="field font-semibold">
                        <option value="No">No — the child will come on their own</option>
                        <option value="Yes">Yes — please quote the route charge</option>
                        <option value="Maybe">Not decided yet</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="message" className="field-label">Anything you would like to ask <span className="text-ink-faint font-normal">(optional)</span></label>
                      <textarea id="message" rows={4} value={form.message} onChange={set('message')}
                                placeholder="Questions about the fee, subjects, bus route, or anything about your child we should know…"
                                className="field resize-none" />
                    </div>
                  </div>

                  <button type="submit" disabled={busy} className="btn-primary w-full mt-6">
                    {busy ? <><Spinner className="w-4 h-4" /> Submitting your enquiry…</>
                          : <><Send className="w-4 h-4" /> Submit enquiry</>}
                  </button>

                  <p className="text-[11px] text-ink-faint mt-3.5 text-center leading-relaxed">
                    We use these details only to contact you about admission. They are not shared with anyone else.
                  </p>
                </form>
              </Reveal>
            )}
          </div>

          {/* ================= SIDEBAR ================= */}
          <aside className="lg:col-span-5 space-y-5">

            {/* documents */}
            <Reveal dir="left">
              <div className="card p-6">
                <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-brass-600" /> Documents to bring
                </h3>
                <ul className="mt-4 space-y-3">
                  {DOCUMENTS.map(d => (
                    <li key={d.doc} className="flex gap-2.5">
                      <span className={`shrink-0 w-4.5 h-4.5 rounded-md flex items-center justify-center mt-0.5 ${
                        d.required ? 'bg-garden-100 text-garden-700' : 'bg-ink-100 text-ink-400'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" strokeWidth={2.6} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-bold text-ink-950">
                          {d.doc}
                          {!d.required && <span className="ml-1.5 text-[10px] font-semibold text-ink-faint">if applicable</span>}
                        </span>
                        <span className="block text-[11.5px] text-ink-soft leading-snug">{d.note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* age criteria */}
            <Reveal dir="left" delay={80}>
              <div className="card p-6">
                <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2.5">
                  <Calendar className="w-5 h-5 text-garden-600" /> Age on 31 March
                </h3>
                <div className="mt-4 space-y-2">
                  {[
                    ['Pre-Primary (PP1)', '3 years 6 months'],
                    ['Pre-Primary (PP2)', '4 years 6 months'],
                    ['Class 1', '5 years 6 months'],
                    ['Class 2 and above', 'By previous class completed'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center gap-3 py-2 border-b border-ink-900/6 last:border-0">
                      <span className="text-[13px] font-semibold text-ink-700">{k}</span>
                      <span className="text-[12.5px] font-extrabold text-ink-950 text-right">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11.5px] text-ink-soft mt-3.5 leading-relaxed">
                  We allow a little flexibility for a child who is close to the mark and ready for a classroom.
                  Speak to the Principal rather than assuming a few weeks will disqualify your child.
                </p>
              </div>
            </Reveal>

            {/* fee snapshot */}
            <Reveal dir="left" delay={160}>
              <div className="card p-6">
                <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2.5">
                  <IndianRupee className="w-5 h-5 text-brass-600" /> Fee at a glance
                </h3>
                <div className="mt-4 space-y-2">
                  {FEE_STRUCTURE.map(f => (
                    <div key={f.group} className="flex justify-between items-center gap-3 py-2 border-b border-ink-900/6 last:border-0">
                      <span className="text-[12.5px] font-semibold text-ink-700">{f.group}</span>
                      <span className="text-[12.5px] font-extrabold text-ink-950 shrink-0 font-mono">{inr(f.monthly)}<span className="text-ink-faint font-sans font-semibold">/mo</span></span>
                    </div>
                  ))}
                </div>
                <Link to="/fees" className="btn-ghost w-full mt-4 text-xs">
                  Full fee structure <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Reveal>

            {/* concessions */}
            <Reveal dir="left" delay={240}>
              <div className="card p-6 border-garden-200 bg-garden-50/60">
                <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-garden-600" /> Concessions available
                </h3>
                <ul className="mt-3.5 space-y-2.5 text-[12.5px] text-ink-700">
                  <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-garden-600 shrink-0 mt-0.5" /> 25% off from the second sibling onward</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-garden-600 shrink-0 mt-0.5" /> 15% off for girls in Classes 9 and 10</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-garden-600 shrink-0 mt-0.5" /> Full waivers each year for families in genuine difficulty</li>
                </ul>
                <p className="text-[11.5px] text-ink-soft mt-3.5 leading-relaxed">
                  No child is turned away for money alone. Ask to speak to the Principal in private — it stays private.
                </p>
              </div>
            </Reveal>

            {/* help */}
            <Reveal dir="left" delay={320}>
              <div className="card p-6 flex gap-3.5">
                <Info className="w-4.5 h-4.5 text-ink-400 shrink-0 mt-0.5" />
                <div className="text-[12.5px] text-ink-soft leading-relaxed">
                  <p className="font-bold text-ink-950 mb-1">Prefer to just come in?</p>
                  The office is open {SCHOOL.officeHours}. No appointment is needed. Ask at the gate for the
                  admissions desk, or call <a href={`tel:${SCHOOL.phoneRaw}`} className="font-bold text-brass-700 hover:underline">{SCHOOL.phone}</a>.
                </div>
              </div>
            </Reveal>
          </aside>
        </div>
      </div>
    </>
  );
}

function Err({ children }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 mt-1.5">
      <AlertCircle className="w-3 h-3 shrink-0" /> {children}
    </p>
  );
}
