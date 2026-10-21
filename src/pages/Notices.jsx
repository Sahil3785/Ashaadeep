import React, { useState, useMemo } from 'react';
import {
  Megaphone, CalendarDays, Search, AlertCircle, Filter, Clock,
  Bell, FileText, PartyPopper, IndianRupee, GraduationCap, Flag,
} from 'lucide-react';
import { usePublished } from '../hooks/usePublished';
import { PageHeader, Reveal, SectionHeader, Badge, Tabs } from '../components/UI';
import { EmptyState, SkCardGrid } from '../components/Loaders';
import { useDelay, useAnchorOnChange } from '../hooks';
import { longDate, dateParts, relativeDays } from '../utils/format';

const TAG_ICONS = {
  Admissions: GraduationCap, Examination: FileText, Fees: IndianRupee,
  Event: PartyPopper, PTM: Bell, Holiday: Flag,
};

const TAG_TONES = {
  Admissions: 'garden', Examination: 'rose', Fees: 'brass',
  Event: 'brass', PTM: 'ink', Holiday: 'ink',
};

export default function Notices() {
  const { notices: NOTICES, events: EVENTS } = usePublished();
  const [tab, setTab] = useState('notices');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('All');
  // First mount only — switching tabs must not reflow the page under the reader.
  const ready = useDelay(500);
  // Notices and the calendar are very different lengths — keep the tabs in view.
  const tabsRef = useAnchorOnChange(tab);

  const tags = useMemo(() => ['All', ...new Set(NOTICES.map(n => n.tag))], [NOTICES]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return NOTICES.filter(n => {
      const matchTag = tag === 'All' || n.tag === tag;
      const matchQuery = !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
      return matchTag && matchQuery;
    });
  }, [NOTICES, query, tag]);

  const urgentCount = NOTICES.filter(n => n.urgent).length;

  return (
    <>
      <PageHeader
        icon={Megaphone}
        eyebrow="Circulars & calendar"
        title="Notices and events"
        lead="Every circular the school issues is posted here as well as on the classroom noticeboard. The calendar below lists the examinations and events scheduled for this session."
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="rose" icon={AlertCircle}>{urgentCount} need attention</Badge>
          <Badge tone="brass" icon={CalendarDays}>{EVENTS.length} dated events</Badge>
        </div>
      </PageHeader>

      <div className="max-w-5xl mx-auto px-4 pb-20">

        <Reveal>
          <div ref={tabsRef} className="flex justify-center mb-8 scroll-mt-28">
            <Tabs
              tabs={[
                { id: 'notices', label: 'Notices', icon: Megaphone, count: NOTICES.length },
                { id: 'calendar', label: 'Calendar', icon: CalendarDays, count: EVENTS.length },
              ]}
              active={tab}
              onChange={setTab}
              label="Switch between notices and the calendar"
            />
          </div>
        </Reveal>

        {/* ================= NOTICES ================= */}
        {tab === 'notices' && (
          <>
            <Reveal>
              <div className="panel p-5 mb-7">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
                    <input value={query} onChange={e => setQuery(e.target.value)}
                           placeholder="Search the notices…" className="field pl-10"
                           aria-label="Search notices" />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
                    <select value={tag} onChange={e => setTag(e.target.value)}
                            className="field pl-10 font-semibold sm:w-48" aria-label="Filter by category">
                      {tags.map(t => <option key={t} value={t}>{t === 'All' ? 'All categories' : t}</option>)}
                    </select>
                  </div>
                </div>
                {(query || tag !== 'All') && (
                  <p className="text-[12px] text-ink-soft mt-3">
                    Showing <strong className="text-ink-950">{filtered.length}</strong> of {NOTICES.length} notices.
                    <button onClick={() => { setQuery(''); setTag('All'); }}
                            className="ml-2 font-bold text-brass-700 hover:text-brass-800 underline">
                      Clear filters
                    </button>
                  </p>
                )}
              </div>
            </Reveal>

            {!ready ? <SkCardGrid count={4} cols="grid-cols-1" media={false} /> :
             filtered.length === 0 ? (
              <EmptyState icon={Search} title="No notice matched your search"
                          action={<button onClick={() => { setQuery(''); setTag('All'); }} className="btn-ghost text-xs">Clear filters</button>}>
                Nothing matches "{query}"{tag !== 'All' && ` under ${tag}`}. Try a single keyword such as "fee",
                "exam" or "admission".
              </EmptyState>
            ) : (
              <div className="space-y-4">
                {filtered.map((n, i) => {
                  const Icon = TAG_ICONS[n.tag] || Megaphone;
                  const tone = TAG_TONES[n.tag] || 'brass';
                  return (
                    <Reveal key={n.id} delay={i * 70}>
                      <article className={`card-lift p-6 relative overflow-hidden ${n.urgent ? 'border-rose-200' : ''}`}>
                        {/* urgent rail */}
                        {n.urgent && <span className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />}

                        <div className="flex items-start gap-4">
                          <span className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${
                            tone === 'rose' ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : tone === 'garden' ? 'bg-garden-100 text-garden-700 border border-garden-200'
                            : tone === 'ink' ? 'bg-ink-100 text-ink-600 border border-ink-200'
                            : 'bg-brass-100 text-brass-700 border border-brass-200'
                          }`}>
                            <Icon className="w-5 h-5" strokeWidth={2.2} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={tone}>{n.tag}</Badge>
                              {n.urgent && <Badge tone="rose" icon={AlertCircle}>Action needed</Badge>}
                              <span className="text-[11px] font-semibold text-ink-faint inline-flex items-center gap-1.5">
                                <Clock className="w-3 h-3" /> {longDate(n.date)}
                              </span>
                            </div>

                            <h3 className="font-display text-base sm:text-lg font-extrabold text-ink-950 mt-2 leading-snug">
                              {n.title}
                            </h3>
                            <p className="text-[13px] text-ink-soft mt-2 leading-relaxed">{n.body}</p>
                          </div>
                        </div>
                      </article>
                    </Reveal>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ================= CALENDAR ================= */}
        {tab === 'calendar' && (
          <>
            <SectionHeader
              eyebrow="Session calendar" icon={CalendarDays}
              title="Dates for this academic year"
              lead="Examinations, cultural days, the sports meet and national observances. Dates may shift slightly; a circular is issued if they do."
            />

            {!ready ? <SkCardGrid count={5} cols="grid-cols-1" media={false} /> : (
              <div className="relative">
                {/* timeline spine */}
                <div className="absolute left-7 top-3 bottom-3 w-0.5 bg-gradient-to-b from-brass-300 via-brass-400 to-garden-400" />

                <div className="space-y-4">
                  {EVENTS.map((e, i) => {
                    const d = dateParts(e.date);
                    const past = new Date(e.date) < new Date();
                    return (
                      <Reveal key={e.id} delay={i * 60} dir="right">
                        <div className="relative flex items-start gap-5 pl-0">
                          {/* date node */}
                          <div className={`relative z-10 shrink-0 w-14 rounded-2xl text-center py-2 shadow-lift ${
                            past ? 'bg-ink-200' : 'bg-ink-950'
                          }`}>
                            <p className={`text-[9.5px] font-extrabold tracking-wider ${past ? 'text-ink-500' : 'text-brass-400'}`}>
                              {d.month}
                            </p>
                            <p className={`font-display text-xl font-extrabold leading-none mt-0.5 ${past ? 'text-ink-600' : 'text-white'}`}>
                              {d.day}
                            </p>
                            <p className={`text-[8.5px] font-bold mt-0.5 ${past ? 'text-ink-400' : 'text-ink-400'}`}>
                              {d.year}
                            </p>
                          </div>

                          <article className={`card-lift p-5 flex-1 ${past ? 'opacity-65' : ''}`}>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={
                                e.type === 'Examination' ? 'rose'
                                : e.type === 'Sports' ? 'garden'
                                : e.type === 'National' ? 'ink' : 'brass'
                              }>
                                {e.type}
                              </Badge>
                              <span className="text-[11px] font-bold text-ink-faint">{relativeDays(e.date)}</span>
                            </div>
                            <h3 className="font-display text-base font-extrabold text-ink-950 mt-2">{e.title}</h3>
                            <p className="text-[13px] text-ink-soft mt-1.5 leading-relaxed">{e.desc}</p>
                          </article>
                        </div>
                      </Reveal>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
