import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Search, Phone, MessageCircle, ArrowRight } from 'lucide-react';
import { FAQS, SCHOOL } from '../data/school';
import { PageHeader, Reveal, Accordion, Badge } from '../components/UI';
import { EmptyState } from '../components/Loaders';

export default function Faq() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <PageHeader
        icon={HelpCircle}
        eyebrow="Common questions"
        title="Questions parents ask us"
        lead="The ten things we are asked most often at the admissions desk, answered plainly. If your question is not here, telephone the office — we would rather explain it properly than have you guess."
      >
        <Badge tone="brass">{FAQS.length} answers</Badge>
      </PageHeader>

      <div className="max-w-3xl mx-auto px-4 pb-20">

        {/* search */}
        <Reveal>
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-faint pointer-events-none" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search the questions — try 'bus', 'fee' or 'age'…"
              className="field pl-11 py-3.5 text-[15px]"
              aria-label="Search the questions"
            />
          </div>
        </Reveal>

        {filtered.length === 0 ? (
          <EmptyState icon={Search} title="No answer matched your search"
                      action={<button onClick={() => setQuery('')} className="btn-ghost text-xs">Show all questions</button>}>
            Nothing here matches "{query}". Try a single word, or just call the office on {SCHOOL.phone} —
            somebody will answer it directly.
          </EmptyState>
        ) : (
          <>
            {query && (
              <p className="text-[12.5px] text-ink-soft mb-4">
                Showing <strong className="text-ink-950">{filtered.length}</strong> of {FAQS.length} questions.
              </p>
            )}
            <Accordion items={filtered} allowMultiple />
          </>
        )}

        {/* still stuck */}
        <Reveal>
          <div className="panel-brass p-8 mt-10 text-center">
            <div className="relative">
              <HelpCircle className="w-10 h-10 text-brass-600 mx-auto mb-4" strokeWidth={2.2} />
              <h3 className="font-display text-xl font-extrabold text-ink-950">Still not answered?</h3>
              <p className="lead text-sm mt-2.5 max-w-md mx-auto">
                The office is open {SCHOOL.officeHours}. Call, send a WhatsApp message, or simply come in —
                no appointment is needed.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                <a href={`tel:${SCHOOL.phoneRaw}`} className="btn-primary">
                  <Phone className="w-4 h-4" /> Call {SCHOOL.phone}
                </a>
                <a href={`https://wa.me/${SCHOOL.whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn-garden">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <Link to="/contact" className="btn-ghost">
                  Write to us <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}
