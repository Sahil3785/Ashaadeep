import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Compass, Home, ArrowLeft, Search, FileSpreadsheet, CreditCard, Award,
  Phone, BookOpen, Images, HelpCircle,
} from 'lucide-react';
import { SCHOOL } from '../data/school';
import { Reveal, IconTile, toneFor } from '../components/UI';

/* ============================================================
   NotFound — the 404 page.
   It does three things rather than just apologising: shows what
   was asked for, offers the pages people actually want, and
   gives a way back.
   ============================================================ */
export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  const suggestions = [
    { to: '/results', icon: FileSpreadsheet, label: 'Check a result', desc: 'Marksheets by roll number' },
    { to: '/fees', icon: CreditCard, label: 'Pay the fee', desc: 'UPI QR and instant receipt' },
    { to: '/admissions', icon: Award, label: 'Admissions', desc: `Open for session ${SCHOOL.session}` },
    { to: '/syllabus', icon: BookOpen, label: 'Syllabus', desc: 'Chapter list by class' },
    { to: '/gallery', icon: Images, label: 'Campus gallery', desc: 'Photographs of the school' },
    { to: '/contact', icon: Phone, label: 'Contact us', desc: 'Phone, email and directions' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
      <Reveal dir="zoom">
        <div className="panel-brass p-8 sm:p-12 text-center">
          <div className="relative">
            {/* big 404 with a compass sitting in the zero */}
            <div className="relative flex items-center justify-center mb-6">
              <span className="font-display text-[5.5rem] sm:text-[8rem] font-extrabold leading-none text-ink-100 select-none tracking-tighter">
                4
              </span>
              <span className="relative mx-1 sm:mx-2">
                <span className="font-display text-[5.5rem] sm:text-[8rem] font-extrabold leading-none text-ink-100 select-none tracking-tighter">
                  0
                </span>
                <Compass className="absolute inset-0 m-auto w-11 h-11 sm:w-16 sm:h-16 text-brass-500 animate-spin-slow" strokeWidth={2} />
              </span>
              <span className="font-display text-[5.5rem] sm:text-[8rem] font-extrabold leading-none text-ink-100 select-none tracking-tighter">
                4
              </span>
            </div>

            <div><span className="eyebrow">Page not found</span></div>
            <h1 className="h-page mt-4">This page does not exist</h1>
            <p className="lead mt-4 max-w-lg mx-auto">
              The address you opened is not part of this portal. It may have been mistyped, or it may be a link
              from an older version of the site. Nothing has gone wrong with your account or your records.
            </p>

            {/* show what was requested, so a typo is obvious */}
            <div className="inline-flex items-center gap-2 mt-5 px-3.5 py-2 rounded-xl bg-white/80 border border-ink-900/10">
              <Search className="w-3.5 h-3.5 text-ink-faint shrink-0" />
              <code className="text-[12px] font-mono text-ink-700 break-all">{location.pathname}</code>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link to="/" className="btn-primary">
                <Home className="w-4 h-4" /> Go to the home page
              </Link>
              <button onClick={() => navigate(-1)} className="btn-ghost">
                <ArrowLeft className="w-4 h-4" /> Back to the previous page
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ---------- Where people usually want to go ---------- */}
      <Reveal>
        <div className="mt-10">
          <p className="text-center text-[11px] font-extrabold uppercase tracking-[.16em] text-ink-faint mb-5">
            Were you looking for one of these?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestions.map((s, i) => {
              const Icon = s.icon;
              return (
                <Link key={s.to} to={s.to}
                      className="card-lift p-5 flex items-center gap-3.5 group"
                      style={{ transitionDelay: `${i * 40}ms` }}>
                  <IconTile icon={Icon} tone={toneFor(i)} size="sm" />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-extrabold text-ink-950 group-hover:text-brass-700 transition-colors">
                      {s.label}
                    </span>
                    <span className="block text-[11.5px] text-ink-faint leading-snug">{s.desc}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* ---------- Help ---------- */}
      <Reveal>
        <div className="card p-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3.5">
            <HelpCircle className="w-5 h-5 text-brass-600 shrink-0" />
            <p className="text-[13px] text-ink-soft leading-relaxed">
              If a link on this site brought you here, please let the office know so we can fix it.
            </p>
          </div>
          <a href={`tel:${SCHOOL.phoneRaw}`} className="btn-ink text-xs shrink-0">
            <Phone className="w-4 h-4" /> {SCHOOL.phone}
          </a>
        </div>
      </Reveal>
    </div>
  );
}
