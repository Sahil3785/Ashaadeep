import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';

/* ============================================================
   ScrollReset — on every route change, jump back to the top.
   Without this, navigating from the bottom of a long page lands
   the reader halfway down the next one.
   ============================================================ */
export function ScrollReset() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 'instant' because a smooth scroll fights the page's entry animation.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

/* ============================================================
   BackToTop — a floating button that appears once the reader is
   a screen and a half down the page.
   ============================================================ */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 1.4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={`fixed bottom-5 left-5 z-[65] w-11 h-11 rounded-2xl bg-ink-950 text-brass-400 shadow-float
                  flex items-center justify-center transition-all duration-400 no-print
                  hover:bg-ink-800 hover:-translate-y-1 ${
        show ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <ArrowUp className="w-5 h-5" strokeWidth={2.6} />
    </button>
  );
}
