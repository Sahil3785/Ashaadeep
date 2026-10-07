import React from 'react';
import { Link } from 'react-router-dom';
import {
  Info, Target, Eye, Heart, CheckCircle2, Building2, Users, BookOpen,
  ArrowRight, Quote, MapPin, Award, Flag, Sparkles,
} from 'lucide-react';
import { SCHOOL, MILESTONES, HOUSES, STATS } from '../data/school';
import { PageHeader, Reveal, SectionHeader, StatTile, Badge } from '../components/UI';
import { useDelay } from '../hooks';
import { SkStats } from '../components/Loaders';

const ICONS = { Award, Users, BookOpen, Building2 };

export default function About() {
  const ready = useDelay(450);

  return (
    <>
      <PageHeader
        icon={Info}
        eyebrow="About the school"
        title="Twenty-three years in Karhans"
        lead={`${SCHOOL.name} opened in ${SCHOOL.established} with forty-six children and three rooms. It was founded for one plain reason: the village had no school its own children could finish, so families sent ten-year-olds into Panipat city or stopped sending them at all.`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="brass" icon={Flag}>Established {SCHOOL.established}</Badge>
          <Badge tone="garden" icon={CheckCircle2}>HBSE Recognized</Badge>
          <Badge tone="ink" icon={MapPin}>{SCHOOL.village}, {SCHOOL.district}</Badge>
        </div>
      </PageHeader>

      {/* ---------- Mission / Vision / Values ---------- */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Target, tone: 'brass', title: 'Our mission',
              body: 'To give every child in and around Karhans a complete school education — Pre-Primary to Class 10 — that is good enough that no family feels they must look elsewhere. Not an alternative to a city school. An equal one.' },
            { icon: Eye, tone: 'garden', title: 'Our vision',
              body: 'A village school where a child who arrives at three and leaves at fifteen can read closely, reason through a problem, speak English without fear, and still know exactly where they come from.' },
            { icon: Heart, tone: 'ink', title: 'What we hold to',
              body: 'Sections capped at 28 so no child is anonymous. Teachers who call home before a problem becomes a failure. Fees that a farming or wage-earning family can actually plan around. No child turned away for money alone.' },
          ].map((c, i) => {
            const Icon = c.icon;
            const tones = {
              brass: 'bg-brass-100 text-brass-700 border-brass-200',
              garden: 'bg-garden-100 text-garden-700 border-garden-200',
              ink: 'bg-ink-100 text-ink-600 border-ink-200',
            };
            return (
              <Reveal key={c.title} delay={i * 90}>
                <article className="card-lift p-7 h-full">
                  <div className={`w-13 h-13 rounded-2xl border flex items-center justify-center mb-4 ${tones[c.tone]}`}>
                    <Icon className="w-6 h-6" strokeWidth={2.2} />
                  </div>
                  <h3 className="font-display text-lg font-extrabold text-ink-950">{c.title}</h3>
                  <p className="text-[13px] text-ink-soft mt-2.5 leading-relaxed">{c.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        {ready ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 80}>
                <StatTile icon={ICONS[s.icon] || Award} value={s.value} suffix={s.suffix}
                          label={s.label} note={s.note} tone={['brass', 'garden', 'ink', 'brass'][i % 4]} />
              </Reveal>
            ))}
          </div>
        ) : <SkStats />}
      </section>

      {/* ---------- Timeline ---------- */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <SectionHeader
          eyebrow="Our story" icon={Sparkles}
          title="How the school grew"
          lead="Six moments that changed what this school could offer."
        />

        <div className="relative">
          {/* vertical spine */}
          <div className="absolute left-[1.35rem] sm:left-1/2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-brass-300 via-brass-400 to-garden-400 sm:-translate-x-1/2" />

          <div className="space-y-8">
            {MILESTONES.map((m, i) => {
              const right = i % 2 === 1;
              return (
                <Reveal key={m.year} dir={right ? 'left' : 'right'} delay={i * 60}>
                  <div className={`relative flex items-start gap-5 sm:gap-0 ${right ? 'sm:flex-row-reverse' : ''}`}>
                    {/* content */}
                    <div className={`flex-1 sm:w-1/2 ${right ? 'sm:pl-10' : 'sm:pr-10'} pl-14 sm:pl-0`}>
                      <div className={`card-lift p-5 ${right ? '' : 'sm:text-right'}`}>
                        <span className="chip-brass mb-2">{m.year}</span>
                        <h3 className="font-display text-base font-extrabold text-ink-950 mt-1">{m.title}</h3>
                        <p className="text-[13px] text-ink-soft mt-1.5 leading-relaxed">{m.desc}</p>
                      </div>
                    </div>

                    {/* node */}
                    <div className="absolute left-0 sm:left-1/2 top-4 sm:-translate-x-1/2 w-11 h-11 rounded-2xl
                                    bg-white ring-2 ring-brass-300 text-brass-700 flex items-center justify-center
                                    shadow-soft shrink-0 z-10">
                      <span className="font-display text-[11px] font-extrabold">{m.year.slice(2)}</span>
                    </div>

                    <div className="hidden sm:block sm:w-1/2" />
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Houses ---------- */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <SectionHeader
          eyebrow="House system" icon={Award}
          title="Four houses"
          lead="A child joins a house on admission and keeps it until Class 10, which means the older students end up looking after the younger ones in their own house."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {HOUSES.map((h, i) => (
            <Reveal key={h.name} delay={i * 80} dir="zoom">
              <div className="card-lift p-6 text-center relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: h.color }} />
                <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-lift mb-3.5 mt-1"
                     style={{ background: h.color }}>
                  <Award className="w-6.5 h-6.5 text-white" strokeWidth={2.2} />
                </div>
                <h3 className="font-display text-lg font-extrabold text-ink-950">{h.name}</h3>
                <p className="text-[11px] font-bold uppercase tracking-wider mt-0.5" style={{ color: h.color }}>{h.meaning}</p>
                <p className="font-serif italic text-xs text-ink-soft mt-2.5">"{h.motto}"</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Infrastructure ---------- */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <SectionHeader
          eyebrow="The campus" icon={Building2}
          title="What is actually on the ground"
          lead="Two walled acres on G.T. Road, built out one stage at a time as the school could afford it."
        />
        <Reveal>
          <div className="panel p-7 sm:p-9">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3.5">
              {[
                '24 classrooms, all with ceiling fans and cross ventilation',
                'Interactive flat panels in every Class 3–10 room',
                'Physics, Chemistry and Biology laboratory with safety cabinets',
                '40-terminal computer centre on fibre broadband',
                'Library and silent reading hall, 5,000+ volumes',
                'Covered assembly ground with a stage',
                '200-metre running track and kabaddi pit',
                'Cricket nets, volleyball and badminton courts',
                'Separate clean toilet blocks for girls and boys',
                'RO drinking-water stations on both floors',
                'First-aid room with a trained attendant',
                'Eight GPS-tracked buses with female attendants',
                'CCTV on all corridors and the main gate',
                'Walled compound with a single monitored entry',
                'Soft-floor activity room for Pre-Primary',
              ].map(item => (
                <div key={item} className="flex gap-2.5 text-[13px] text-ink-soft leading-snug">
                  <CheckCircle2 className="w-4 h-4 text-garden-500 shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- Closing quote ---------- */}
      <section className="max-w-4xl mx-auto px-4 py-14">
        <Reveal dir="zoom">
          <div className="relative rounded-4xl bg-ink-950 p-9 sm:p-12 text-center overflow-hidden shadow-float">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full bg-brass-500/20 blur-3xl" />
            <div className="relative">
              <Quote className="w-10 h-10 text-brass-400 mx-auto mb-5" strokeWidth={2.3} />
              <blockquote className="font-serif text-lg sm:text-xl text-white leading-relaxed italic max-w-2xl mx-auto">
                We are not trying to be the biggest school in Panipat district. We are trying to be the one
                where a parent from this village can walk in on any working day, without an appointment, and be
                told the truth about how their child is doing.
              </blockquote>
              <p className="text-xs text-brass-300 font-bold mt-6 uppercase tracking-wider">
                — The founding trust, {SCHOOL.name}
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                <Link to="/admissions" className="btn-primary">
                  <Award className="w-4 h-4" /> Apply for admission <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/faculty" className="btn bg-white/10 text-white border border-white/20 hover:bg-white/18">
                  <Users className="w-4 h-4" /> Meet the faculty
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
