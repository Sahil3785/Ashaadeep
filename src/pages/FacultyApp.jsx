import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Smartphone, Download, ShieldCheck, WifiOff, CheckCircle2, AlertTriangle,
  PlusCircle, Users, UserPlus, LayoutDashboard, HelpCircle, Phone, ArrowRight, Info,
} from 'lucide-react';
import { SCHOOL } from '../data/school';
import { PageHeader, Reveal, SectionHeader, Badge, Accordion, IconTile, toneFor } from '../components/UI';

/* ============================================================
   The staff app's download page.

   Deliberately staff-facing and honest: it explains the "unknown
   source" warning Android will show, because that warning scares
   people and a school app that looks suspicious does not get
   installed.
   ============================================================ */

const FEATURES = [
  { icon: LayoutDashboard, title: 'Dashboard', desc: 'Students on roll, fee collection, class strength, and who still owes fees — with a call button beside each name.' },
  { icon: PlusCircle, title: 'Enter marks', desc: 'Class, student, term, subject and the four numbers. Shows what is already recorded so you can see what is still missing.' },
  { icon: Users, title: 'Student register', desc: 'Search and filter the whole register. Tap a student to call the guardian, change their fee status, edit or remove them.' },
  { icon: UserPlus, title: 'Enrol students', desc: 'Add a new student in under a minute. Duplicate roll numbers in the same class are rejected automatically.' },
  { icon: WifiOff, title: 'Works offline', desc: 'Lost signal mid-period? Keep entering marks. Everything uploads by itself the moment the connection comes back.' },
  { icon: ShieldCheck, title: 'Your own login', desc: 'Each teacher has their own email and password. No shared PIN, and the record shows who entered what.' },
];

const STEPS = [
  { n: 1, title: 'Download the file', body: 'Tap the download button on this page from your Android phone. The file is about 4 MB and takes a few seconds on any connection.' },
  { n: 2, title: 'Open it', body: 'Pull down the notification shade and tap the downloaded file, or find it in your Files app under Downloads.' },
  { n: 3, title: 'Allow the install', body: 'Android will warn that the app is not from the Play Store. Tap Settings, switch on "Allow from this source", then press back and tap Install. This warning appears for every app installed outside the Play Store.' },
  { n: 4, title: 'Sign in', body: 'Open Asha Deep Faculty and sign in with the email and password the school gave you. You stay signed in afterwards.' },
];

const FAQS = [
  { q: 'Why does Android say the app is unsafe?', a: 'Because it is being installed from the school website instead of the Play Store, Android cannot verify it automatically, so it shows a standard caution. The file is built and hosted by the school. If you would rather wait, the app will also be published on the Play Store later.' },
  { q: 'Will it work on my phone?', a: 'It runs on Android 5.1 and newer, which covers essentially every phone still in use. It is not available for iPhone — iPhone users can sign in to the faculty dashboard on this website instead, which does exactly the same things.' },
  { q: 'Does it use a lot of data?', a: 'Very little. It downloads the register once when you sign in and then sends only the changes you make. Entering a full class of marks uses a few kilobytes.' },
  { q: 'What happens if I have no signal?', a: 'Keep working. The app saves everything on your phone and uploads it automatically when the signal returns. A bar at the top tells you when something is still waiting to upload.' },
  { q: 'I forgot my password.', a: 'Ask the principal to reset it for you. Accounts are created and managed by the school, so there is no self-service reset — this is deliberate, because the app holds student records.' },
  { q: 'Can parents use this app?', a: 'No. It is only for teaching staff, and it will not open without a staff account. Parents should use this website, where results and fee payment are open to everyone.' },
];

