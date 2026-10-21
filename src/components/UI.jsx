import { createPortal } from 'react-dom';
import React from 'react';
import { X } from 'lucide-react';
import { useReveal, useCountUp, useScrollLock, useEscape, useFocusTrap } from '../hooks';

/* ============================================================
   Reveal — wraps children and fades/slides them in when they
   scroll into view. `dir` picks the direction, `delay` staggers
   siblings so a grid cascades instead of popping all at once.
   ============================================================ */
export function Reveal({ children, dir = 'up', delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useReveal();
  const cls = { up: 'reveal', left: 'reveal-left', right: 'reveal-right', zoom: 'reveal-zoom' }[dir] || 'reveal';
  return (
    <Tag ref={ref} className={`${cls} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

/* Convenience: a grid whose children each reveal with a stagger. */
export function RevealGroup({ children, className = '', stagger = 70, dir = 'up' }) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, i) => (
        <Reveal dir={dir} delay={i * stagger}>{child}</Reveal>
      ))}
    </div>
  );
}

/* ============================================================
   IconTile — the small square behind a feature icon.

   Every one of these used to be near-black navy, which on a warm
   light page read as heavy and corporate rather than like a
   school. They are now a soft tint of their own colour with a
   faint ring, and the tone rotates across a grid so six cards
   are not six identical squares.

   Class names are written out in full on purpose: Tailwind scans
   source text, so `bg-${tone}-100` would never be generated.
   ============================================================ */
const TILE_TONES = {
  brass:  'bg-brass-100 text-brass-700 ring-brass-200/70',
  garden: 'bg-garden-100 text-garden-700 ring-garden-200/70',
  sky:    'bg-sky-100 text-sky-700 ring-sky-200/70',
  plum:   'bg-plum-100 text-plum-700 ring-plum-200/70',
  rose:   'bg-rose-100 text-rose-700 ring-rose-200/70',
  ink:    'bg-ink-100 text-ink-700 ring-ink-200/70',
};

const TILE_SIZES = {
  sm: 'w-9 h-9 rounded-xl',
  md: 'w-11 h-11 rounded-2xl',
  lg: 'w-13 h-13 rounded-2xl',
  xl: 'w-16 h-16 rounded-3xl',
};

const ICON_SIZES = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6', xl: 'w-8 h-8' };

/* Spread the accents across a list so grids look alive. */
export const toneFor = (i) => ['brass', 'garden', 'sky', 'plum'][i % 4];

export function IconTile({ icon: Icon, tone = 'brass', size = 'md', className = '', hover = true }) {
  return (
    <span className={`inline-flex items-center justify-center shrink-0 ring-1 shadow-soft
                      ${TILE_SIZES[size]} ${TILE_TONES[tone] || TILE_TONES.brass}
                      ${hover ? 'transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6' : ''}
                      ${className}`}>
      {Icon && <Icon className={ICON_SIZES[size]} strokeWidth={2.2} />}
    </span>
  );
}

/* ============================================================
   SectionHeader — the eyebrow + heading + lead block that opens
   every section, so spacing and type stay consistent sitewide.
   ============================================================ */
export function SectionHeader({ eyebrow, title, lead, align = 'center', icon: Icon }) {
  const alignCls = align === 'center' ? 'text-center items-center mx-auto' : 'text-left items-start';
  return (
    <Reveal className={`flex flex-col gap-3 ${alignCls} ${align === 'center' ? 'max-w-2xl' : ''} mb-10`}>
      {eyebrow && (
        <span className="eyebrow">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {eyebrow}
        </span>
      )}
      <h2 className="h-section">{title}</h2>
      {lead && <p className="lead">{lead}</p>}
      {/* short brass rule under the heading */}
      <span className={`h-1 w-16 rounded-full bg-gradient-to-r from-brass-400 to-brass-500 ${align === 'center' ? '' : ''}`} />
    </Reveal>
  );
}

/* ============================================================
   PageHeader — the banner at the top of every inner page.
   ============================================================ */
export function PageHeader({ eyebrow, title, lead, icon: Icon, children }) {
  return (
    <header className="relative pt-10 pb-8 sm:pt-14 sm:pb-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="panel-brass p-8 sm:p-11">
          {/* decorative corner rings */}
          <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-brass-200/35 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-12 w-48 h-48 rounded-full bg-garden-200/30 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col gap-4 animate-fade-up">
            <div className="flex items-center gap-3 flex-wrap">
              {Icon && <IconTile icon={Icon} tone="brass" size="lg" hover={false} />}
              {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            </div>
            <h1 className="h-page">{title}</h1>
            {lead && <p className="lead max-w-2xl">{lead}</p>}
            {children && <div className="pt-2">{children}</div>}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   StatTile — an animated counter card.
   ============================================================ */
export function StatTile({ icon: Icon, value, suffix = '', label, note, tone = 'brass' }) {
  const [count, ref] = useCountUp(value);
  const tones = {
    brass:  'bg-brass-100 text-brass-700 border-brass-200',
    garden: 'bg-garden-100 text-garden-700 border-garden-200',
    ink:    'bg-ink-100 text-ink-600 border-ink-200',
    rose:   'bg-rose-50 text-rose-600 border-rose-200',
  };
  return (
    <div ref={ref} className="card-lift p-5 group">
      <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${tones[tone]}`}>
        {Icon && <Icon className="w-5 h-5" strokeWidth={2.2} />}
      </div>
      <p className="font-display text-3xl font-extrabold text-ink-950 tabular-nums leading-none">
        {count.toLocaleString('en-IN')}<span className="text-brass-500">{suffix}</span>
      </p>
      <p className="text-sm font-bold text-ink-800 mt-1.5">{label}</p>
      {note && <p className="text-[11px] text-ink-faint mt-1 leading-snug">{note}</p>}
    </div>
  );
}

/* ============================================================
   Modal — accessible dialog: scroll-locked, Escape-closable,
   focus-trapped, click-outside-to-close, labelled for readers.
   ============================================================ */
export function Modal({ open, onClose, title, subtitle, children, size = 'md', icon: Icon }) {
  useScrollLock(open);
  useEscape(onClose, open);
  const trapRef = useFocusTrap(open);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  // Portalled to <body> so a dialog opened inside an animated page can never be
  // layered beneath the sticky header.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 no-print">
      {/* backdrop */}
      <div className="absolute inset-0 bg-ink-950/55 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      {/* dialog */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={`relative w-full ${widths[size]} bg-white rounded-4xl shadow-float border border-ink-900/10 animate-pop-in max-h-[92vh] overflow-y-auto`}
      >
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-ink-50 text-ink-500 flex items-center justify-center hover:bg-ink-100 hover:text-ink-900 transition-colors"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {(title || Icon) && (
          <div className="px-7 pt-7 pb-5 text-center border-b border-ink-900/8">
            {Icon && (
              <div className="w-13 h-13 mx-auto mb-3.5 rounded-2xl bg-gradient-to-br from-brass-400 to-brass-500 text-ink-950 flex items-center justify-center shadow-brass">
                <Icon className="w-6 h-6" strokeWidth={2.3} />
              </div>
            )}
            {title && <h3 id="modal-title" className="font-display text-xl font-extrabold text-ink-950">{title}</h3>}
            {subtitle && <p className="text-xs text-ink-soft mt-1.5 max-w-sm mx-auto leading-relaxed">{subtitle}</p>}
          </div>
        )}

        <div className="p-7">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* ============================================================
   Accordion — used by the FAQ and the syllabus chapter lists.
   ============================================================ */
