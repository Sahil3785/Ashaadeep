import React, { useEffect, useRef } from 'react';
import { useMediaQuery } from '../hooks';

/* ============================================================
   Background — the four decorative layers behind every page.
   All of it is pointer-events:none, so nothing here can ever
   swallow a click meant for the content above it.
   ============================================================ */
export default function Background() {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const wide = useMediaQuery('(min-width: 768px)');

  return (
    <div className="bg-stage" aria-hidden="true">
      {/* a) warm colour wash */}
      <div className="bg-wash" />
      {/* b) faint engineering grid, edge-masked */}
      <div className="bg-grid" />
      {/* c) drifting colour blobs */}
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />
      {/* d) constellation canvas — desktop only, and never under reduced motion */}
      {wide && !reduced && <Constellation />}
      {/* e) paper grain on top to take the digital edge off */}
      <div className="bg-grain" />
    </div>
  );
}

/* ============================================================
   Constellation — drifting dots joined by faint lines, tinted
   to the school's brass/navy/green palette. Pauses itself when
   the tab is hidden so it never burns battery in the background.
   ============================================================ */
function Constellation() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    let w = 0, h = 0, raf = 0, running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const PALETTE = ['#f59e0b', '#19ae6d', '#4a63a1', '#fbb420'];
    let dots = [];

    const seed = () => {
      // Scale the count with the viewport so phones and 4K look alike.
      const count = Math.min(52, Math.round((w * h) / 30000));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.7 + 0.9,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        alpha: Math.random() * 0.3 + 0.18,
      }));
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const LINK = 128;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.x += d.vx;
        d.y += d.vy;
        // Wrap rather than bounce — keeps the drift calm and directionless.
        if (d.x < -10) d.x = w + 10;
        if (d.x > w + 10) d.x = -10;
        if (d.y < -10) d.y = h + 10;
        if (d.y > h + 10) d.y = -10;

        ctx.globalAlpha = d.alpha;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();

        // Join nearby dots, fading the line out with distance.
        for (let j = i + 1; j < dots.length; j++) {
          const o = dots[j];
          const dx = d.x - o.x, dy = d.y - o.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK) {
            ctx.globalAlpha = (1 - dist / LINK) * 0.09;
            ctx.strokeStyle = '#4a63a1';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(o.x, o.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      if (running) raf = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running) raf = requestAnimationFrame(draw);
      else cancelAnimationFrame(raf);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 opacity-70" />;
}
