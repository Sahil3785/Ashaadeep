import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileSpreadsheet, Search, Printer, Download, ShieldAlert, AlertCircle, QrCode,
  GraduationCap, TrendingUp, Award, Info, RotateCcw, CheckCircle2, BookOpen, Target,
} from 'lucide-react';
import { SCHOOL, EXAM_TERMS } from '../data/school';
import { summarise } from '../data/syllabus';
import { useSchool } from '../context/SchoolContext';
import { publicApi, isConfigured } from '../lib/api';
import { PageHeader, Reveal, Badge, ProgressBar } from '../components/UI';
import { SkDocument, Spinner, EmptyState } from '../components/Loaders';
import { elementToPdf } from '../utils/pdf';
import { longDate } from '../utils/format';

export default function Results() {
  const { students, marks, toast } = useSchool();

  const [form, setForm] = useState({ roll: '', name: '', exam: 'UT-1' });
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);     // { status, ... }
  const [exporting, setExporting] = useState(false);
  const resultRef = useRef(null);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  /* --------------------------------------------------------
     Search: four possible outcomes, each with its own panel —
       not_found    → no student matches roll + name
       pending_fee  → student found, but dues are outstanding
       no_marks     → student found, nothing recorded for the term
       success      → marksheet ready

     When connected to the school database this goes through
     get_student_result(), a function that returns exactly one
     student's marksheet. The students table itself is NOT
     readable by the public, so nobody can pull the names and
     phone numbers of every child in the school.

     Without a database it falls back to searching the local
     demo records, so the page still works before setup.
     -------------------------------------------------------- */
  const search = async (e) => {
    e.preventDefault();
    setSearching(true);
    setResult(null);

    const roll = form.roll.trim();
    const name = form.name.trim().toUpperCase();

    try {
      const outcome = isConfigured
        ? await lookupRemote(roll, name, form.exam)
        : await lookupLocal(roll, name, form.exam, students, marks);

      setResult(outcome);

      if (outcome.status === 'not_found') {
        toast('No student matched that roll number and name.', 'error', 'Not found');
      } else if (outcome.status === 'pending_fee') {
        toast('This marksheet is on hold until the fee is cleared.', 'warning', 'Fee pending');
      } else if (outcome.status === 'no_marks') {
        toast(`Nothing has been recorded yet for ${form.exam}.`, 'info', 'No marks');
      } else {
        toast(`Marksheet loaded for ${outcome.student.name}.`, 'success', 'Result found');
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      }
    } catch (err) {
      toast(err.message, 'error', 'Could not check the result');
      setResult({ status: 'error', message: err.message });
    } finally {
      setSearching(false);
    }
  };

  const download = async () => {
    setExporting(true);
    try {
      await elementToPdf('marksheet', `Marksheet_${result.student.name.replace(/\s+/g, '_')}_${result.exam}`);
      toast('The marksheet PDF has been saved to your downloads.', 'success', 'Download complete');
    } catch (err) {
      toast(err.message || 'The PDF could not be generated. Try printing instead.', 'error', 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const reset = () => { setForm({ roll: '', name: '', exam: 'UT-1' }); setResult(null); };

  return (
    <>
      <PageHeader
        icon={FileSpreadsheet}
        eyebrow="Examination results"
        title="Check your result online"
        lead="Enter the roll number exactly as it appears in the school diary, along with the student's first name, and choose the examination term."
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="garden" icon={CheckCircle2}>Print &amp; PDF ready</Badge>
          <Badge tone="brass" icon={Info}>Held if fees are pending</Badge>
        </div>
      </PageHeader>

      <div className="max-w-5xl mx-auto px-4 pb-16 space-y-7">

        {/* ---------- Search form ---------- */}
        <Reveal>
          <form onSubmit={search} className="panel p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="roll" className="field-label">Roll number <span className="text-rose-500">*</span></label>
                <input id="roll" value={form.roll} onChange={set('roll')} required
                       placeholder="e.g. 1" inputMode="numeric" className="field" />
              </div>
              <div>
                <label htmlFor="sname" className="field-label">Student's first name <span className="text-rose-500">*</span></label>
                <input id="sname" value={form.name}
                       onChange={e => setForm(f => ({ ...f, name: e.target.value.toUpperCase() }))}
                       required placeholder="e.g. AMAN" className="field uppercase" />
              </div>
              <div>
                <label htmlFor="exam" className="field-label">Examination term <span className="text-rose-500">*</span></label>
                <select id="exam" value={form.exam} onChange={set('exam')} className="field font-semibold">
                  {EXAM_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 mt-5">
              <button type="submit" disabled={searching} className="btn-primary flex-1 min-w-[12rem]">
                {searching ? <><Spinner className="w-4 h-4" /> Searching the register…</>
                           : <><Search className="w-4 h-4" /> Search marksheet</>}
              </button>
              <button type="button" onClick={reset} className="btn-ghost">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>

            {/* Demo shortcuts — this is a demonstration build, so sample
                records are offered rather than leaving visitors guessing. */}
            <div className="mt-5 pt-5 border-t border-ink-900/8">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint mb-2.5">Try a sample record</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Aman · Roll 1 · UT-1', v: { roll: '1', name: 'AMAN', exam: 'UT-1' }, tone: 'garden' },
                  { label: 'Priya · Roll 2 · SA-1', v: { roll: '2', name: 'PRIYA', exam: 'SA-1' }, tone: 'garden' },
                  { label: 'Rohit · Roll 3 · fee pending', v: { roll: '3', name: 'ROHIT', exam: 'UT-1' }, tone: 'rose' },
                  { label: 'Kabir · PP1 · activity grades', v: { roll: '1', name: 'KABIR', exam: 'UT-1' }, tone: 'brass' },
                ].map(d => (
                  <button key={d.label} type="button" onClick={() => setForm(d.v)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${
                            d.tone === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            : d.tone === 'garden' ? 'bg-garden-50 text-garden-700 border-garden-200 hover:bg-garden-100'
                            : 'bg-brass-50 text-brass-700 border-brass-200 hover:bg-brass-100'
                          }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </Reveal>

        {/* ---------- Loading skeleton ---------- */}
        {searching && <SkDocument />}

        {/* ---------- Outcome panels ---------- */}
        <div ref={resultRef}>
          {result?.status === 'not_found' && (
            <Reveal>
              <EmptyState icon={AlertCircle} title="No matching student record">
                Nothing in the register matches roll number <strong>{form.roll}</strong> with the first name
                "{form.name}". Check the spelling against the school diary — type the student's full first name. If it still fails, call the office on {SCHOOL.phone}.
              </EmptyState>
            </Reveal>
          )}

          {result?.status === 'no_marks' && (
            <Reveal>
              <EmptyState
                icon={BookOpen}
                title={`${result.exam} marks are not published yet`}
                action={<Link to="/notices" className="btn-ghost text-xs">Check notices for the result date</Link>}
              >
                <strong>{result.student.name}</strong> (Roll #{result.student.roll_no}, Class {result.student.class})
                is in the register, but no marks have been entered for {result.exam} so far. Results are published
                roughly ten days after the last paper.
              </EmptyState>
            </Reveal>
          )}

          {result?.status === 'error' && (
            <Reveal>
              <EmptyState icon={AlertCircle} title="Could not reach the school database"
                          action={<button onClick={() => setResult(null)} className="btn-ghost text-xs">Try again</button>}>
                {result.message} If this keeps happening, telephone the office on {SCHOOL.phone} and
                they will read the result out to you.
              </EmptyState>
            </Reveal>
          )}

          {result?.status === 'pending_fee' && <FeeHold student={result.student} />}

          {result?.status === 'success' && (
            <ResultView result={result} onDownload={download} exporting={exporting} />
          )}
        </div>

        {/* ---------- Help note ---------- */}
        {!result && !searching && (
          <Reveal>
            <div className="card p-6 flex gap-4">
              <span className="w-10 h-10 shrink-0 rounded-2xl bg-ink-100 text-ink-500 flex items-center justify-center">
                <Info className="w-5 h-5" />
              </span>
              <div className="text-[13px] text-ink-soft leading-relaxed">
                <p className="font-bold text-ink-950 mb-1.5">Before you search</p>
                <ul className="space-y-1.5 list-disc pl-4">
                  <li>Use the roll number, not the admission number — they are different.</li>
                  <li>Enter only the first name. "AMAN" works; "AMAN VERMA" also works.</li>
                  <li>A marksheet is released only when the fee for that term is cleared.</li>
                  <li>Both the printed copy and the PDF carry the school seal and are valid for school use. For a board certificate, apply at the office.</li>
                </ul>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </>
  );
}

/* ============================================================
   FeeHold — the blocked-marksheet panel, with a direct route to
   payment so the parent is never left at a dead end.
   ============================================================ */
function FeeHold({ student }) {
  return (
    <Reveal>
      <div className="card p-8 sm:p-10 border-rose-200 text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-5">
          <ShieldAlert className="w-8 h-8" strokeWidth={2.2} />
        </div>
        <Badge tone="rose">Marksheet on hold</Badge>
        <h3 className="font-display text-2xl font-extrabold text-ink-950 mt-3">
          Fee dues must be cleared first
        </h3>
        <p className="lead text-sm mt-3 max-w-lg mx-auto">
          The result for <strong className="text-ink-950">{student.name}</strong> (Roll #{student.roll_no},
          Class {student.class}-{student.section || 'A'}) is withheld because the fee for this term is outstanding.
          Pay it through the portal and the marksheet unlocks immediately — no office visit needed.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mt-7">
          <Link to="/fees" className="btn-garden">
            <QrCode className="w-4 h-4" /> Pay the fee now
          </Link>
          <a href={`tel:${SCHOOL.phoneRaw}`} className="btn-ghost">
            Call the accounts office
          </a>
        </div>

        <p className="text-[11px] text-ink-faint mt-5">
          Already paid at the counter? The office updates the ledger the same day. Call {SCHOOL.phone} if it has not reflected.
        </p>
      </div>
    </Reveal>
  );
}

/* ============================================================
   ResultView — performance summary cards plus the printable
   marksheet document.
   ============================================================ */
function ResultView({ result, onDownload, exporting }) {
  const { student, rows, exam, summary } = result;
  const passed = summary.pct >= 33;

  return (
    <div className="space-y-6">
      {/* ---------- Performance summary (screen only) ---------- */}
      <Reveal>
        <div className="panel p-6 sm:p-8 no-print">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <Badge tone={passed ? 'garden' : 'rose'} icon={passed ? Award : AlertCircle}>
                {summary.division}
              </Badge>
              <h3 className="font-display text-2xl font-extrabold text-ink-950 mt-2.5">{student.name}</h3>
              <p className="text-xs text-ink-soft mt-1">
                Roll #{student.roll_no} · Class {student.class}-{student.section || 'A'} · {exam} · Session {SCHOOL.session}
              </p>
            </div>
            <div className="flex gap-2 no-print">
              <button onClick={() => window.print()} className="btn-ghost text-xs">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button onClick={onDownload} disabled={exporting} className="btn-ink text-xs">
                {exporting ? <><Spinner className="w-4 h-4" /> Building PDF…</>
                           : <><Download className="w-4 h-4" /> Download PDF</>}
              </button>
            </div>
          </div>

          {/* headline figures */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-7">
            {[
              { label: 'Total marks', value: `${summary.obt}/${summary.max}`, tone: 'ink', icon: Target },
              { label: 'Percentage', value: `${summary.pct.toFixed(2)}%`, tone: 'brass', icon: TrendingUp },
              { label: 'Overall grade', value: summary.grade.grade, tone: summary.grade.tone, icon: Award },
              { label: 'CGPA', value: summary.cgpa.toFixed(1), tone: 'garden', icon: GraduationCap },
            ].map(c => {
              const Icon = c.icon;
              const tones = {
                brass: 'bg-brass-50 border-brass-200 text-brass-700',
                garden: 'bg-garden-50 border-garden-200 text-garden-700',
                ink: 'bg-ink-50 border-ink-200 text-ink-700',
                rose: 'bg-rose-50 border-rose-200 text-rose-700',
              };
              return (
                <div key={c.label} className={`rounded-3xl border p-5 ${tones[c.tone]}`}>
                  <Icon className="w-4.5 h-4.5 mb-2.5 opacity-70" />
                  <p className="font-display text-2xl font-extrabold text-ink-950 tabular-nums">{c.value}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider mt-1 opacity-80">{c.label}</p>
                </div>
              );
            })}
          </div>

          {/* per-subject bars */}
          <div className="mt-7">
            <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-faint mb-4">Subject-wise performance</p>
            <div className="space-y-3.5">
              {summary.perSubject.map(s => (
                <div key={s.code}>
                  <ProgressBar
                    value={s.sPct}
                    label={`${s.subject} — ${s.sObt}/${s.sMax} · Grade ${s.grade}`}
                    tone={s.sPct >= 75 ? 'garden' : s.sPct >= 50 ? 'brass' : 'rose'}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* strongest / needs-work callouts */}
          {summary.best && summary.weakest && summary.perSubject.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-7">
              <div className="rounded-3xl bg-garden-50 border border-garden-200 p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-garden-700">Strongest subject</p>
                <p className="font-display text-base font-extrabold text-ink-950 mt-1.5">{summary.best.subject}</p>
                <p className="text-xs text-garden-800 mt-1">
                  {summary.best.sObt}/{summary.best.sMax} · {summary.best.sPct.toFixed(1)}% · Grade {summary.best.grade}
                </p>
              </div>
              <div className="rounded-3xl bg-brass-50 border border-brass-200 p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-brass-700">Needs more work</p>
                <p className="font-display text-base font-extrabold text-ink-950 mt-1.5">{summary.weakest.subject}</p>
                <p className="text-xs text-brass-800 mt-1">
                  {summary.weakest.sObt}/{summary.weakest.sMax} · {summary.weakest.sPct.toFixed(1)}% · Grade {summary.weakest.grade}
                </p>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* ---------- The printable document ---------- */}
      <Marksheet student={student} rows={rows} exam={exam} summary={summary} />
    </div>
  );
}

/* ============================================================
   Marksheet — the formal document. Fixed light colours and inline
   borders so html2canvas and the printer reproduce it faithfully.
   ============================================================ */
function Marksheet({ student, rows, exam, summary }) {
  return (
    <div id="marksheet" className="document doc-watermark print-area relative rounded-3xl p-6 sm:p-9"
         style={{ border: '3px solid #18213c' }}>

      {/* ---- Letterhead ---- */}
      <div className="text-center pb-5 mb-5" style={{ borderBottom: '2px solid #18213c' }}>
        <div className="flex items-center justify-center gap-3.5 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: '#18213c' }}>
            <GraduationCap className="w-7 h-7" style={{ color: '#f59e0b' }} strokeWidth={2.3} />
          </div>
          <div className="text-left">
            <h2 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-wide leading-tight"
                style={{ color: '#18213c' }}>
              {SCHOOL.name}
            </h2>
            <p className="text-[11px] font-semibold" style={{ color: '#4a5578' }}>{SCHOOL.address}</p>
          </div>
        </div>
        <p className="text-[10.5px] font-medium" style={{ color: '#4a5578' }}>
          {SCHOOL.affiliation} · Affiliation No. {SCHOOL.affiliationNo} · School Code {SCHOOL.schoolCode}
        </p>
        <div className="inline-block mt-2.5 px-4 py-1.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider"
             style={{ background: '#18213c', color: '#fbb420' }}>
          Statement of Marks · {exam} · Session {SCHOOL.session}
        </div>
      </div>

      {/* ---- Student particulars ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl mb-5"
           style={{ background: '#f7f8fb', border: '1px solid #d7dce8' }}>
        {[
          ['Student name', student.name],
          ['Roll number', `#${student.roll_no}`],
          ['Class & section', `${student.class} (${student.section || 'A'})`],
          ["Father's name", student.father_name || '—'],
          ["Mother's name", student.mother_name || '—'],
          ['Student ID', student.student_id],
          ['House', student.house || '—'],
          ['Date of issue', longDate(new Date())],
        ].map(([k, v]) => (
          <div key={k}>
            <span className="block text-[9px] font-extrabold uppercase tracking-wider" style={{ color: '#8792b0' }}>{k}</span>
            <strong className="block text-[12.5px] font-bold mt-0.5" style={{ color: '#18213c' }}>{v}</strong>
          </div>
        ))}
      </div>

      {/* ---- Marks table ---- */}
      <div className="overflow-x-auto">
        <table className="w-full text-center" style={{ borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#18213c', color: '#ffffff' }}>
              <th className="p-2.5 text-left font-bold">Subject (Code)</th>
              <th className="p-2.5 font-bold">Theory</th>
              <th className="p-2.5 font-bold">Internal</th>
              <th className="p-2.5 font-bold">Total</th>
              <th className="p-2.5 font-bold">%</th>
              <th className="p-2.5 font-bold">Grade</th>
              <th className="p-2.5 font-bold">Points</th>
            </tr>
          </thead>
          <tbody>
            {summary.perSubject.map((m, i) => (
              <tr key={m.code} style={{ background: i % 2 ? '#f7f8fb' : '#ffffff', borderBottom: '1px solid #e4e8f0' }}>
                <td className="p-2.5 text-left font-bold" style={{ color: '#18213c' }}>
                  {m.subject}
                  <span className="ml-1.5 font-mono text-[10px]" style={{ color: '#8792b0' }}>({m.code})</span>
                </td>
                <td className="p-2.5 font-mono" style={{ color: '#2a375b' }}>{m.theory_obt}/{m.theory_max}</td>
                <td className="p-2.5 font-mono" style={{ color: '#2a375b' }}>{m.practical_obt}/{m.practical_max}</td>
                <td className="p-2.5 font-mono font-extrabold" style={{ color: '#18213c' }}>{m.sObt}/{m.sMax}</td>
                <td className="p-2.5 font-mono" style={{ color: '#2a375b' }}>{m.sPct.toFixed(1)}</td>
                <td className="p-2.5 font-extrabold" style={{ color: m.sPct >= 33 ? '#0b7049' : '#b91c1c' }}>{m.grade}</td>
                <td className="p-2.5 font-mono font-semibold" style={{ color: '#2a375b' }}>{m.points.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#eef0f5', borderTop: '2px solid #18213c' }}>
              <td className="p-2.5 text-left font-extrabold uppercase text-[11px]" style={{ color: '#18213c' }}>Grand total</td>
              <td colSpan={2} />
              <td className="p-2.5 font-mono font-extrabold" style={{ color: '#18213c' }}>{summary.obt}/{summary.max}</td>
              <td className="p-2.5 font-mono font-extrabold" style={{ color: '#18213c' }}>{summary.pct.toFixed(2)}</td>
              <td className="p-2.5 font-extrabold" style={{ color: '#0b7049' }}>{summary.grade.grade}</td>
              <td className="p-2.5 font-mono font-extrabold" style={{ color: '#18213c' }}>{summary.cgpa.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ---- Result declaration ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl mt-5"
           style={{ background: '#f7f8fb', border: '1px solid #d7dce8' }}>
        {[
          ['Percentage', `${summary.pct.toFixed(2)}%`],
          ['CGPA', summary.cgpa.toFixed(1)],
          ['Grade', `${summary.grade.grade} — ${summary.grade.remark}`],
          ['Result', summary.division],
        ].map(([k, v]) => (
          <div key={k}>
            <span className="block text-[9px] font-extrabold uppercase tracking-wider" style={{ color: '#8792b0' }}>{k}</span>
            <strong className="block text-[12.5px] font-extrabold mt-0.5"
                    style={{ color: k === 'Result' ? (summary.pct >= 33 ? '#0b7049' : '#b91c1c') : '#18213c' }}>
              {v}
            </strong>
          </div>
        ))}
      </div>

      {/* ---- Grading key ---- */}
      <div className="mt-5 p-3.5 rounded-xl" style={{ background: '#fffaeb', border: '1px solid #fde088' }}>
        <p className="text-[9px] font-extrabold uppercase tracking-wider mb-1.5" style={{ color: '#92400e' }}>Grading scale (HBSE nine-point)</p>
        <p className="text-[10.5px] leading-relaxed" style={{ color: '#78350f' }}>
          A1 91–100 · A2 81–90 · B1 71–80 · B2 61–70 · C1 51–60 · C2 41–50 · D 33–40 · E below 33 (essential repeat).
          Minimum 33% in each subject is required to pass.
        </p>
      </div>

      {/* ---- Signatures ---- */}
      <div className="flex justify-between items-end gap-6 mt-8 pt-6" style={{ borderTop: '2px solid #d7dce8' }}>
        <div className="text-[10.5px]" style={{ color: '#4a5578' }}>
          <p>Date of publication: <strong style={{ color: '#18213c' }}>{longDate(new Date())}</strong></p>
          <p className="mt-0.5" style={{ color: '#8792b0' }}>
            Computer-generated record from the official school register. Not valid as a board certificate.
          </p>
        </div>
        <div className="text-center shrink-0">
          <div className="w-36 pt-1.5 text-[11px] font-extrabold"
               style={{ borderTop: '2px solid #18213c', color: '#18213c' }}>
            Principal · Seal
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Lookup helpers
   ============================================================ */

/* Connected: one database call, one student's data back. */
async function lookupRemote(roll, name, exam) {
  const data = await publicApi.getResult(roll, name, exam);
  if (!data || data.status === 'not_found') return { status: 'not_found' };
  if (data.status === 'pending_fee') return { status: 'pending_fee', student: data.student };
  if (data.status === 'no_marks') return { status: 'no_marks', student: data.student, exam: data.exam };

  const rows = (data.marks || []).map(m => ({
    ...m,
    theory_max: Number(m.theory_max), theory_obt: Number(m.theory_obt),
    practical_max: Number(m.practical_max), practical_obt: Number(m.practical_obt),
  }));
  return {
    status: 'success',
    student: { ...data.student, student_id: data.student.admission_no || '' },
    rows, exam: data.exam, summary: summarise(rows),
  };
}

/* Offline demo mode: search the records bundled with the build. */
async function lookupLocal(roll, name, exam, students, marks) {
  // A short pause so the loading state is visible rather than flickering.
  await new Promise(r => setTimeout(r, 650));

  // Same rule as get_student_result(): the whole first name must match, so a
  // single letter cannot be used to walk through the register.
  const typed = name.toUpperCase().replace(/\s+/g, ' ').trim();
  const student = typed.length >= 2 && students.find(s => {
    const full = (s.name || '').toUpperCase();
    return String(s.roll_no) === roll &&
      full.split(' ')[0] === typed.split(' ')[0] &&
      full.startsWith(typed);
  });
  if (!student) return { status: 'not_found' };
  if ((student.fee_status || '').toUpperCase() === 'PENDING') {
    return { status: 'pending_fee', student };
  }

  const rows = marks.filter(m =>
    m.student_id === student.student_id &&
    (m.exam_name || '').toUpperCase() === exam.toUpperCase()
  );
  if (!rows.length) return { status: 'no_marks', student, exam };

  return { status: 'success', student, rows, exam, summary: summarise(rows) };
}
