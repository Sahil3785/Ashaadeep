import React, { useState } from 'react';
import {
  Phone, Mail, MapPin, Clock, Send, MessageCircle, ExternalLink, CheckCircle2,
  AlertCircle, Bus, Navigation, Building2, User,
} from 'lucide-react';
import { SCHOOL } from '../data/school';
import { useSchool } from '../context/SchoolContext';
import { PageHeader, Reveal, SectionHeader, Badge } from '../components/UI';
import { Spinner } from '../components/Loaders';
import { isPhone, isEmail, nonEmpty } from '../utils/format';

const SUBJECTS = [
  'Admission enquiry', 'Fee or receipt question', 'Result or marksheet issue',
  'Bus route and transport', 'Meeting with a class teacher', 'Transfer certificate',
  'Teaching vacancy', 'Something else',
];

const ROUTES = [
  { route: 'Route 1', covers: 'Karhans village, Karhans Road', charge: '₹600' },
  { route: 'Route 2', covers: 'Samalkha town, Patti Kalyana', charge: '₹1,100' },
  { route: 'Route 3', covers: 'Israna, Didwari, Jaurasi', charge: '₹900' },
  { route: 'Route 4', covers: 'G.T. Road stops up to Panipat bypass', charge: '₹1,000' },
];

export default function Contact() {
  const { toast } = useSchool();
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: SUBJECTS[0], message: '' });
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
    if (!nonEmpty(form.name)) next.name = 'Please tell us your name.';
    if (!isPhone(form.phone)) next.phone = 'Enter a valid 10-digit Indian mobile number.';
    if (form.email && !isEmail(form.email)) next.email = 'That email address does not look right.';
    if (!nonEmpty(form.message)) next.message = 'Please write your message so we can help.';

    if (Object.keys(next).length) {
      setErrors(next);
      document.getElementById(Object.keys(next)[0])?.focus();
      toast('Please correct the highlighted fields.', 'error', 'Check the form');
      return;
    }

    setBusy(true);
    await new Promise(r => setTimeout(r, 900));
    setBusy(false);
    setDone(true);
    toast('Your message has reached the school office.', 'success', 'Message sent');
  };

  return (
    <>
      <PageHeader
        icon={Phone}
        eyebrow="Contact & visit"
        title="Come and see the school"
        lead={`The office is open ${SCHOOL.officeHours}. No appointment is needed — ask at the gate and someone will take you to whoever you need. You can also telephone, send a WhatsApp message, or write using the form below.`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="garden" icon={Clock}>Open Mon–Sat</Badge>
          <Badge tone="brass" icon={MapPin}>G.T. Road, {SCHOOL.village}</Badge>
        </div>
      </PageHeader>

      <div className="max-w-6xl mx-auto px-4 pb-20">

        {/* ---------- Contact cards ---------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {[
            { icon: Phone, tone: 'garden', label: 'Telephone', value: SCHOOL.phone, href: `tel:${SCHOOL.phoneRaw}`, note: 'Office hours only' },
            { icon: MessageCircle, tone: 'garden', label: 'WhatsApp', value: SCHOOL.phone, href: `https://wa.me/${SCHOOL.whatsapp}`, note: 'Replies within a day' },
            { icon: Mail, tone: 'brass', label: 'Email', value: SCHOOL.email, href: `mailto:${SCHOOL.email}`, note: 'For documents and CVs' },
            { icon: MapPin, tone: 'ink', label: 'Address', value: `${SCHOOL.village}, ${SCHOOL.district}`, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SCHOOL.mapQuery)}`, note: 'Open in Maps' },
          ].map((c, i) => {
            const Icon = c.icon;
            const tones = {
              brass: 'bg-brass-100 text-brass-700 border-brass-200',
              garden: 'bg-garden-100 text-garden-700 border-garden-200',
              ink: 'bg-ink-100 text-ink-600 border-ink-200',
            };
            const external = c.href.startsWith('http');
            return (
              <Reveal key={c.label} delay={i * 80}>
                <a href={c.href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
                   className="card-lift p-6 h-full block group">
                  <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 ${tones[c.tone]}`}>
                    <Icon className="w-5 h-5" strokeWidth={2.2} />
                  </div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-ink-faint">{c.label}</p>
                  <p className="text-[13.5px] font-extrabold text-ink-950 mt-1 break-words group-hover:text-brass-700 transition-colors">
                    {c.value}
                  </p>
                  <p className="text-[11px] text-ink-faint mt-1.5 inline-flex items-center gap-1">
                    {c.note} {external && <ExternalLink className="w-3 h-3" />}
                  </p>
                </a>
              </Reveal>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">

          {/* ================= MESSAGE FORM ================= */}
          <div className="lg:col-span-7">
            {done ? (
              <Reveal dir="zoom">
                <div className="panel p-8 sm:p-10 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-garden-100 border-2 border-garden-400 flex items-center justify-center mb-5 animate-pop-in">
                    <CheckCircle2 className="w-9 h-9 text-garden-600" strokeWidth={2.4} />
                  </div>
                  <Badge tone="garden">Message sent</Badge>
                  <h3 className="font-display text-2xl font-extrabold text-ink-950 mt-3">
                    Thank you, {form.name.split(' ')[0]}
                  </h3>
                  <p className="lead text-sm mt-3 max-w-md mx-auto">
                    Your message about "{form.subject}" has reached the office. Someone will call
                    <strong className="text-ink-950"> {form.phone}</strong> within one working day. For anything
                    urgent, telephone us directly rather than waiting.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 mt-7">
                    <a href={`tel:${SCHOOL.phoneRaw}`} className="btn-primary">
                      <Phone className="w-4 h-4" /> Call {SCHOOL.phone}
                    </a>
                    <button onClick={() => { setDone(false); setForm(f => ({ ...f, message: '' })); }} className="btn-ghost">
                      Send another message
                    </button>
                  </div>
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
                      <h3 className="font-display text-lg font-extrabold text-ink-950">Write to the office</h3>
                      <p className="text-[12px] text-ink-soft">We read every message. Replies come by phone.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="field-label">Your name <span className="text-rose-500">*</span></label>
                      <input id="name" value={form.name} onChange={set('name')} placeholder="e.g. Sunita Devi"
                             className={`field ${errors.name ? 'field-error' : ''}`} />
                      {errors.name && <Err>{errors.name}</Err>}
                    </div>

                    <div>
                      <label htmlFor="phone" className="field-label">Mobile number <span className="text-rose-500">*</span></label>
                      <input id="phone" value={form.phone} onChange={set('phone')} inputMode="tel"
                             placeholder="e.g. 9812045678"
                             className={`field ${errors.phone ? 'field-error' : ''}`} />
                      {errors.phone && <Err>{errors.phone}</Err>}
                    </div>

                    <div>
                      <label htmlFor="email" className="field-label">Email <span className="text-ink-faint font-normal">(optional)</span></label>
                      <input id="email" type="email" value={form.email} onChange={set('email')}
                             placeholder="e.g. name@example.com"
                             className={`field ${errors.email ? 'field-error' : ''}`} />
                      {errors.email && <Err>{errors.email}</Err>}
                    </div>

                    <div>
                      <label htmlFor="subject" className="field-label">What is this about? <span className="text-rose-500">*</span></label>
                      <select id="subject" value={form.subject} onChange={set('subject')} className="field font-semibold">
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="message" className="field-label">Your message <span className="text-rose-500">*</span></label>
                      <textarea id="message" rows={5} value={form.message} onChange={set('message')}
                                placeholder="Tell us what you need. If it concerns a particular student, please include their name and class."
                                className={`field resize-none ${errors.message ? 'field-error' : ''}`} />
                      {errors.message && <Err>{errors.message}</Err>}
                    </div>
                  </div>

                  <button type="submit" disabled={busy} className="btn-primary w-full mt-6">
                    {busy ? <><Spinner className="w-4 h-4" /> Sending…</>
                          : <><Send className="w-4 h-4" /> Send message</>}
                  </button>
                </form>
              </Reveal>
            )}
          </div>

          {/* ================= SIDEBAR ================= */}
          <aside className="lg:col-span-5 space-y-5">

            {/* timings */}
            <Reveal dir="left">
              <div className="card p-6">
                <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-garden-600" /> Timings
                </h3>
                <div className="mt-4 space-y-3">
                  {[
                    ['Classes', SCHOOL.schoolHours],
                    ['Office', SCHOOL.officeHours],
                    ['Winter schedule', 'Classes shift to a 9:00 AM start in peak winter'],
                    ['Sunday & holidays', 'Closed — see the notices page for the list'],
                  ].map(([k, v]) => (
                    <div key={k} className="pb-3 border-b border-ink-900/6 last:border-0 last:pb-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">{k}</p>
                      <p className="text-[13px] font-semibold text-ink-900 mt-0.5 leading-snug">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* who to ask */}
            <Reveal dir="left" delay={80}>
              <div className="card p-6">
                <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2.5">
                  <User className="w-5 h-5 text-brass-600" /> Who to ask for
                </h3>
                <div className="mt-4 space-y-3">
                  {[
                    ['Admissions', 'The admissions desk, ground floor, beside the office'],
                    ['Fees & receipts', 'Accounts counter, same corridor'],
                    ['A child\'s progress', 'Their class teacher — ask the office to call them'],
                    ['Anything unresolved', 'The Principal, directly. No appointment needed.'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brass-500 mt-2" />
                      <div>
                        <p className="text-[13px] font-bold text-ink-950">{k}</p>
                        <p className="text-[12px] text-ink-soft leading-snug">{v}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* bus routes */}
            <Reveal dir="left" delay={160}>
              <div className="card p-6">
                <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2.5">
                  <Bus className="w-5 h-5 text-garden-600" /> Bus routes
                </h3>
                <p className="text-[12px] text-ink-soft mt-2 leading-relaxed">
                  Eight GPS-tracked buses, each with a trained female attendant on board.
                </p>
                <div className="mt-4 space-y-2">
                  {ROUTES.map(r => (
                    <div key={r.route} className="flex justify-between items-start gap-3 py-2 border-b border-ink-900/6 last:border-0">
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-bold text-ink-950">{r.route}</p>
                        <p className="text-[11.5px] text-ink-soft leading-snug">{r.covers}</p>
                      </div>
                      <span className="shrink-0 text-[12.5px] font-extrabold text-ink-950 font-mono">
                        {r.charge}<span className="text-ink-faint font-sans font-semibold text-[10px]">/mo</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* directions */}
            <Reveal dir="left" delay={240}>
              <div className="card p-6">
                <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2.5">
                  <Navigation className="w-5 h-5 text-ink-600" /> Finding us
                </h3>
                <p className="text-[12.5px] text-ink-soft mt-2.5 leading-relaxed">
                  We are on G.T. Road in Karhans, about 12 km from Panipat city toward Samalkha. The gate is on the
                  left coming from Panipat, just past the village bus stop — look for the yellow boundary wall and
                  the school name board.
                </p>
                <div className="mt-4 p-3.5 rounded-2xl bg-ink-50 border border-ink-900/8">
                  <p className="flex gap-2.5 text-[12.5px] text-ink-700">
                    <Building2 className="w-4 h-4 text-brass-600 shrink-0 mt-0.5" />
                    <span>{SCHOOL.address}</span>
                  </p>
                </div>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SCHOOL.mapQuery)}`}
                   target="_blank" rel="noopener noreferrer" className="btn-ink w-full mt-4 text-xs">
                  <MapPin className="w-4 h-4" /> Open in Google Maps <ExternalLink className="w-3.5 h-3.5" />
                </a>
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