export function Accordion({ items, allowMultiple = false }) {
  // Keyed by the question text, not the array index. Indices shift whenever the
  // list is filtered, which would leave a different item showing as open.
  const [open, setOpen] = React.useState(() => new Set());

  const keyOf = (item, i) => item.q || item.title || String(i);

  const toggle = (key) => {
    setOpen(prev => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const key = keyOf(item, i);
        const isOpen = open.has(key);
        return (
          <Reveal key={key} delay={i * 50}>
            <div className={`card overflow-hidden transition-all duration-300 ${isOpen ? 'border-brass-300 shadow-lift' : ''}`}>
              <button
                onClick={() => toggle(key)}
                aria-expanded={isOpen}
                className="w-full flex items-start justify-between gap-4 p-5 text-left hover:bg-brass-50/40 transition-colors"
              >
                <span className="flex items-start gap-3.5">
                  <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-lg text-[11px] font-extrabold flex items-center justify-center transition-colors ${isOpen ? 'bg-brass-400 text-ink-950' : 'bg-ink-100 text-ink-500'}`}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-bold text-ink-950 leading-snug">{item.q || item.title}</span>
                </span>
                <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-ink-950 text-brass-400 rotate-45' : 'bg-ink-50 text-ink-400'}`}>
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                </span>
              </button>
              {/* grid-rows trick animates height without knowing the content size */}
              <div className="grid transition-all duration-300 ease-out"
                   style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
                <div className="overflow-hidden">
                  <div className="px-5 pb-5 pl-[4.1rem] text-sm text-ink-soft leading-relaxed">
                    {item.a || item.body}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

/* ============================================================
   Badge / Pill helpers
   ============================================================ */
export function Badge({ tone = 'ink', children, icon: Icon, className = '' }) {
  const tones = {
    brass: 'chip-brass', garden: 'chip-garden', ink: 'chip-ink', rose: 'chip-rose',
  };
  return (
    <span className={`${tones[tone] || 'chip-ink'} ${className}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}

/* ============================================================
   ProgressBar — animates its fill in on mount.
   ============================================================ */
export function ProgressBar({ value, max = 100, tone = 'brass', label, showValue = true, height = 'h-2' }) {
  const pct = Math.max(0, Math.min((value / max) * 100, 100));
  const tones = {
    brass: 'from-brass-400 to-brass-500',
    garden: 'from-garden-400 to-garden-600',
    rose: 'from-rose-400 to-rose-500',
    ink: 'from-ink-500 to-ink-700',
  };
  return (
    <div>
      {(label || showValue) && (
        <div className="flex justify-between items-baseline mb-1.5">
          {label && <span className="text-xs font-semibold text-ink-soft">{label}</span>}
          {showValue && <span className="text-xs font-extrabold text-ink-900 tabular-nums">{pct.toFixed(1)}%</span>}
        </div>
      )}
      <div className={`w-full ${height} rounded-full bg-ink-900/8 overflow-hidden`}>
        <div className={`h-full rounded-full bg-gradient-to-r ${tones[tone]} origin-left animate-bar-grow`}
             style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ============================================================
   Tabs — shared pill tab bar with a sliding active indicator.
   ============================================================ */
export function Tabs({ tabs, active, onChange, className = '', label = 'View options' }) {
  // These are filter / segmented controls, not ARIA tabs: there is no
  // associated tabpanel, and role="tab" without one makes a screen reader
  // announce a panel that does not exist. A group of toggle buttons with
  // aria-pressed describes what these actually are.
  return (
    <div role="group" aria-label={label}
         className={`inline-flex flex-wrap gap-1.5 p-1.5 rounded-3xl bg-white/80 border border-ink-900/8 shadow-soft ${className}`}>
      {tabs.map(t => {
        const on = active === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(t.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all duration-300 ${
              on ? 'bg-ink-950 text-brass-300 shadow-lift scale-[1.03]'
                 : 'text-ink-soft hover:text-ink-950 hover:bg-ink-50'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {t.label}
            {t.count != null && (
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${on ? 'bg-brass-400/20 text-brass-300' : 'bg-ink-100 text-ink-500'}`}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
