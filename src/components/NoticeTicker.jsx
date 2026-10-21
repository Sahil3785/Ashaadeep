import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Pause, Play, ChevronRight } from 'lucide-react';
import { usePublished } from '../hooks/usePublished';

/* ============================================================
   NoticeTicker — the scrolling circular strip under the header.
   The track holds the notice list twice and translates by -50%,
   which makes the loop seamless with no visible jump. A pause
   button is provided because a never-stopping marquee is an
   accessibility problem for anyone who reads slowly.
   ============================================================ */
export default function NoticeTicker() {
  const [paused, setPaused] = useState(false);
  const { notices } = usePublished();
  const items = notices.slice(0, 5);

  // w-full is required, not cosmetic: as a flex item in the column layout this
  // wrapper would otherwise grow to the marquee's min-content width (~3600px)
  // and blow the page out sideways on a phone.
  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-4 no-print">
      <div className="relative flex items-stretch gap-0 rounded-2xl overflow-hidden bg-white/85 backdrop-blur-xl border border-brass-300/50 shadow-soft">

        {/* label */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-brass-400 to-brass-500 text-ink-950 shrink-0">
          <Megaphone className="w-4 h-4" strokeWidth={2.4} />
          <span className="text-[11px] font-extrabold uppercase tracking-wider hidden sm:inline">Notices</span>
        </div>

        {/* scrolling track */}
        {/* min-w-0 is essential: a flex item defaults to min-width:auto, which
            refuses to shrink below the marquee track's content width (several
            thousand pixels) and stretches the whole bar past the viewport. */}
        <div className="flex-1 min-w-0 overflow-hidden relative"
             onMouseEnter={() => setPaused(true)}
             onMouseLeave={() => setPaused(false)}>
          {/* edge fades so text appears to emerge and dissolve */}
          <div className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-white to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />

          <div className="flex w-max animate-marquee py-2.5"
               style={{ animationPlayState: paused ? 'paused' : 'running' }}>
            {[0, 1].map(copy => (
              <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
                {items.map(n => (
                  <Link key={`${copy}-${n.id}`} to="/notices"
                        className="inline-flex items-center gap-2 px-6 text-[13px] whitespace-nowrap group">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${n.urgent ? 'bg-rose-500 animate-pulse' : 'bg-brass-500'}`} />
                    <span className="font-bold text-ink-900 group-hover:text-brass-700 transition-colors">{n.tag}</span>
                    <span className="text-ink-300">·</span>
                    <span className="text-ink-soft group-hover:text-ink-900 transition-colors">{n.title}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* controls */}
        <div className="flex items-center shrink-0 border-l border-ink-900/8">
          <button onClick={() => setPaused(p => !p)}
                  aria-label={paused ? 'Resume scrolling notices' : 'Pause scrolling notices'}
                  className="px-2.5 h-full text-ink-400 hover:text-ink-900 hover:bg-ink-50 transition-colors">
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <Link to="/notices"
                className="hidden sm:flex items-center gap-1 px-3 h-full text-[11px] font-bold text-ink-700 hover:text-brass-700 hover:bg-brass-50 transition-colors">
            All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
