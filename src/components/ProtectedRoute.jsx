import React, { useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import { Reveal } from './UI';

/* ============================================================
   ProtectedRoute — guards the faculty dashboard.

   Three cases, which is the whole point of the `wasAuthed` ref:

   1. A visitor arrives without having signed in → explain why the
      page is closed and open the PIN dialog for them.
   2. A signed-in teacher → render the dashboard.
   3. A teacher who has just signed OUT → send them home. Without
      this they stay on the protected URL, the guard treats them
      as case 1, and the PIN dialog pops straight back up — which
      makes signing out look broken.
   ============================================================ */
export default function ProtectedRoute({ children }) {
  const { isTeacher, setPinModalOpen } = useSchool();

  // Remembers whether this mount ever held an authenticated session.
  const wasAuthed = useRef(false);
  useEffect(() => {
    if (isTeacher) wasAuthed.current = true;
  }, [isTeacher]);

  // Case 1 only: prompt a visitor who has not signed in during this visit.
  useEffect(() => {
    if (!isTeacher && !wasAuthed.current) setPinModalOpen(true);
  }, [isTeacher, setPinModalOpen]);

  // Case 2
  if (isTeacher) return children;

  // Case 3 — signed out deliberately, so leave rather than re-prompt.
  if (wasAuthed.current) return <Navigate to="/" replace />;

  // Case 1
  return (
    <div className="max-w-xl mx-auto px-4 py-20">
      <Reveal dir="zoom">
        <div className="panel p-9 sm:p-11 text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-ink-950 text-brass-400 flex items-center justify-center mb-5 shadow-lift">
            <Lock className="w-8 h-8" strokeWidth={2.2} />
          </div>

          <span className="eyebrow mx-auto"><ShieldCheck className="w-3.5 h-3.5" /> Staff only</span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink-950 mt-4">
            This area needs a faculty PIN
          </h1>
          <p className="lead text-sm mt-3">
            The faculty dashboard holds student records, marks and the fee ledger, so it is not open to visitors.
            Enter the faculty PIN in the dialog to continue — if it has closed, use the button below to reopen it.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-7">
            <button onClick={() => setPinModalOpen(true)} className="btn-primary">
              <Lock className="w-4 h-4" /> Enter the PIN
            </button>
            <Link to="/" className="btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Back to the home page
            </Link>
          </div>

          <p className="text-[11px] text-ink-faint mt-6">
            Parents do not need this area. Results are on the Results page and fees on the Fee Payment page,
            both open to everyone.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
