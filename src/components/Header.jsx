import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap, Home, FileSpreadsheet, CreditCard, BookOpen, Images, Users,
  Phone, Menu, X, Lock, Unlock, Clock, MapPin, ChevronRight, Award, Smartphone,
  CalendarDays, Info, HelpCircle, Trophy, LogOut, ShieldCheck, Megaphone,
} from 'lucide-react';
import { SCHOOL } from '../data/school';
import { useSchool } from '../context/SchoolContext';
import { useScrollLock, useScrollProgress } from '../hooks';

/* ============================================================
   Navigation map. `group` controls whether an item sits in the
   main desktop bar or only in the "More" dropdown / mobile menu.
   ============================================================ */
export const NAV_PRIMARY = [
  { to: '/',          label: 'Home',       icon: Home },
  { to: '/results',   label: 'Results',    icon: FileSpreadsheet },
  { to: '/fees',      label: 'Pay Fees',   icon: CreditCard, accent: 'garden' },
  { to: '/academics', label: 'Academics',  icon: BookOpen },
  { to: '/admissions',label: 'Admissions', icon: Award },
  // Teachers were having to hunt for this inside the More menu, so it now sits
  // in the main bar with its own accent. Labelled "Staff App" so parents can
  // tell at a glance that it is not something they need.
  { to: '/app',       label: 'Staff App',  icon: Smartphone, accent: 'plum' },
];

export const NAV_MORE = [
  { to: '/about',        label: 'About the School', icon: Info,         desc: 'Our story, mission and milestones' },
  { to: '/faculty',      label: 'Our Faculty',      icon: Users,        desc: 'Meet the teachers who run the classrooms' },
  { to: '/gallery',      label: 'Campus Gallery',   icon: Images,       desc: 'Classrooms, labs, library and sports' },
  { to: '/notices',      label: 'Notices & Events',  icon: Megaphone,   desc: 'Circulars, datesheets and the calendar' },
  { to: '/achievements', label: 'Achievements',     icon: Trophy,       desc: 'Results, sports and recognitions' },
  { to: '/syllabus',     label: 'Syllabus',         icon: BookOpen,     desc: 'Chapter-wise NCERT blueprint per class' },
  { to: '/faq',          label: 'Questions (FAQ)',  icon: HelpCircle,   desc: 'Admission, transport and fee answers' },
  { to: '/contact',      label: 'Contact & Visit',  icon: Phone,        desc: 'Phone, email, timings and directions' },
];

