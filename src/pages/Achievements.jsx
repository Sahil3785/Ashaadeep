import React from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Medal, FlaskConical, Building2, BookOpen, Award, TrendingUp,
  ArrowRight, Star, Users, GraduationCap,
} from 'lucide-react';
import { ACHIEVEMENTS, SCHOOL } from '../data/school';
import { PageHeader, Reveal, SectionHeader, Badge, ProgressBar, StatTile } from '../components/UI';
import { SkCardGrid } from '../components/Loaders';
import { useDelay } from '../hooks';

const ICONS = { Trophy, Medal, FlaskConical, Building2, BookOpen, Award };

export default function Achievements() {
  const ready = useDelay(500);

  // Grouped by year so the page reads as a record, not a scatter of badges.
  const years = [...new Set(ACHIEVEMENTS.map(a => a.year))].sort().reverse();

  return (
    <>
      <PageHeader
        icon={Trophy}
        eyebrow="Record of results"
        title="What our students have achieved"
        lead="Board results, district tournaments, state exhibitions and the recognitions the school itself has received — listed by year, as recorded in the school register."
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="garden" icon={TrendingUp}>100% board pass, 2025-26</Badge>
          <Badge tone="brass" icon={Star}>34 students above 85%</Badge>
        </div>
      </PageHeader>

      <div className="max-w-6xl mx-auto px-4 pb-20">

        {/* ---------- Board result breakdown ---------- */}
        <SectionHeader
          eyebrow="Class 10 board result" icon={GraduationCap}
          title={`HBSE examination, session 2025-26`}
          lead="All 112 candidates the school presented cleared the board examination."
        />

        {ready ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
              <Reveal delay={0}><StatTile icon={Users} value={112} label="Candidates presented" note="Class 10, March 2026" tone="ink" /></Reveal>
              <Reveal delay={80}><StatTile icon={TrendingUp} value={100} suffix="%" label="Pass percentage" note="Fourteenth consecutive year" tone="garden" /></Reveal>
              <Reveal delay={160}><StatTile icon={Star} value={34} label="Scored above 85%" note="Distinction band" tone="brass" /></Reveal>
              <Reveal delay={240}><StatTile icon={Trophy} value={96} suffix="%" label="School topper" note="Priya Sharma, 10-A" tone="brass" /></Reveal>
            </div>

            {/* grade distribution */}
            <Reveal>
              <div className="panel p-6 sm:p-8 mb-16">
                <h3 className="font-display text-lg font-extrabold text-ink-950 mb-1">Grade distribution</h3>
                <p className="text-[13px] text-ink-soft mb-6">Share of the 112 candidates in each grade band.</p>
                <div className="space-y-4">
                  {[
                    { band: 'A1 — 91% and above', count: 11, tone: 'garden' },
                    { band: 'A2 — 81% to 90%', count: 23, tone: 'garden' },
                    { band: 'B1 — 71% to 80%', count: 34, tone: 'brass' },
                    { band: 'B2 — 61% to 70%', count: 27, tone: 'brass' },
                    { band: 'C1 — 51% to 60%', count: 13, tone: 'ink' },
                    { band: 'C2 and below — 33% to 50%', count: 4, tone: 'ink' },
                  ].map(g => (
                    <div key={g.band}>
                      <ProgressBar value={g.count} max={112} tone={g.tone}
                                   label={`${g.band} — ${g.count} students`} />
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </>
        ) : <SkCardGrid count={4} cols="grid-cols-2 lg:grid-cols-4" media={false} />}

        {/* ---------- Achievements by year ---------- */}
        <SectionHeader
          eyebrow="Year by year" icon={Award}
          title="Recognitions and wins"
          lead="Academic, sporting and institutional."
        />

        <div className="space-y-12">
          {years.map((year, yi) => (
            <div key={year}>
              <Reveal>
                <div className="flex items-center gap-4 mb-5">
                  <span className="font-display text-3xl font-extrabold text-ink-200">{year}</span>
                  <span className="flex-1 h-0.5 rounded-full bg-gradient-to-r from-brass-300 to-transparent" />
                  <Badge tone="ink">{ACHIEVEMENTS.filter(a => a.year === year).length} entries</Badge>
                </div>
              </Reveal>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {ACHIEVEMENTS.filter(a => a.year === year).map((a, i) => {
                  const Icon = ICONS[a.icon] || Trophy;
                  const tones = {
                    brass: 'bg-brass-100 text-brass-700 border-brass-200',
                    garden: 'bg-garden-100 text-garden-700 border-garden-200',
                    ink: 'bg-ink-100 text-ink-600 border-ink-200',
                  };
                  return (
                    <Reveal key={a.title} delay={i * 80} dir="zoom">
                      <article className="card-lift p-6 h-full group relative overflow-hidden">
                        {/* ribbon corner */}
                        <div className="absolute -top-8 -right-8 w-20 h-20 rotate-45 bg-gradient-to-br from-brass-200/40 to-transparent" />
                        <div className={`relative w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${tones[a.tone]}`}>
                          <Icon className="w-5.5 h-5.5" strokeWidth={2.2} />
                        </div>
                        <h3 className="font-display text-[15px] font-extrabold text-ink-950 leading-snug">{a.title}</h3>
                        <p className="text-[13px] text-ink-soft mt-2 leading-relaxed">{a.detail}</p>
                      </article>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ---------- Closing ---------- */}
        <Reveal dir="zoom">
          <div className="relative rounded-4xl bg-ink-950 p-9 sm:p-12 text-center overflow-hidden shadow-float mt-16">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[30rem] h-52 rounded-full bg-brass-500/20 blur-3xl" />
            <div className="relative max-w-xl mx-auto">
              <Trophy className="w-11 h-11 text-brass-400 mx-auto mb-5" strokeWidth={2.2} />
              <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Fourteen straight years of a full pass result
              </h3>
              <p className="text-sm text-ink-300 mt-4 leading-relaxed">
                Since our first board batch in 2013, every student {SCHOOL.shortName} has presented for the Class 10
                examination has passed. We do not achieve that by holding weak students back — we achieve it by
                finding them in Class 8, not in March.
              </p>
              <Link to="/admissions" className="btn-primary mt-7">
                <Award className="w-4 h-4" /> Apply for admission <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}
