import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Search, QrCode, ArrowRight, GraduationCap, Award, TrendingUp, Users,
  MonitorPlay, FlaskConical, BookOpen, Bus, Trophy, HeartHandshake, CheckCircle2,
  Quote, CalendarDays, ChevronRight, Phone, Star, MapPin, Clock, Images, Play,
  Smartphone, Download, WifiOff, ShieldCheck,
} from 'lucide-react';
import { SCHOOL, STATS, WHY_US, GALLERY, ACHIEVEMENTS, HOUSES } from '../data/school';
import { usePublished } from '../hooks/usePublished';
import { Reveal, SectionHeader, StatTile, Badge, IconTile, toneFor } from '../components/UI';
import { SkStats, SkCardGrid } from '../components/Loaders';
import { useDelay } from '../hooks';
import { dateParts, relativeDays } from '../utils/format';

const ICONS = { Award, TrendingUp, Users, GraduationCap, MonitorPlay, FlaskConical, BookOpen, Bus, Trophy, HeartHandshake };

export default function Home() {
  // Short delay so the skeleton states are real, not decorative.
  const statsReady = useDelay(500);
  const gridReady = useDelay(800);

  return (
    <>
      <Hero />

      {/* ---------- Stats ---------- */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <SectionHeader
          eyebrow="By the numbers" icon={TrendingUp}
          title="Two decades of steady results"
          lead="Figures from the 2025-26 session, published as recorded in the school register."
        />
        {statsReady ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 80}>
                <StatTile icon={ICONS[s.icon]} value={s.value} suffix={s.suffix}
                          label={s.label} note={s.note}
                          tone={['brass', 'garden', 'ink', 'brass'][i % 4]} />
              </Reveal>
            ))}
          </div>
        ) : <SkStats />}
      </section>

      <QuickActions />

      {/* ---------- Why us ---------- */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <SectionHeader
          eyebrow="What we provide" icon={Sparkles}
          title="What a child actually gets here"
          lead="Not a list of promises — these are the facilities and practices in place on campus today."
        />
        {gridReady ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_US.map((f, i) => {
              const Icon = ICONS[f.icon];
              return (
                <Reveal key={f.title} delay={i * 70}>
                  <article className="card-lift p-6 h-full group">
                    <IconTile icon={Icon} tone={toneFor(i)} size="lg" className="mb-4" />
                    <h3 className="font-display text-base font-extrabold text-ink-950">{f.title}</h3>
                    <p className="text-[13px] text-ink-soft mt-2 leading-relaxed">{f.desc}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        ) : <SkCardGrid count={6} media={false} />}
      </section>

      <PrincipalNote />
      <GalleryPreview ready={gridReady} />
      <UpcomingEvents />
      <HousesStrip />
      <StaffAppBand />
      <Testimonials />
      <AdmissionCta />
    </>
  );
}

/* ============================================================
   HERO
   Left: headline, lead, two primary actions, trust row.
   Right: a glass "crest card" with live session info.
   ============================================================ */
function Hero() {
  const [slide, setSlide] = useState(0);
  const rotating = ['Smart classrooms', 'Four working labs', 'Capped at 28 per section', '100% board results'];

  // Rotate the highlight phrase under the headline.
  useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % rotating.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 pt-8 pb-6">
      <div className="panel-brass p-7 sm:p-11 lg:p-14">
        {/* floating decorative rings */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-brass-200/40 blur-3xl pointer-events-none animate-float-slow" />
        <div className="absolute -bottom-28 -left-20 w-80 h-80 rounded-full bg-garden-200/30 blur-3xl pointer-events-none animate-float-slow" style={{ animationDelay: '3s' }} />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

          {/* ---- Copy ---- */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-2 animate-fade-up">
              <span className="eyebrow">
                <Sparkles className="w-3.5 h-3.5" /> Admissions open · Session {SCHOOL.session}
              </span>
              <Badge tone="garden" icon={CheckCircle2}>HBSE Recognized</Badge>
            </div>

            <div className="animate-fade-up" style={{ animationDelay: '.08s' }}>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.7rem] font-extrabold tracking-tight text-ink-950 leading-[1.05]">
                A school your child can
                <br />
                <span className="relative inline-block">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-brass-500 via-brass-600 to-garden-600">
                    walk to, and thrive in.
                  </span>
                  {/* hand-drawn underline */}
                  <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none">
                    <path d="M2 8c60-5 120-6 180-3s80 4 116 1" stroke="#fbb420" strokeWidth="3.5" strokeLinecap="round" opacity=".55" />
                  </svg>
                </span>
              </h1>
            </div>

            <p className="lead max-w-xl animate-fade-up" style={{ animationDelay: '.16s' }}>
              {SCHOOL.name} has taught the children of {SCHOOL.village} since {SCHOOL.established} —
              Pre-Primary through Class 10, on the NCERT pattern, in English medium with bilingual support.
              Families here no longer have to send a ten-year-old into Panipat city for a real education.
            </p>

            {/* rotating highlight */}
            <div className="flex items-center gap-2.5 min-h-7 animate-fade-up" style={{ animationDelay: '.22s' }}>
              <span className="text-xs font-bold text-ink-faint uppercase tracking-wider whitespace-nowrap shrink-0">Known for</span>
              {/* inline-block, not inline — an inline element ignores width/height/overflow,
                  which would let the absolutely-positioned items spill onto the text above. */}
              <span className="relative inline-block flex-1 min-w-0 h-7 overflow-hidden align-middle">
                {rotating.map((r, i) => (
                  <span key={r}
                        className="absolute inset-0 flex items-center text-sm font-extrabold text-brass-700 transition-all duration-500"
                        style={{
                          opacity: slide === i ? 1 : 0,
                          transform: `translateY(${(i - slide) * 100}%)`,
                        }}>
                    {r}
                  </span>
                ))}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 pt-1 animate-fade-up" style={{ animationDelay: '.3s' }}>
              <Link to="/results" className="btn-primary group">
                <Search className="w-4 h-4" /> Check Result
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/fees" className="btn-garden group">
                <QrCode className="w-4 h-4" /> Pay Fees via UPI
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/admissions" className="btn-ghost">
                <Award className="w-4 h-4 text-brass-600" /> Apply for Admission
              </Link>
            </div>

            {/* trust row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 pt-3 text-xs text-ink-soft animate-fade-up" style={{ animationDelay: '.38s' }}>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-garden-600" /> {SCHOOL.schoolHours}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-brass-600" /> G.T. Road, {SCHOOL.village}</span>
              <a href={`tel:${SCHOOL.phoneRaw}`} className="inline-flex items-center gap-1.5 font-bold text-ink-900 hover:text-brass-700 transition-colors">
                <Phone className="w-3.5 h-3.5 text-garden-600" /> {SCHOOL.phone}
              </a>
            </div>
          </div>

          {/* ---- Crest card ---- */}
          <div className="lg:col-span-5 animate-fade-up" style={{ animationDelay: '.24s' }}>
            <div className="relative mx-auto max-w-sm">
              {/* back layers for depth */}
              <div className="absolute inset-0 rounded-4xl bg-ink-950/5 rotate-3 scale-[.97]" />
              <div className="absolute inset-0 rounded-4xl bg-brass-200/35 -rotate-2 scale-[.98]" />

              <div className="relative rounded-4xl bg-white border border-ink-900/8 shadow-float overflow-hidden">
                {/* navy crown */}
                <div className="relative bg-ink-950 px-6 pt-7 pb-14 text-center overflow-hidden">
                  <div className="absolute inset-0 opacity-[.07]"
                       style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '18px 18px' }} />
                  <div className="relative">
                    <span className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-br from-brass-400 to-brass-600 items-center justify-center shadow-brass mb-3.5">
                      <GraduationCap className="w-8 h-8 text-ink-950" strokeWidth={2.3} />
                    </span>
                    <p className="font-display text-lg font-extrabold text-white leading-tight">ASHA DEEP ADARSH</p>
                    <p className="text-[11px] font-bold text-brass-300 tracking-[.14em] mt-1">HIGH SCHOOL · KARHANS</p>
                    <p className="font-serif italic text-xs text-ink-300 mt-2.5">"{SCHOOL.tagline}"</p>
                  </div>
                </div>

                {/* overlapping session chip */}
                <div className="relative -mt-7 mx-5 rounded-2xl bg-white shadow-lift border border-ink-900/8 p-3.5 text-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-ink-faint">Academic session</p>
                  <p className="font-display text-xl font-extrabold text-ink-950 mt-0.5">{SCHOOL.session}</p>
                </div>

                {/* facts grid */}
                <div className="grid grid-cols-2 gap-2.5 p-5 pt-4">
                  {[
                    { k: 'Classes', v: 'PP1 – 10', tone: 'brass' },
                    { k: 'Medium', v: 'English', tone: 'garden' },
                    { k: 'Per section', v: 'Max 28', tone: 'ink' },
                    { k: 'Board result', v: '100% pass', tone: 'garden' },
                  ].map(f => (
                    <div key={f.k} className="rounded-2xl bg-parchment-100 border border-ink-900/6 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{f.k}</p>
                      <p className="text-sm font-extrabold text-ink-950 mt-0.5">{f.v}</p>
                    </div>
                  ))}
                </div>

                {/* affiliation strip */}
                <div className="px-5 pb-5">
                  <div className="rounded-2xl bg-garden-50 border border-garden-200 p-3 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-garden-600 shrink-0" />
                    <p className="text-[11px] font-semibold text-garden-900 leading-snug">
                      Recognized by HBSE · Code {SCHOOL.schoolCode}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   QuickActions — the three things parents come here to do.
   ============================================================ */
function QuickActions() {
  const actions = [
    { to: '/results', icon: Search, title: 'Check a result', body: 'Enter the roll number and name to open the marksheet, then print or save it as a PDF.', cta: 'Open results', tone: 'brass' },
    { to: '/fees', icon: QrCode, title: 'Pay the school fee', body: 'Generate a UPI QR for the exact amount, pay from any app, and get a receipt instantly.', cta: 'Pay now', tone: 'garden' },
    { to: '/admissions', icon: Award, title: 'Apply for admission', body: 'Fill the enquiry form and an admissions counsellor will call you within one working day.', cta: 'Start application', tone: 'plum' },
  ];

  const tones = {
    brass: { ring: 'hover:border-brass-400', badge: 'bg-brass-100 text-brass-700 border-brass-200', btn: 'text-brass-700' },
    garden: { ring: 'hover:border-garden-400', badge: 'bg-garden-100 text-garden-700 border-garden-200', btn: 'text-garden-700' },
    plum: { ring: 'hover:border-plum-400', badge: 'bg-plum-100 text-plum-700 border-plum-200', btn: 'text-plum-700' },
  };

  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {actions.map((a, i) => {
          const Icon = a.icon;
          const t = tones[a.tone];
          return (
            <Reveal key={a.to} delay={i * 90}>
              <Link to={a.to}
                    className={`card-lift p-6 h-full flex flex-col group ${t.ring}`}>
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 ${t.badge}`}>
                  <Icon className="w-5.5 h-5.5" strokeWidth={2.2} />
                </div>
                <h3 className="font-display text-lg font-extrabold text-ink-950">{a.title}</h3>
                <p className="text-[13px] text-ink-soft mt-2 leading-relaxed flex-1">{a.body}</p>
                <span className={`mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold ${t.btn}`}>
                  {a.cta}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1.5" />
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================
   PrincipalNote — a signed message, which is the one piece of a
   school site parents genuinely read.
   ============================================================ */
function PrincipalNote() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-14">
      <Reveal>
        <div className="panel p-7 sm:p-11 grid grid-cols-1 lg:grid-cols-12 gap-9 items-center">
          {/* portrait placeholder — initials medallion */}
          <div className="lg:col-span-4 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-brass-200 to-garden-200 blur-xl opacity-60" />
              <div className="relative w-40 h-40 rounded-full bg-ink-950 flex items-center justify-center shadow-float">
                <span className="font-display text-5xl font-extrabold text-brass-400">SM</span>
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 chip-brass whitespace-nowrap shadow-soft">
                Principal
              </span>
            </div>
          </div>

          <div className="lg:col-span-8">
            <Quote className="w-9 h-9 text-brass-300 mb-3" strokeWidth={2.4} />
            <blockquote className="font-serif text-lg sm:text-xl text-ink-900 leading-relaxed italic">
              When we opened in 2003 we had forty-six children and three rooms. What has not changed in
              twenty-three years is the thing that mattered then: a teacher should know, by name, which child
              stopped understanding and on which day. Buildings and panels came later. That habit came first.
            </blockquote>
            <div className="mt-5 pt-5 border-t border-ink-900/8">
              <p className="font-display text-base font-extrabold text-ink-950">Mr. Satbir Singh Malik</p>
              <p className="text-xs text-ink-soft mt-0.5">Principal · M.Sc. (Mathematics), M.Ed. · 26 years in teaching</p>
            </div>
            <Link to="/about" className="btn-ghost mt-5 text-xs">
              Read the school's story <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================================
   GalleryPreview — six tiles linking through to the full gallery.
   ============================================================ */
function GalleryPreview({ ready }) {
  return (
    <section className="max-w-7xl mx-auto px-4 py-14">
      <SectionHeader
        eyebrow="Campus" icon={Images}
        title="A look around the school"
        lead="Classrooms, laboratories, the library and the sports ground — photographed on campus."
      />
      {ready ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {GALLERY.slice(0, 6).map((g, i) => (
              <Reveal key={g.id} delay={i * 70} dir="zoom">
                <Link to="/gallery" className="block relative rounded-3xl overflow-hidden group shadow-soft hover:shadow-float transition-shadow duration-300">
                  <img src={g.image} alt={g.title} loading="lazy"
                       className="w-full h-44 sm:h-52 object-cover transition-transform duration-700 group-hover:scale-110" />
                  {/* gradient scrim so the caption stays legible on any photo */}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/15 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="text-[9.5px] font-extrabold uppercase tracking-[.14em] text-brass-300">{g.category}</span>
                    <p className="text-sm font-extrabold text-white leading-tight mt-0.5">{g.title}</p>
                  </div>
                  <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/18 backdrop-blur-md border border-white/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
          <div className="flex justify-center mt-8">
            <Link to="/gallery" className="btn-ink">
              <Images className="w-4 h-4" /> See the full gallery
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      ) : <SkCardGrid count={6} cols="grid-cols-2 lg:grid-cols-3" />}
    </section>
  );
}

/* ============================================================
   UpcomingEvents — the next four dated entries from the calendar.
   ============================================================ */
function UpcomingEvents() {
  const { events } = usePublished();
  const upcoming = events.slice(0, 4);

  return (
    <section className="max-w-7xl mx-auto px-4 py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-9">
        <div className="lg:col-span-4">
          <SectionHeader align="left"
            eyebrow="School calendar" icon={CalendarDays}
            title="What's coming up"
            lead="Examinations, cultural days and the sports meet for this session."
          />
          <Link to="/notices" className="btn-ghost text-xs">
            Full calendar &amp; notices <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="lg:col-span-8 space-y-3.5">
          {upcoming.map((e, i) => {
            const d = dateParts(e.date);
            return (
              <Reveal key={e.id} delay={i * 80} dir="right">
                <article className="card-lift p-4 flex items-center gap-4 group">
                  {/* calendar block */}
                  <div className="shrink-0 w-14 rounded-2xl bg-ink-950 text-center py-2 shadow-lift">
                    <p className="text-[9.5px] font-extrabold text-brass-400 tracking-wider">{d.month}</p>
                    <p className="font-display text-xl font-extrabold text-white leading-none mt-0.5">{d.day}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-[15px] font-extrabold text-ink-950">{e.title}</h3>
                      <Badge tone={e.type === 'Examination' ? 'rose' : e.type === 'Sports' ? 'garden' : 'brass'}>{e.type}</Badge>
                    </div>
                    <p className="text-xs text-ink-soft mt-1 leading-snug">{e.desc}</p>
                  </div>
                  <span className="shrink-0 hidden sm:block text-[11px] font-bold text-ink-faint whitespace-nowrap">
                    {relativeDays(e.date)}
                  </span>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   HousesStrip — the four school houses.
   ============================================================ */
function HousesStrip() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-14">
      <SectionHeader
        eyebrow="House system" icon={Trophy}
        title="Four houses, one ground"
        lead="Every student joins a house on admission and keeps it until Class 10. Houses compete across sports, quizzes and the annual cultural day."
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {HOUSES.map((h, i) => (
          <Reveal key={h.name} delay={i * 80} dir="zoom">
            <div className="card-lift p-6 text-center relative overflow-hidden group">
              {/* house colour wash */}
              <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: h.color }} />
              <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-20 transition-opacity duration-300 group-hover:opacity-35"
                   style={{ background: h.color }} />
              <div className="relative">
                <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-lift mb-3.5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
                     style={{ background: h.color }}>
                  <Trophy className="w-6.5 h-6.5 text-white" strokeWidth={2.2} />
                </div>
                <h3 className="font-display text-lg font-extrabold text-ink-950">{h.name}</h3>
                <p className="text-[11px] font-bold uppercase tracking-wider mt-0.5" style={{ color: h.color }}>{h.meaning}</p>
                <p className="font-serif italic text-xs text-ink-soft mt-2.5">"{h.motto}"</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   StaffAppBand — the teachers' app, on the home page.

   It was previously only reachable through the "More" dropdown,
   which meant some staff found it and some never did. It is
   clearly marked as being for teachers so parents are not left
   wondering whether they are supposed to install something.
   ============================================================ */
function StaffAppBand() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-14">
      <Reveal dir="zoom">
        <div className="relative rounded-4xl overflow-hidden border border-plum-200 shadow-float
                        bg-gradient-to-br from-plum-50 via-white to-sky-50">
          {/* soft colour wash */}
          <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-plum-200/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-28 -left-16 w-72 h-72 rounded-full bg-sky-200/40 blur-3xl pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-9 items-center p-8 sm:p-11">
            {/* copy */}
            <div className="lg:col-span-7">
              <span className="chip bg-plum-100 text-plum-800 border border-plum-300/70">
                <Smartphone className="w-3 h-3" /> For teaching staff
              </span>

              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink-950 mt-4 leading-tight">
                Teachers — the school app is ready
              </h2>
              <p className="lead text-sm mt-3 max-w-xl">
                Enter marks, enrol students and check the register from your own phone.
                It keeps working where the signal does not, and uploads everything the
                moment you are back online.
              </p>

              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5">
                {[
                  { icon: WifiOff, text: 'Works offline' },
                  { icon: ShieldCheck, text: 'Your own login' },
                  { icon: CheckCircle2, text: 'Free · 4 MB' },
                ].map(({ icon: Icon, text }) => (
                  <span key={text} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-700">
                    <Icon className="w-3.5 h-3.5 text-plum-600" /> {text}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 mt-7">
                <Link to="/app" className="btn bg-gradient-to-br from-plum-500 to-plum-700 text-white shadow-lift hover:-translate-y-0.5">
                  <Download className="w-4 h-4" /> Get the app
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/app#how-to-install" className="btn-ghost">
                  How to install it
                </Link>
              </div>

              <p className="text-[11.5px] text-ink-faint mt-4 max-w-md leading-relaxed">
                Parents do not need this — results and fee payment are open to everyone
                on this website.
              </p>
            </div>

            {/* phone */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-44 h-80 rounded-[2rem] bg-ink-950 p-2.5 shadow-float rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="w-full h-full rounded-[1.6rem] bg-gradient-to-b from-ink-900 to-ink-950 flex flex-col items-center justify-center gap-3 overflow-hidden">
                  <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brass-400 to-brass-600 flex items-center justify-center shadow-brass">
                    <GraduationCap className="w-7 h-7 text-ink-950" strokeWidth={2.3} />
                  </span>
                  <p className="text-[9px] font-extrabold tracking-[.22em] text-brass-400">FACULTY APP</p>
                  <p className="text-[11px] font-bold text-white px-4 text-center leading-tight">
                    Asha Deep Adarsh
                  </p>
                  {/* hint of the dashboard behind the splash */}
                  <div className="w-full px-4 mt-1 space-y-1.5 opacity-60">
                    {[70, 45, 60].map((w, i) => (
                      <div key={i} className="h-1.5 rounded-full bg-white/15" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                </div>
                <span className="absolute top-4 left-1/2 -translate-x-1/2 w-11 h-1 rounded-full bg-ink-700" />
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================================
   Testimonials — parent voices.
   ============================================================ */
function Testimonials() {
  const quotes = [
    { name: 'Suman Devi', role: 'Mother of a Class 8 student', text: 'My elder son travelled to Panipat every day and lost two hours on the road. My younger one walks here in ten minutes and his marks are better. That is the whole difference.' },
    { name: 'Rajesh Verma', role: 'Father of Aman, Class 10', text: 'The class teacher called me herself when Aman\'s maths slipped in UT-1. Nobody had ever done that before. By the half-yearly he was back at the top.' },
    { name: 'Kuldeep Singh', role: 'Parent, PP1 and Class 3', text: 'Paying the fee on the phone and getting the receipt at once has saved me many trips to the office. Small thing, but it matters when you work shifts.' },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 py-14">
      <SectionHeader
        eyebrow="From our families" icon={Quote}
        title="What parents tell us"
        lead="Collected at the parent–teacher meeting, published with permission."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {quotes.map((q, i) => (
          <Reveal key={q.name} delay={i * 90}>
            <figure className="card-lift p-6 h-full flex flex-col">
              <div className="flex gap-0.5 mb-3.5">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={k} className="w-3.5 h-3.5 text-brass-400 fill-brass-400" />
                ))}
              </div>
              <blockquote className="text-[13px] text-ink-700 leading-relaxed flex-1">"{q.text}"</blockquote>
              <figcaption className="mt-5 pt-4 border-t border-ink-900/8 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-ink-950 text-brass-400 flex items-center justify-center text-[11px] font-extrabold shrink-0">
                  {q.name.split(' ').map(w => w[0]).join('')}
                </span>
                <span>
                  <span className="block text-[13px] font-extrabold text-ink-950">{q.name}</span>
                  <span className="block text-[11px] text-ink-faint">{q.role}</span>
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   AdmissionCta — closing call to action.
   ============================================================ */
function AdmissionCta() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-14">
      <Reveal dir="zoom">
        <div className="relative rounded-4xl overflow-hidden bg-ink-950 p-9 sm:p-14 text-center shadow-float">
          {/* dotted texture + brass glow */}
          <div className="absolute inset-0 opacity-[.06]"
               style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '22px 22px' }} />
          <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[32rem] h-56 rounded-full bg-brass-500/22 blur-3xl" />
          <div className="absolute -bottom-24 right-0 w-72 h-56 rounded-full bg-garden-500/18 blur-3xl" />

          <div className="relative max-w-2xl mx-auto">
            <span className="chip bg-brass-400/15 text-brass-300 border border-brass-400/30">
              <Sparkles className="w-3 h-3" /> Session {SCHOOL.session} · Seats filling
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-5 leading-tight">
              Admissions are open from Pre-Primary to Class 9
            </h2>
            <p className="text-sm text-ink-300 mt-4 leading-relaxed">
              There is no entrance test below Class 6 — just a short, friendly interaction so we know where your
              child stands. Bring the birth certificate, Aadhaar and four photographs. Class 10 admissions depend
              on seat availability and a transfer certificate.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-7">
              <Link to="/admissions" className="btn-primary">
                <Award className="w-4 h-4" /> Apply online
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href={`tel:${SCHOOL.phoneRaw}`}
                 className="btn bg-white/10 text-white border border-white/20 hover:bg-white/18">
                <Phone className="w-4 h-4 text-garden-400" /> Call {SCHOOL.phone}
              </a>
              <Link to="/contact" className="btn bg-transparent text-ink-300 border border-white/15 hover:text-white hover:border-white/30">
                <MapPin className="w-4 h-4" /> Visit the campus
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