export default function Header() {
  const { isTeacher, setPinModalOpen, signOutTeacher } = useSchool();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [clock, setClock] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const progress = useScrollProgress();

  useScrollLock(drawerOpen);

  // Live IST clock in the credential ribbon.
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    }));
    tick();
    const id = setInterval(tick, 1000 * 30);
    return () => clearInterval(id);
  }, []);

  // Condense the header once the user scrolls past the ribbon.
  //
  // Collapsing the ribbon shortens the sticky header by ~45px, and the
  // browser's scroll anchoring shifts scrollY by the same amount. With a
  // single threshold that shift crosses it straight back, the ribbon
  // re-opens, and the header flickers in a loop. Two thresholds further
  // apart than the ribbon's height (hysteresis) break that loop.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(prev => (prev ? y > 8 : y > 80));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close every overlay on navigation.
  useEffect(() => { setDrawerOpen(false); setMoreOpen(false); }, [location.pathname]);

  // Close the More dropdown on an outside click.
  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e) => { if (!e.target.closest('[data-more-menu]')) setMoreOpen(false); };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [moreOpen]);

  const ACCENTS = {
    garden: 'text-garden-700 hover:bg-garden-50',
    plum: 'text-plum-700 hover:bg-plum-50',
  };

  const linkClass = ({ isActive }, accent) =>
    `relative px-3 py-2 rounded-2xl text-[13px] font-bold flex items-center gap-1.5 transition-all duration-300 ${
      isActive
        ? 'bg-ink-950 text-brass-300 shadow-lift'
        : ACCENTS[accent] || 'text-ink-700 hover:text-ink-950 hover:bg-ink-900/[.05]'
    }`;

  return (
    <>
      {/* ---------- Reading progress bar ---------- */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[70] bg-transparent pointer-events-none no-print">
        <div className="h-full bg-gradient-to-r from-brass-400 via-brass-500 to-garden-500 transition-[width] duration-150"
             style={{ width: `${progress * 100}%` }} />
      </div>

      <header className="sticky top-0 z-[60] no-print">
        {/* ---------- Credential ribbon ---------- */}
        <div className={`overflow-hidden transition-all duration-500 ease-out bg-ink-950 text-ink-200 ${scrolled ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100'}`}>
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 text-[11px]">
            <div className="flex items-center gap-2.5 min-w-0">
              <ShieldCheck className="w-3.5 h-3.5 text-brass-400 shrink-0" />
              <span className="font-semibold text-brass-300 truncate">{SCHOOL.affiliation}</span>
              <span className="hidden md:inline text-ink-500">·</span>
              <span className="hidden md:inline text-ink-300">School Code {SCHOOL.schoolCode}</span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <a href={`tel:${SCHOOL.phoneRaw}`} className="hidden sm:flex items-center gap-1.5 text-ink-200 hover:text-brass-300 transition-colors">
                <Phone className="w-3 h-3 text-garden-400" />
                <span className="font-semibold">{SCHOOL.phone}</span>
              </a>
              <span className="hidden lg:flex items-center gap-1.5 text-ink-300">
                <MapPin className="w-3 h-3 text-brass-400" /> {SCHOOL.village}, {SCHOOL.district}
              </span>
              <span className="flex items-center gap-1.5 font-bold text-brass-300 tabular-nums">
                <Clock className="w-3 h-3" /> {clock}
              </span>
            </div>
          </div>
        </div>

        {/* ---------- Main navigation bar ---------- */}
        <div className={`backdrop-blur-xl border-b transition-all duration-300 ${
          scrolled ? 'bg-white/88 border-ink-900/10 shadow-soft' : 'bg-white/72 border-ink-900/[.06]'
        }`}>
          <div className="max-w-7xl mx-auto px-4">
            <div className={`flex items-center justify-between gap-4 transition-all duration-300 ${scrolled ? 'py-2.5' : 'py-3.5'}`}>

              {/* ---- Crest + wordmark ---- */}
              <button onClick={() => navigate('/')} className="flex items-center gap-3 group text-left shrink-0">
                <span className={`relative rounded-2xl bg-gradient-to-br from-brass-400 via-brass-500 to-brass-600 p-[2px] shadow-brass transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 ${scrolled ? 'w-10 h-10' : 'w-11 h-11'}`}>
                  <span className="w-full h-full rounded-[14px] bg-ink-950 flex items-center justify-center">
                    <GraduationCap className="w-5.5 h-5.5 text-brass-400" strokeWidth={2.3} />
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-display font-extrabold tracking-tight text-ink-950 leading-none text-[15px] sm:text-base">
                      ASHA DEEP ADARSH
                    </span>
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-brass-100 border border-brass-300/70 text-[9px] font-extrabold text-brass-800 tracking-wide">
                      HIGH SCHOOL
                    </span>
                  </span>
                  <span className="block text-[10px] font-semibold text-ink-faint tracking-[.1em] mt-0.5">
                    KARHANS · PANIPAT · EST. {SCHOOL.established}
                  </span>
                </span>
              </button>

              {/* ---- Desktop links ---- */}
              <nav className="hidden xl:flex items-center gap-0.5" aria-label="Main navigation">
                {NAV_PRIMARY.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to} end={item.to === '/'}
                             className={(s) => linkClass(s, item.accent)}>
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </NavLink>
                  );
                })}

                {/* "More" dropdown holding the secondary pages */}
                <div className="relative" data-more-menu>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMoreOpen(o => !o); }}
                    aria-expanded={moreOpen}
                    className={`px-3.5 py-2 rounded-2xl text-[13px] font-bold flex items-center gap-1.5 transition-all ${
                      moreOpen || NAV_MORE.some(m => m.to === location.pathname)
                        ? 'bg-ink-950 text-brass-300 shadow-lift'
                        : 'text-ink-700 hover:bg-ink-900/[.05]'
                    }`}
                  >
                    More
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${moreOpen ? 'rotate-90' : ''}`} />
                  </button>

                  {moreOpen && (
                    <div className="absolute right-0 mt-2 w-[26rem] p-2 rounded-3xl bg-white shadow-float border border-ink-900/10 animate-slide-down">
                      <div className="grid grid-cols-1 gap-0.5">
                        {NAV_MORE.map(item => {
                          const Icon = item.icon;
                          return (
                            <NavLink key={item.to} to={item.to}
                              className={({ isActive }) => `flex items-start gap-3 p-2.5 rounded-2xl transition-colors ${
                                isActive ? 'bg-brass-50 ring-1 ring-brass-200' : 'hover:bg-ink-50'
                              }`}>
                              <span className="w-8 h-8 shrink-0 rounded-xl bg-ink-950 text-brass-400 flex items-center justify-center">
                                <Icon className="w-4 h-4" />
                              </span>
                              <span>
                                <span className="block text-[13px] font-bold text-ink-950">{item.label}</span>
                                <span className="block text-[11px] text-ink-faint leading-snug">{item.desc}</span>
                              </span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </nav>

              {/* ---- Faculty button + mobile toggle ---- */}
              <div className="flex items-center gap-2 shrink-0">
                {isTeacher ? (
                  <div className="hidden sm:flex items-center gap-1.5">
                    <NavLink to="/faculty-dashboard"
                             className="px-3 py-2 rounded-2xl bg-garden-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lift hover:bg-garden-600 transition-colors">
                      <Unlock className="w-3.5 h-3.5" /> Dashboard
                    </NavLink>
                    <button onClick={signOutTeacher} title="Sign out of the faculty dashboard"
                            className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center hover:bg-rose-100 transition-colors">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setPinModalOpen(true)}
                          title="Faculty sign in (Shift + T)"
                          className="hidden sm:flex px-3.5 py-2 rounded-2xl bg-ink-950 text-brass-300 text-xs font-bold items-center gap-1.5 shadow-lift hover:bg-ink-800 transition-colors">
                    <Lock className="w-3.5 h-3.5" /> Faculty
                  </button>
                )}

                <button
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open navigation menu"
                  className="xl:hidden w-10 h-10 rounded-2xl bg-ink-950 text-white flex items-center justify-center shadow-lift active:scale-95 transition-transform"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Mobile drawer ---------- */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

/* ============================================================
   MobileDrawer — a full-height sliding panel listing every page,
   with the faculty action pinned to the bottom.
   ============================================================ */
function MobileDrawer({ open, onClose }) {
  const { isTeacher, setPinModalOpen, signOutTeacher } = useSchool();
  const navigate = useNavigate();
  const panelRef = useRef(null);

  // `inert` takes the whole closed panel out of the tab order and the
  // accessibility tree, which a CSS translate alone does not do.
  useEffect(() => {
    const el = panelRef.current;
    if (el) el.inert = !open;
  }, [open]);

  return (
    <div className={`fixed inset-0 z-[75] xl:hidden no-print overflow-hidden ${open ? '' : 'pointer-events-none'}`}>
      {/* backdrop */}
      <div onClick={onClose}
           className={`absolute inset-0 bg-ink-950/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />

      {/* panel */}
      <aside
        ref={panelRef}
        role="dialog" aria-modal="true" aria-label="Navigation menu"
        aria-hidden={!open}
        className={`absolute top-0 right-0 h-full w-[88%] max-w-sm bg-white shadow-float flex flex-col transition-transform duration-400 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ transitionTimingFunction: 'cubic-bezier(.22,1,.36,1)' }}
      >
        {/* drawer header */}
        <div className="flex items-center justify-between gap-3 p-5 border-b border-ink-900/8 bg-ink-950 text-white">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-brass-400 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-ink-950" strokeWidth={2.4} />
            </span>
            <div>
              <p className="font-display text-sm font-extrabold leading-tight">ASHA DEEP ADARSH</p>
              <p className="text-[10px] text-brass-300 font-semibold tracking-wider">KARHANS · PANIPAT</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close menu"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <p className="px-2 pt-1 pb-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-ink-faint">Main</p>
          {NAV_PRIMARY.map((item, i) => <DrawerLink key={item.to} item={item} index={i} open={open} />)}

          <p className="px-2 pt-5 pb-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-ink-faint">Explore</p>
          {NAV_MORE.map((item, i) => <DrawerLink key={item.to} item={item} index={i + NAV_PRIMARY.length} open={open} />)}
        </nav>

        {/* faculty action */}
        <div className="p-4 border-t border-ink-900/8 bg-parchment-100">
          {isTeacher ? (
            <div className="space-y-2">
              <button onClick={() => { navigate('/faculty-dashboard'); onClose(); }} className="btn-garden w-full">
                <Unlock className="w-4 h-4" /> Open Faculty Dashboard
              </button>
              <button onClick={() => { signOutTeacher(); onClose(); }} className="btn-danger w-full">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          ) : (
            <button onClick={() => { setPinModalOpen(true); onClose(); }} className="btn-ink w-full">
              <Lock className="w-4 h-4" /> Faculty Sign In
            </button>
          )}
          <a href={`tel:${SCHOOL.phoneRaw}`} className="btn-ghost w-full mt-2">
            <Phone className="w-4 h-4 text-garden-600" /> {SCHOOL.phone}
          </a>
        </div>
      </aside>
    </div>
  );
}

/* One row in the drawer, sliding in with a stagger. */
function DrawerLink({ item, index, open }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      style={{ transitionDelay: open ? `${60 + index * 28}ms` : '0ms' }}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${open ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'} ${
          isActive ? 'bg-ink-950 text-brass-300 shadow-lift' : 'text-ink-700 hover:bg-ink-50'
        }`
      }
    >
      <Icon className="w-4.5 h-4.5 shrink-0" />
      <span className="flex-1">{item.label}</span>
      <ChevronRight className="w-4 h-4 opacity-40" />
    </NavLink>
  );
}
