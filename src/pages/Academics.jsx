import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, GraduationCap, Baby, Blocks, Library, FlaskConical, Monitor,
  Palette, Trophy, ArrowRight, CheckCircle2, Clock, Users, FileText, Languages,
} from 'lucide-react';
import { SCHOOL } from '../data/school';
import { PageHeader, Reveal, SectionHeader, Badge, IconTile, toneFor } from '../components/UI';

const STAGES = [
  {
    icon: Baby, tone: 'brass', name: 'Pre-Primary', classes: 'PP1 – PP2', ages: '3½ to 5½ years',
    summary: 'Play-led, not worksheet-led. The first two years are about speech, confidence and pencil control, not marks.',
    points: [
      'Phonics-based English with sound recognition before spelling',
      'Hindi varnmala through rhyme and repetition',
      'Numbers to 50, shapes, colours and sorting',
      'Soft-floor activity room with story corner and blocks',
      'No written examinations — graded on observed activity',
      'One class teacher plus one helper per section',
    ],
  },
  {
    icon: Blocks, tone: 'garden', name: 'Primary', classes: 'Class 1 – 5', ages: '5½ to 11 years',
    summary: 'Where reading becomes fluent and arithmetic becomes automatic. We would rather a child read well in two languages than finish a thick syllabus badly.',
    points: [
      'NCERT Marigold, Rimjhim and Math-Magic series',
      'Environmental Studies replaces separate Science and Social Science',
      'Daily reading period in the library from Class 3',
      'Computer basics — typing, Paint and internet safety',
      'Four assessments a year, two unit tests and two terms',
      'Interactive panels in all Class 3–5 rooms',
    ],
  },
  {
    icon: Library, tone: 'ink', name: 'Middle School', classes: 'Class 6 – 8', ages: '11 to 14 years',
    summary: 'Subjects split apart and get subject teachers. This is the stage where we catch the gaps that would otherwise surface in Class 10.',
    points: [
      'Separate Physics, Chemistry and Biology teaching within Science',
      'History, Geography and Civics taught by subject specialists',
      'Laboratory work begins — students run the experiments themselves',
      'Sanskrit introduced as a third language',
      'Weekly remedial period for anyone falling behind',
      'Project work and the annual science exhibition',
    ],
  },
  {
    icon: GraduationCap, tone: 'brass', name: 'High School', classes: 'Class 9 – 10', ages: '14 to 16 years',
    summary: 'Board preparation without turning school into a coaching centre. Mathematics is offered at both Standard and Basic level so a student picks what fits.',
    points: [
      'Full HBSE board syllabus with past-paper practice from Class 9',
      'Mathematics Standard or Basic — chosen in Class 9, confirmed in Class 10',
      'Information Technology (IT-402) as a vocational subject',
      'Pre-board examination in January under board conditions',
      'Extra morning classes for Class 10 from November, at no charge',
      'Career guidance sessions on streams after Class 10',
    ],
  },
];

const SUPPORT = [
  { icon: FlaskConical, title: 'Laboratory work', desc: 'Physics, Chemistry, Biology and Computer labs. Experiments are performed by students from Class 6, not demonstrated to them.' },
  { icon: Monitor, title: 'Smart classrooms', desc: 'Interactive flat panels in every Class 3–10 room, running NCERT-mapped animated content alongside the textbook.' },
  { icon: Library, title: 'Library period', desc: 'A timetabled library period from Class 3 upward. 5,000+ volumes in Hindi and English, plus competitive-exam material.' },
  { icon: Languages, title: 'Bilingual support', desc: 'English is the medium, but teachers explain in Hindi wherever a concept needs it. No child is held back by language alone.' },
  { icon: Clock, title: 'Remedial periods', desc: 'A weekly slot for students who have fallen behind in any subject, at no extra charge, arranged by the class teacher.' },
  { icon: Palette, title: 'Art, music & games', desc: 'Drawing, music and a games period are part of the timetable through Class 8 — not the first things cut when exams approach.' },
];

const TIMETABLE = [
  ['7:40 AM', 'Assembly — prayer, news headlines, announcements'],
  ['8:00 AM', 'Periods 1 and 2'],
  ['9:30 AM', 'Short break'],
  ['9:45 AM', 'Periods 3, 4 and 5'],
  ['11:45 AM', 'Lunch break — library and reading hall open'],
  ['12:15 PM', 'Periods 6 and 7'],
  ['1:30 PM', 'Games period / remedial / club activity'],
  ['1:40 PM', 'Dispersal — buses depart'],
];

