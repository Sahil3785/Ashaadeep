import React from 'react';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, Clock, Award, ArrowRight, Mail, Sparkles } from 'lucide-react';
import { FACULTY, SCHOOL } from '../data/school';
import { PageHeader, Reveal, SectionHeader, Badge } from '../components/UI';
import { SkCardGrid } from '../components/Loaders';
import { useDelay } from '../hooks';

const TONES = {
  brass:  { bg: 'bg-brass-100',  text: 'text-brass-700',  ring: 'ring-brass-200',  medallion: 'from-brass-400 to-brass-600' },
  garden: { bg: 'bg-garden-100', text: 'text-garden-700', ring: 'ring-garden-200', medallion: 'from-garden-400 to-garden-600' },
  ink:    { bg: 'bg-ink-100',    text: 'text-ink-600',    ring: 'ring-ink-200',    medallion: 'from-ink-600 to-ink-900' },
};

export default function Faculty() {
  const ready = useDelay(550);
  const leadership = FACULTY.filter(f => /Principal/.test(f.role));
  const heads = FACULTY.filter(f => !/Principal/.test(f.role));

  return (
    <>
      <PageHeader
        icon={Users}
        eyebrow="Our teachers"
        title="The people who run the classrooms"
        lead="Every teacher here holds a B.Ed. or M.Ed. and most have taught in this district for over a decade. Sections are capped at 28 students so each of them can actually keep track of a class."
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="brass" icon={GraduationCap}>45 teaching staff</Badge>
          <Badge tone="garden" icon={Users}>28 students per section</Badge>
        </div>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 pb-20">

        {/* ---------- Leadership ---------- */}
        <SectionHeader
          eyebrow="School leadership" icon={Award}
          title="Principal's office"
          lead="Open to parents on any working day between 8:00 AM and 2:30 PM, without an appointment."
        />

        {!ready ? <SkCardGrid count={2} cols="md:grid-cols-2" media={false} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {leadership.concat(heads.slice(0, 1)).slice(0, 2).map((f, i) => (
              <Reveal key={f.name} delay={i * 90}>
                <LeaderCard f={f} />
              </Reveal>
            ))}
          </div>
        )}

        {/* ---------- Department heads ---------- */}
        <SectionHeader
          eyebrow="Department heads" icon={BookOpen}
          title="Subject leads"
          lead="Each department head sets the teaching plan for their subject across all sections and runs the weekly review with their teachers."
        />

        {!ready ? <SkCardGrid count={6} media={false} /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FACULTY.map((f, i) => (
              <Reveal key={f.name} delay={i * 60}>
                <StaffCard f={f} />
              </Reveal>
            ))}
          </div>
        )}

        {/* ---------- Hiring note ---------- */}
        <Reveal>
          <div className="panel-brass p-8 sm:p-10 mt-16 text-center">
            <div className="relative">
              <span className="eyebrow mx-auto"><Sparkles className="w-3.5 h-3.5" /> We are hiring</span>
              <h3 className="font-display text-2xl font-extrabold text-ink-950 mt-4">
                Teaching vacancies for session {SCHOOL.session}
              </h3>
              <p className="lead text-sm mt-3 max-w-xl mx-auto">
                We have openings for a Mathematics teacher (Classes 6–8), a Pre-Primary class teacher, and a
                part-time Music and Art instructor. A B.Ed. is required for the subject posts. Send your
                curriculum vitae to the school email or bring it to the office in person.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                <a href={`mailto:${SCHOOL.email}?subject=Teaching%20application`} className="btn-primary">
                  <Mail className="w-4 h-4" /> Email your CV
                </a>
                <Link to="/contact" className="btn-ghost">
                  Contact the office <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}

/* Larger card for the Principal and Vice Principal. */
function LeaderCard({ f }) {
  const t = TONES[f.tone] || TONES.brass;
  return (
    <article className="card-lift p-7 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
      <div className="relative shrink-0">
        <div className={`absolute -inset-2 rounded-full bg-gradient-to-br ${t.medallion} opacity-20 blur-lg`} />
        <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${t.medallion} flex items-center justify-center shadow-lift`}>
          <span className="font-display text-2xl font-extrabold text-white">{f.initials}</span>
        </div>
      </div>

      <div className="min-w-0">
        <span className={`chip ${t.bg} ${t.text} ring-1 ${t.ring}`}>{f.role}</span>
        <h3 className="font-display text-lg font-extrabold text-ink-950 mt-2.5">{f.name}</h3>
        <p className="text-[13px] font-semibold text-ink-soft mt-1">{f.subject}</p>
        <div className="mt-3.5 pt-3.5 border-t border-ink-900/8 space-y-1.5 text-[12.5px] text-ink-soft">
          <p className="flex items-center justify-center sm:justify-start gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-brass-600 shrink-0" /> {f.qual}
          </p>
          <p className="flex items-center justify-center sm:justify-start gap-2">
            <Clock className="w-3.5 h-3.5 text-garden-600 shrink-0" /> {f.exp} of teaching
          </p>
        </div>
      </div>
    </article>
  );
}

/* Compact card for the wider staff grid. */
function StaffCard({ f }) {
  const t = TONES[f.tone] || TONES.brass;
  return (
    <article className="card-lift p-6 group">
      <div className="flex items-start gap-4">
        <div className={`shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${t.medallion} flex items-center justify-center shadow-lift transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
          <span className="font-display text-base font-extrabold text-white">{f.initials}</span>
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-extrabold text-ink-950 leading-snug">{f.name}</h3>
          <span className={`chip ${t.bg} ${t.text} mt-1.5 text-[10px]`}>{f.role}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-ink-900/8 space-y-2 text-[12.5px]">
        <p className="flex gap-2 text-ink-700">
          <BookOpen className="w-3.5 h-3.5 text-brass-600 shrink-0 mt-0.5" />
          <span>{f.subject}</span>
        </p>
        <p className="flex gap-2 text-ink-soft">
          <GraduationCap className="w-3.5 h-3.5 text-ink-400 shrink-0 mt-0.5" />
          <span>{f.qual}</span>
        </p>
        <p className="flex gap-2 text-ink-soft">
          <Clock className="w-3.5 h-3.5 text-garden-600 shrink-0 mt-0.5" />
          <span>{f.exp} experience</span>
        </p>
      </div>
    </article>
  );
}
