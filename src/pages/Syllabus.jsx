import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen, Search, CheckCircle2, FileText, Download, Printer, Layers,
  GraduationCap, ChevronDown, Library, Hash,
} from 'lucide-react';
import { SYLLABUS, SYLLABUS_CLASSES } from '../data/syllabus';
import { SCHOOL } from '../data/school';
import { PageHeader, Reveal, Badge, Tabs, ProgressBar } from '../components/UI';
import { SkCardGrid, EmptyState } from '../components/Loaders';
import { useDelay, useAnchorOnChange } from '../hooks';

export default function Syllabus() {
  const [cls, setCls] = useState('10TH');
  const [query, setQuery] = useState('');
  // Keyed by course code, not array index — searching re-orders the list.
  const [expanded, setExpanded] = useState(() => new Set());
  // First mount only — changing class filters data already in memory.
  const ready = useDelay(500);
  // Different classes have different subject counts, so hold the selector in view.
  const panelRef = useAnchorOnChange(cls);

  const subjects = SYLLABUS[cls] || [];

  // Filter by subject name, code or any chapter title.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(s =>
      s.subject.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.chapters.some(c => c.toLowerCase().includes(q))
    );
  }, [subjects, query]);

  const totalChapters = subjects.reduce((a, s) => a + s.chapters.length, 0);

  const toggle = (code) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(code) ? next.delete(code) : next.add(code);
    return next;
  });

  const expandAll = () => setExpanded(new Set(filtered.map(s => s.code)));
  const collapseAll = () => setExpanded(new Set());

  // Open the first subject of whichever class is selected.
  useEffect(() => {
    setExpanded(new Set(subjects.length ? [subjects[0].code] : []));
  }, [cls]);

  return (
    <>
      <PageHeader
        icon={BookOpen}
        eyebrow={`Curriculum ${SCHOOL.session}`}
        title="Syllabus & chapter blueprint"
        lead="The full NCERT chapter list for each subject, with prescribed textbooks and the approximate paper weight. Pick a class to begin."
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="brass" icon={Layers}>{SYLLABUS_CLASSES.length} class groups</Badge>
          <Badge tone="garden" icon={FileText}>NCERT pattern</Badge>
        </div>
      </PageHeader>

      <div className="max-w-6xl mx-auto px-4 pb-20">

        {/* ---------- Class selector + search ---------- */}
        <Reveal>
          <div ref={panelRef} className="panel p-5 sm:p-6 mb-7 scroll-mt-28">
            <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-faint mb-3">Select a class</p>
            <Tabs
              tabs={SYLLABUS_CLASSES.map(c => ({ id: c, label: c, count: SYLLABUS[c].length }))}
              active={cls}
              onChange={setCls}
              label="Select a class"
              className="mb-5"
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search a subject, course code or chapter…"
                  className="field pl-10"
                  aria-label="Search the syllabus"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={expandAll} className="btn-ghost text-xs py-2.5">Expand all</button>
                <button onClick={collapseAll} className="btn-ghost text-xs py-2.5">Collapse</button>
                <button onClick={() => window.print()} className="btn-ink text-xs py-2.5">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </div>
            </div>

            {/* summary strip */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 pt-4 border-t border-ink-900/8 text-[12px]">
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <GraduationCap className="w-3.5 h-3.5 text-brass-600" />
                Class <strong className="text-ink-950">{cls}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <Library className="w-3.5 h-3.5 text-garden-600" />
                <strong className="text-ink-950">{subjects.length}</strong> subjects
              </span>
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <Hash className="w-3.5 h-3.5 text-ink-400" />
                <strong className="text-ink-950">{totalChapters}</strong> chapter modules
              </span>
              {query && (
                <span className="inline-flex items-center gap-1.5 text-brass-700 font-bold">
                  {filtered.length} matching {filtered.length === 1 ? 'subject' : 'subjects'}
                </span>
              )}
            </div>
          </div>
        </Reveal>

        {/* ---------- Subject cards ---------- */}
        {!ready ? (
          <SkCardGrid count={4} cols="md:grid-cols-2" media={false} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="No subject or chapter matched"
                      action={<button onClick={() => setQuery('')} className="btn-ghost text-xs">Clear the search</button>}>
            Nothing in the Class {cls} syllabus matches "{query}". Try a shorter word — searching "trigon" finds
            Trigonometry, and searching a code like "SCI" finds the whole Science paper.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filtered.map((s, i) => {
              const open = expanded.has(s.code);
              const optional = s.weight === 0;
              return (
                <Reveal key={s.code} delay={i * 70}>
                  <article className={`card overflow-hidden transition-all duration-300 ${open ? 'border-brass-300 shadow-lift' : ''}`}>
                    {/* header */}
                    <button onClick={() => toggle(s.code)} aria-expanded={open}
                            className="w-full text-left p-5 hover:bg-brass-50/40 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display text-base font-extrabold text-ink-950 leading-snug">{s.subject}</h3>
                          <p className="font-mono text-[11px] text-ink-faint mt-1">Course code {s.code}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {optional
                            ? <Badge tone="ink">Optional</Badge>
                            : <Badge tone="brass">{s.weight}% weight</Badge>}
                          <span className={`w-7 h-7 rounded-full bg-ink-50 text-ink-500 flex items-center justify-center transition-transform duration-300 ${open ? 'rotate-180 bg-ink-950 text-brass-400' : ''}`}>
                            <ChevronDown className="w-4 h-4" />
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3.5">
                        <span className="chip-garden">
                          {s.chapters.length} {s.chapters.length === 1 ? 'module' : 'modules'}
                        </span>
                        {!optional && (
                          <div className="flex-1 max-w-[9rem]">
                            <ProgressBar value={s.weight} max={25} tone="brass" showValue={false} height="h-1.5" />
                          </div>
                        )}
                      </div>
                    </button>

                    {/* chapter list — grid-rows animation, no fixed height needed */}
                    <div className="grid transition-all duration-400 ease-out"
                         style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
                      <div className="overflow-hidden">
                        <div className="px-5 pb-5">
                          <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-ink-faint mb-2.5">
                            Chapter modules
                          </p>
                          <ol className="space-y-2">
                            {s.chapters.map((c, k) => (
                              <li key={k} className="flex gap-2.5 text-[13px] text-ink-700 leading-snug">
                                <span className="shrink-0 w-5 h-5 rounded-md bg-garden-100 text-garden-700 text-[10px] font-extrabold flex items-center justify-center mt-0.5">
                                  {k + 1}
                                </span>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ol>

                          {s.book && (
                            <div className="mt-4 pt-4 border-t border-ink-900/8 flex gap-2.5">
                              <BookOpen className="w-4 h-4 text-brass-600 shrink-0 mt-0.5" />
                              <p className="text-[12px] text-ink-soft leading-snug">
                                <span className="font-bold text-ink-950">Prescribed text: </span>{s.book}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}

        {/* ---------- Examination pattern ---------- */}
        <Reveal>
          <div className="panel p-6 sm:p-8 mt-8">
            <h3 className="font-display text-lg font-extrabold text-ink-950 flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-brass-600" /> How the year is assessed
            </h3>
            <p className="text-[13px] text-ink-soft mt-2 leading-relaxed">
              Classes 6 to 10 follow a four-assessment year. Each unit test carries 40 marks and each term
              examination 100, and the final report weighs them as shown below.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
              {[
                { term: 'UT-1', when: 'July', marks: '40', weight: '10%', tone: 'brass' },
                { term: 'SA-1 (Half-yearly)', when: 'September', marks: '100', weight: '30%', tone: 'garden' },
                { term: 'UT-2', when: 'October', marks: '40', weight: '10%', tone: 'brass' },
                { term: 'SA-2 (Annual)', when: 'March', marks: '100', weight: '50%', tone: 'garden' },
              ].map(t => (
                <div key={t.term} className={`rounded-3xl border p-5 ${
                  t.tone === 'brass' ? 'bg-brass-50 border-brass-200' : 'bg-garden-50 border-garden-200'
                }`}>
                  <p className="font-display text-base font-extrabold text-ink-950">{t.term}</p>
                  <p className="text-[11px] text-ink-soft mt-0.5">{t.when}</p>
                  <div className="mt-3 pt-3 border-t border-ink-900/8 space-y-1 text-[12px]">
                    <p className="flex justify-between"><span className="text-ink-soft">Max marks</span><strong className="text-ink-950">{t.marks}</strong></p>
                    <p className="flex justify-between"><span className="text-ink-soft">Report weight</span><strong className="text-ink-950">{t.weight}</strong></p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 p-4 rounded-2xl bg-ink-50 border border-ink-900/8">
              <p className="text-[12.5px] text-ink-soft leading-relaxed">
                <strong className="text-ink-950">Passing requirement: </strong>
                a student needs at least 33% in every subject, counting theory and internal assessment together.
                Class 10 students additionally sit the Haryana Board examination in March, which is conducted and
                graded by HBSE, not by the school.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}