export default function FacultyAppPage() {
  const [info, setInfo] = useState(null);

  // The build writes app-info.json beside the APK, so the version shown here
  // updates with the file instead of being hard-coded into the page.
  useEffect(() => {
    fetch('/downloads/app-info.json')
      .then(r => (r.ok ? r.json() : null))
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  const version = info?.version || '1.0.0';
  const size = info?.sizeMB ? `${info.sizeMB} MB` : '≈4 MB';
  const href = info?.file || '/downloads/AshaDeepFaculty.apk';

  return (
    <>
      <PageHeader
        icon={Smartphone}
        eyebrow="For teaching staff"
        title="The Asha Deep Faculty app"
        lead="An Android app for teachers — enter marks, enrol students and manage the register from your phone, even where the signal is poor. Parents do not need this; results and fees are open to everyone on this website."
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="garden" icon={ShieldCheck}>Staff accounts only</Badge>
          <Badge tone="brass" icon={WifiOff}>Works offline</Badge>
          <Badge tone="ink">Android {info?.minAndroid || '5.1'}+</Badge>
        </div>
      </PageHeader>

      <div className="max-w-5xl mx-auto px-4 pb-20">

        {/* ---------- Download card ---------- */}
        <Reveal>
          <div className="panel-brass p-7 sm:p-9">
            <div className="relative grid grid-cols-1 sm:grid-cols-12 gap-7 items-center">
              <div className="sm:col-span-8">
                <h2 className="font-display text-2xl font-extrabold text-ink-950">
                  Download version {version}
                </h2>
                <p className="lead text-sm mt-2.5">
                  For Android phones and tablets. Released {info?.releasedOn
                    ? new Date(info.releasedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'October 2026'} · {size}
                </p>

                <div className="flex flex-wrap gap-3 mt-6">
                  <a href={href} download className="btn-primary">
                    <Download className="w-4 h-4" /> Download the app
                  </a>
                  <a href="#how-to-install" className="btn-ghost">
                    How to install <ArrowRight className="w-4 h-4" />
                  </a>
                </div>

                <p className="text-[11px] text-ink-faint mt-4 leading-relaxed max-w-md">
                  Android will warn you that this file is not from the Play Store. That is
                  expected for an app installed directly from a website — step 3 below
                  explains exactly what to tap.
                </p>
              </div>

              {/* phone mock */}
              <div className="sm:col-span-4 flex justify-center">
                <div className="relative w-36 h-64 rounded-[1.75rem] bg-ink-950 p-2 shadow-float">
                  <div className="w-full h-full rounded-[1.4rem] bg-gradient-to-b from-ink-900 to-ink-950 flex flex-col items-center justify-center gap-2">
                    <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brass-400 to-brass-600 flex items-center justify-center shadow-brass">
                      <Smartphone className="w-6 h-6 text-ink-950" strokeWidth={2.3} />
                    </span>
                    <p className="text-[9px] font-extrabold tracking-[.2em] text-brass-400">FACULTY APP</p>
                    <p className="text-[10px] font-bold text-white px-3 text-center leading-tight">
                      Asha Deep Adarsh
                    </p>
                  </div>
                  {/* speaker notch */}
                  <span className="absolute top-3.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-ink-700" />
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ---------- What it does ---------- */}
        <section className="pt-14">
          <SectionHeader
            eyebrow="What is inside" icon={LayoutDashboard}
            title="What the app lets you do"
            lead="Everything in the faculty dashboard, laid out for one thumb."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={i * 70}>
                  <article className="card-lift p-6 h-full group">
                    <IconTile icon={Icon} tone={toneFor(i)} className="mb-4" />
                    <h3 className="font-display text-[15px] font-extrabold text-ink-950">{f.title}</h3>
                    <p className="text-[13px] text-ink-soft mt-2 leading-relaxed">{f.desc}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ---------- Install steps ---------- */}
        <section className="pt-14" id="how-to-install">
          <SectionHeader
            eyebrow="Installing it" icon={Download}
            title="Four steps on your phone"
            lead="Do this on the Android phone itself, not on a computer."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <article className="card-lift p-6 h-full flex gap-4">
                  <span className="shrink-0 w-10 h-10 rounded-2xl bg-brass-400 text-ink-950 font-display text-lg font-extrabold flex items-center justify-center">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-display text-[15px] font-extrabold text-ink-950">{s.title}</h3>
                    <p className="text-[13px] text-ink-soft mt-1.5 leading-relaxed">{s.body}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="card p-5 mt-5 flex gap-3.5 border-garden-200 bg-garden-50/60">
              <CheckCircle2 className="w-5 h-5 text-garden-600 shrink-0 mt-0.5" />
              <p className="text-[13px] text-ink-700 leading-relaxed">
                <strong className="text-ink-950">Prefer not to install anything?</strong> You can do
                exactly the same work in a browser — open the faculty dashboard on this website and
                sign in with the same email and password. The app simply makes it quicker on a phone,
                and keeps working without a signal.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ---------- Questions ---------- */}
        <section className="pt-14">
          <SectionHeader
            eyebrow="Questions" icon={HelpCircle}
            title="Things staff usually ask"
          />
          <Accordion items={FAQS} allowMultiple />
        </section>

        {/* ---------- Help ---------- */}
        <Reveal>
          <div className="card p-6 mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3.5">
              <Info className="w-5 h-5 text-brass-600 shrink-0" />
              <p className="text-[13px] text-ink-soft leading-relaxed">
                Stuck installing it, or need an account created? Ask at the school office
                and someone will set it up with you.
              </p>
            </div>
            <a href={`tel:${SCHOOL.phoneRaw}`} className="btn-ink text-xs shrink-0">
              <Phone className="w-4 h-4" /> {SCHOOL.phone}
            </a>
          </div>
        </Reveal>
      </div>
    </>
  );
}