export default function Academics() {
  return (
    <>
      <PageHeader
        icon={BookOpen}
        eyebrow={`Curriculum ${SCHOOL.session}`}
        title="How we teach, stage by stage"
        lead="Four stages from Pre-Primary to Class 10, all on the NCERT pattern with HBSE board examinations at the end. English is the medium of instruction, with bilingual explanation wherever a concept needs it."
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="brass" icon={FileText}>NCERT pattern</Badge>
          <Badge tone="garden" icon={Users}>28 per section</Badge>
          <Badge tone="ink" icon={Languages}>English medium, bilingual support</Badge>
        </div>
      </PageHeader>

      <div className="max-w-6xl mx-auto px-4 pb-20">

        {/* ---------- Four stages ---------- */}
        <div className="space-y-6">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const tones = {
              brass: { chip: 'bg-brass-100 text-brass-700 border-brass-200', badge: 'bg-brass-400' },
              garden: { chip: 'bg-garden-100 text-garden-700 border-garden-200', badge: 'bg-garden-500' },
              ink: { chip: 'bg-ink-100 text-ink-600 border-ink-200', badge: 'bg-ink-700' },
            };
            const t = tones[s.tone];
            return (
              <Reveal key={s.name} delay={i * 60}>
                <article className="card-lift p-7 sm:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
                    {/* left: identity */}
                    <div className="lg:col-span-4">
                      <div className={`w-13 h-13 rounded-2xl border flex items-center justify-center mb-4 ${t.chip}`}>
                        <Icon className="w-6 h-6" strokeWidth={2.2} />
                      </div>
                      <h3 className="font-display text-xl font-extrabold text-ink-950">{s.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        <span className={`chip ${t.chip}`}>{s.classes}</span>
                        <span className="chip-ink">{s.ages}</span>
                      </div>
                      <p className="text-[13px] text-ink-soft mt-3.5 leading-relaxed">{s.summary}</p>
                    </div>

                    {/* right: details */}
                    <div className="lg:col-span-8 lg:border-l lg:border-ink-900/8 lg:pl-8">
                      <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-ink-faint mb-3.5">
                        What this stage includes
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                        {s.points.map(p => (
                          <div key={p} className="flex gap-2.5 text-[13px] text-ink-700 leading-snug">
                            <CheckCircle2 className="w-4 h-4 text-garden-500 shrink-0 mt-0.5" />
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        {/* ---------- Support systems ---------- */}
        <section className="pt-16">
          <SectionHeader
            eyebrow="Beyond the textbook" icon={Trophy}
            title="What holds the teaching up"
            lead="A syllabus on paper means nothing without the rooms, time and people to deliver it."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SUPPORT.map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal key={s.title} delay={i * 70}>
                  <article className="card-lift p-6 h-full group">
                    <IconTile icon={Icon} tone={toneFor(i)} className="mb-4" />
                    <h3 className="font-display text-[15px] font-extrabold text-ink-950">{s.title}</h3>
                    <p className="text-[13px] text-ink-soft mt-2 leading-relaxed">{s.desc}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ---------- Daily timetable ---------- */}
        <section className="pt-16">
          <SectionHeader
            eyebrow="A normal day" icon={Clock}
            title="The daily timetable"
            lead={`Monday to Saturday. In peak winter the whole schedule shifts to a 9:00 AM start, announced by circular in advance.`}
          />
          <Reveal>
            <div className="panel overflow-hidden">
              {TIMETABLE.map(([time, what], i) => (
                <div key={time}
                     className={`flex items-center gap-5 px-6 py-4 ${i % 2 ? 'bg-parchment-100/60' : 'bg-transparent'} ${i < TIMETABLE.length - 1 ? 'border-b border-ink-900/6' : ''}`}>
                  <span className="shrink-0 w-20 font-mono text-[12.5px] font-extrabold text-brass-700">{time}</span>
                  <span className="w-2 h-2 rounded-full bg-brass-400 shrink-0" />
                  <span className="text-[13.5px] text-ink-800">{what}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ---------- Links out ---------- */}
        <section className="pt-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Reveal>
              <Link to="/syllabus" className="card-lift p-7 block group h-full">
                <BookOpen className="w-9 h-9 text-brass-600 mb-4" strokeWidth={2.2} />
                <h3 className="font-display text-lg font-extrabold text-ink-950">Chapter-wise syllabus</h3>
                <p className="text-[13px] text-ink-soft mt-2 leading-relaxed">
                  The full NCERT chapter list for every subject, with prescribed textbooks and paper weights,
                  for each class group.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brass-700 mt-4">
                  Open the syllabus <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1.5" />
                </span>
              </Link>
            </Reveal>

            <Reveal delay={90}>
              <Link to="/faculty" className="card-lift p-7 block group h-full">
                <Users className="w-9 h-9 text-garden-600 mb-4" strokeWidth={2.2} />
                <h3 className="font-display text-lg font-extrabold text-ink-950">The teachers</h3>
                <p className="text-[13px] text-ink-soft mt-2 leading-relaxed">
                  Who heads each department, what they teach, their qualifications and how long they have been
                  in a classroom.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-garden-700 mt-4">
                  Meet the faculty <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1.5" />
                </span>
              </Link>
            </Reveal>
          </div>
        </section>
      </div>
    </>
  );
}
