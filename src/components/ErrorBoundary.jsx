import React from 'react';
import { AlertOctagon, RefreshCw, Home, Copy, Check } from 'lucide-react';
import { SCHOOL } from '../data/school';

/* ============================================================
   ErrorBoundary — catches any render-time crash below it and
   shows a recoverable panel instead of a blank white page.
   It offers three ways out: retry the render, hard-reload, or
   clear stored data (which is the usual culprit when saved
   records go bad).
   ============================================================ */
export default class ErrorBoundary extends React.Component {
  state = { error: null, info: null, copied: false };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Keep the real stack in the console for whoever is debugging.
    console.error('[Asha Deep portal] render error:', error, info);
  }

  retry = () => this.setState({ error: null, info: null });

  reload = () => window.location.reload();

  clearData = () => {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('ada.'))
        .forEach(k => localStorage.removeItem(k));
    } catch { /* nothing we can do if storage is blocked */ }
    window.location.href = '/';
  };

  copyDetails = () => {
    const text = `${this.state.error?.toString() || 'Unknown error'}\n\n${this.state.info?.componentStack || ''}`;
    navigator.clipboard?.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 1800);
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-5"
           style={{ background: 'linear-gradient(165deg,#fffdf6,#fbfaf7 55%,#f3f5fa)' }}>
        <div className="w-full max-w-xl bg-white rounded-4xl shadow-float border border-ink-900/10 p-8 sm:p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-5">
            <AlertOctagon className="w-8 h-8" strokeWidth={2.2} />
          </div>

          <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-rose-600">Something broke</p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink-950 mt-2">
            This page could not be displayed
          </h1>
          <p className="text-sm text-ink-soft mt-3 leading-relaxed">
            An unexpected error stopped the page from rendering. Nothing you entered has been sent anywhere.
            Try again first — if it keeps happening, clearing the portal's saved records usually fixes it.
          </p>

          {/* The actual message, collapsed by default. */}
          <details className="mt-5 text-left">
            <summary className="cursor-pointer text-xs font-bold text-ink-600 hover:text-ink-900 select-none">
              Show technical details
            </summary>
            <pre className="mt-2.5 p-3.5 rounded-2xl bg-ink-950 text-rose-300 text-[10.5px] leading-relaxed overflow-auto max-h-44 font-mono">
              {this.state.error?.toString()}
              {this.state.info?.componentStack}
            </pre>
            <button onClick={this.copyDetails}
                    className="mt-2 text-[11px] font-bold text-ink-600 hover:text-ink-900 inline-flex items-center gap-1.5">
              {this.state.copied ? <><Check className="w-3 h-3 text-garden-600" /> Copied</> : <><Copy className="w-3 h-3" /> Copy details</>}
            </button>
          </details>

          <div className="flex flex-col sm:flex-row gap-2.5 mt-7">
            <button onClick={this.retry} className="btn-primary flex-1">
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
            <button onClick={this.reload} className="btn-ghost flex-1">
              Reload page
            </button>
            <button onClick={this.clearData} className="btn-ghost flex-1">
              <Home className="w-4 h-4" /> Clear data &amp; restart
            </button>
          </div>

          <p className="text-[11px] text-ink-faint mt-6">
            Still stuck? Call the school office at{' '}
            <a href={`tel:${SCHOOL.phoneRaw}`} className="font-bold text-ink-700 hover:text-brass-700">{SCHOOL.phone}</a>.
          </p>
        </div>
      </div>
    );
  }
}
