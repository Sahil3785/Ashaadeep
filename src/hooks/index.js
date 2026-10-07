import { useState, useEffect, useRef, useCallback } from 'react';

/* ============================================================
   useLocalState — state mirrored into localStorage.
   Guarded with try/catch so corrupt or blocked storage falls
   back to the seed value instead of blanking the whole app.
   ============================================================ */
export function useLocalState(key, seed) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return seed;
      const parsed = JSON.parse(raw);
      // Only trust the stored value if its shape matches the seed.
      if (Array.isArray(seed) && !Array.isArray(parsed)) return seed;
      return parsed;
    } catch {
      return seed;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked (private mode) — keep working in memory */
    }
  }, [key, value]);

  return [value, setValue];
}

/* ============================================================
   useReveal — adds .is-visible once an element scrolls into
   view, driving the CSS scroll-reveal classes. Runs once per
   element, then stops observing.
   ============================================================ */
export function useReveal(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (or reduced motion) → show immediately.
    if (typeof IntersectionObserver === 'undefined' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-visible');
      return;
    }

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add('is-visible');
        io.unobserve(el);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px', ...options });

    io.observe(el);
    return () => io.disconnect();
  }, [options.threshold, options.rootMargin]);

  return ref;
}

/* ============================================================
   useCountUp — animates a number from 0 to `target` the first
   time it enters the viewport. Used by the stat tiles.
   ============================================================ */
export function useCountUp(target, duration = 1600) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setValue(target);
      return;
    }

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || done.current) return;
      done.current = true;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        // easeOutExpo — fast then settling, reads as "counting up"
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        setValue(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      io.unobserve(el);
    }, { threshold: 0.4 });

    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);

  return [value, ref];
}

/* ============================================================
   useDelayedFlag — true after `ms`. Used to simulate the
   network round-trip that a real backend would introduce, so
   the skeleton loaders have something to cover.
   ============================================================ */
export function useDelay(ms = 700, deps = []) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ready;
}

/* ============================================================
   useScrollLock — stops the page scrolling behind a modal or
   drawer, and restores both the scroll position and the layout
   when it closes.

   Two details matter here:
   - The scrolling element is <html>, not <body>, so the lock has
     to go on documentElement. Putting overflow:hidden on body
     alone does nothing at all.
   - Hiding the scrollbar makes the page jump sideways, so we pad
     the body by exactly the scrollbar width to hold it still.
   ============================================================ */
export function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;

    const html = document.documentElement;
    const y = window.scrollY;
    const scrollbar = window.innerWidth - html.clientWidth;
    const prevOverflow = html.style.overflow;
    const prevPadding = document.body.style.paddingRight;

    html.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    return () => {
      html.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      // Restoring overflow can nudge the scroll position, so put it back.
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    };
  }, [locked]);
}

/* ============================================================
   useAnchorOnChange — keeps a filter or tab bar in view when the
   content below it changes size.

   Filtering nine photographs down to two genuinely shortens the
   page, so the browser clamps the scroll position and the reader
   is dumped at an arbitrary point with no idea what moved. This
   scrolls the control they just used back into view instead —
   but only when it has already scrolled off the top, so it never
   yanks the page while they can still see what they clicked.
   ============================================================ */
export function useAnchorOnChange(dep, offset = 96) {
  const ref = useRef(null);
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    const el = ref.current;
    if (!el) return;

    const top = el.getBoundingClientRect().top;
    if (top >= offset) return;  // still visible — leave the page alone

    window.scrollTo({ top: window.scrollY + top - offset, behavior: 'smooth' });
  }, [dep, offset]);

  return ref;
}

/* ============================================================
   useEscape — fires a callback on the Escape key. Every modal
   uses it so keyboard users are never trapped.
   ============================================================ */
export function useEscape(onEscape, active = true) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => { if (e.key === 'Escape') onEscape(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEscape, active]);
}

/* ============================================================
   useFocusTrap — keeps Tab focus inside a modal while it is
   open, and returns focus to the trigger when it closes.
   ============================================================ */
export function useFocusTrap(active) {
  const ref = useRef(null);
  const previous = useRef(null);

  useEffect(() => {
    if (!active) return;
    previous.current = document.activeElement;
    const root = ref.current;
    if (!root) return;

    const selector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const first = root.querySelector(selector);
    first?.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const nodes = Array.from(root.querySelectorAll(selector));
      if (!nodes.length) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstNode) {
        e.preventDefault(); lastNode.focus({ preventScroll: true });
      } else if (!e.shiftKey && document.activeElement === lastNode) {
        e.preventDefault(); firstNode.focus({ preventScroll: true });
      }
    };

    root.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('keydown', onKey);
      previous.current?.focus?.({ preventScroll: true });
    };
  }, [active]);

  return ref;
}

/* ============================================================
   useScrollProgress — 0→1 reading progress for the top bar.
   ============================================================ */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return progress;
}

/* ============================================================
   useMediaQuery — reactive breakpoint / preference checks.
   ============================================================ */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mq.addEventListener('change', onChange);
    setMatches(mq.matches);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/* ============================================================
   useCopy — clipboard write with a short-lived "copied" flag,
   falling back to a hidden textarea on older browsers.
   ============================================================ */
export function useCopy(resetAfter = 1800) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* give up quietly */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), resetAfter);
    return true;
  }, [resetAfter]);
  return [copied, copy];
}
