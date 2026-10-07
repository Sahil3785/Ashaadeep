import React, { useState, useMemo, useEffect } from 'react';
import { Images, X, ChevronLeft, ChevronRight, Camera, Maximize2 } from 'lucide-react';
import { GALLERY, GALLERY_CATEGORIES } from '../data/school';
import { PageHeader, Reveal, Badge, Tabs } from '../components/UI';
import { SkCardGrid, EmptyState } from '../components/Loaders';
import { useDelay, useScrollLock, useEscape, useAnchorOnChange } from '../hooks';

export default function Gallery() {
  const [category, setCategory] = useState('All');
  const [lightbox, setLightbox] = useState(null); // index into `filtered`
  // First mount only: filtering is instant, so re-running the skeleton on every
  // category switch would shrink the page and jerk the reader's scroll upward.
  const ready = useDelay(600);
  // Filtering shortens the page, so keep the filter the reader just used in view.
  const filterRef = useAnchorOnChange(category);

  const filtered = useMemo(
    () => category === 'All' ? GALLERY : GALLERY.filter(g => g.category === category),
    [category]
  );

  const counts = useMemo(() => {
    const map = { All: GALLERY.length };
    GALLERY.forEach(g => { map[g.category] = (map[g.category] || 0) + 1; });
    return map;
  }, []);

  return (
    <>
      <PageHeader
        icon={Images}
        eyebrow="Campus gallery"
        title="A look around the school"
        lead="Classrooms, laboratories, the library, the sports ground and our annual events — photographed on campus at Karhans."
      >
        <Badge tone="brass" icon={Camera}>{GALLERY.length} photographs</Badge>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 pb-20">

        {/* ---------- Category filter ---------- */}
        <Reveal>
          <div ref={filterRef} className="flex justify-center mb-9 scroll-mt-28">
            <Tabs
              tabs={GALLERY_CATEGORIES.map(c => ({ id: c, label: c, count: counts[c] || 0 }))}
              active={category}
              onChange={setCategory}
              label="Filter photographs by category"
            />
          </div>
        </Reveal>

        {/* ---------- Grid ---------- */}
        {!ready ? (
          <SkCardGrid count={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Camera} title="No photographs in this category yet"
                      action={<button onClick={() => setCategory('All')} className="btn-ghost text-xs">Show all photographs</button>}>
            We have not uploaded anything under "{category}" so far. Check back after the next school event.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((g, i) => (
              <Reveal key={g.id} delay={i * 70} dir="zoom">
                <button
                  onClick={() => setLightbox(i)}
                  className="card-lift p-0 overflow-hidden w-full text-left group block"
                  aria-label={`Open ${g.title} larger`}
                >
                  <div className="relative h-52 overflow-hidden">
                    <img src={g.image} alt={g.title} loading="lazy"
                         className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/92 backdrop-blur-md text-[10px] font-extrabold text-ink-900 shadow-soft">
                      {g.tag}
                    </span>
                    <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110">
                      <Maximize2 className="w-3.5 h-3.5 text-white" />
                    </span>
                  </div>

                  <div className="p-5">
                    <span className="text-[10px] font-extrabold uppercase tracking-[.14em] text-brass-700">{g.category}</span>
                    <h3 className="font-display text-base font-extrabold text-ink-950 mt-1 group-hover:text-brass-700 transition-colors">
                      {g.title}
                    </h3>
                    <p className="text-[13px] text-ink-soft mt-1.5 leading-relaxed">{g.desc}</p>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Lightbox ---------- */}
      {lightbox !== null && filtered[lightbox] && (
        <Lightbox
          items={filtered}
          index={lightbox}
          onIndex={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

/* ============================================================
   Lightbox — full-screen viewer with arrow-key navigation,
   a counter, and thumbnails along the bottom.
   ============================================================ */
function Lightbox({ items, index, onIndex, onClose }) {
  const item = items[index];
  useScrollLock(true);
  useEscape(onClose);

  const prev = () => onIndex((index - 1 + items.length) % items.length);
  const next = () => onIndex((index + 1) % items.length);

  // Arrow keys move between photographs.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index]);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col no-print" role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="absolute inset-0 bg-ink-950/94 backdrop-blur-md animate-fade-in" onClick={onClose} />

      {/* top bar */}
      <div className="relative flex items-center justify-between gap-4 p-4 sm:p-5 text-white">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-brass-400">{item.category}</p>
          <p className="font-display text-base sm:text-lg font-extrabold truncate">{item.title}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold text-ink-300 tabular-nums">{index + 1} / {items.length}</span>
          <button onClick={onClose} aria-label="Close viewer"
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* image stage */}
      <div className="relative flex-1 flex items-center justify-center px-4 pb-2 min-h-0">
        <button onClick={prev} aria-label="Previous photograph"
                className="absolute left-3 sm:left-6 z-10 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/22 transition-colors backdrop-blur-sm">
          <ChevronLeft className="w-6 h-6" />
        </button>

        <figure className="relative max-w-5xl w-full animate-pop-in">
          <img key={item.id} src={item.image} alt={item.title}
               className="w-full max-h-[62vh] object-contain rounded-3xl shadow-float" />
          <figcaption className="mt-4 text-center max-w-2xl mx-auto">
            <p className="text-[13px] text-ink-300 leading-relaxed">{item.desc}</p>
          </figcaption>
        </figure>

        <button onClick={next} aria-label="Next photograph"
                className="absolute right-3 sm:right-6 z-10 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/22 transition-colors backdrop-blur-sm">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* thumbnail rail */}
      <div className="relative px-4 pb-5">
        <div className="flex gap-2 overflow-x-auto justify-start sm:justify-center pb-1">
          {items.map((it, i) => (
            <button key={it.id} onClick={() => onIndex(i)} aria-label={`View ${it.title}`}
                    className={`shrink-0 w-16 h-12 rounded-xl overflow-hidden transition-all duration-300 ${
                      i === index ? 'ring-2 ring-brass-400 scale-105' : 'opacity-45 hover:opacity-80'
                    }`}>
              <img src={it.image} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
        <p className="text-center text-[10px] text-ink-500 mt-2.5">
          Use the ← → arrow keys to move, Esc to close
        </p>
      </div>
    </div>
  );
}
