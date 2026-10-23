import React, { useState, useMemo } from 'react';
import { PlusCircle, Save, BookOpen, Trash2 } from 'lucide-react';
import { CLASS_LIST, EXAM_TERMS, SUBJECT_CODES, MAX_PRESETS } from '../../data/school';
import { summarise } from '../../data/syllabus';
import { useSchool } from '../../context/SchoolContext';
import { Screen, Card, Field, Btn, Pill, inputCls, selectCls, Empty } from '../components/Chrome';
import { tap } from '../native';
import { initialsOf, numeric } from '../../utils/format';

/* ============================================================
   Marks — record one subject's marks for one student and term.

   Laid out as a single downward column so a teacher can work
   through it with one thumb: class → student → term → subject →
   the four numbers → save. What is already recorded for that
   student and term is shown underneath, so they can see at a
   glance what is still missing.
   ============================================================ */
export default function Marks() {
  const { students, marks, saveMarks, deleteMarks, toast } = useSchool();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    cls: '10TH', studentId: '', exam: 'UT-1',
    subject: 'Mathematics Standard', code: 'MAT-103',
    theoryMax: '30', theoryObt: '', practMax: '10', practObt: '',
    feeOverride: '',
  });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => {
    setF(x => ({ ...x, [k]: e.target.value }));
    setErrors(x => ({ ...x, [k]: undefined }));
  };

  const classStudents = students.filter(s => s.class.toUpperCase() === f.cls.toUpperCase());
  const selected = students.find(s => s.student_id === f.studentId);

  const existing = useMemo(
    () => (f.studentId ? marks.filter(m => m.student_id === f.studentId && m.exam_name === f.exam) : []),
    [marks, f.studentId, f.exam]
  );
  const summary = existing.length ? summarise(existing) : null;

  const total = (Number(f.theoryObt) || 0) + (Number(f.practObt) || 0);
  const max = (Number(f.theoryMax) || 0) + (Number(f.practMax) || 0);
  const pct = max ? (total / max) * 100 : 0;
  const showPreview = f.theoryObt !== '' && f.practObt !== '';

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    const tMax = Number(f.theoryMax), tObt = Number(f.theoryObt);
    const pMax = Number(f.practMax), pObt = Number(f.practObt);

    if (!f.studentId) next.studentId = 'Choose a student first.';
    if (!(tMax > 0)) next.theoryMax = 'Must be more than zero.';
    if (f.theoryObt === '' || tObt < 0) next.theoryObt = 'Enter the marks obtained.';
    else if (tObt > tMax) next.theoryObt = `Cannot be more than ${tMax}.`;
    if (pMax < 0) next.practMax = 'Cannot be negative.';
    if (f.practObt === '' || pObt < 0) next.practObt = 'Enter the marks obtained.';
    else if (pObt > pMax) next.practObt = `Cannot be more than ${pMax}.`;

    if (Object.keys(next).length) {
      setErrors(next);
      tap('error');
      toast('Please correct the highlighted fields.', 'error', 'Check the entry');
      return;
    }

    setBusy(true);
    await new Promise(r => setTimeout(r, 350));
    saveMarks({
      student_id: f.studentId, class: f.cls, exam_name: f.exam,
      subject: f.subject, code: f.code,
      theory_max: tMax, theory_obt: tObt,
      practical_max: pMax, practical_obt: pObt,
    }, f.feeOverride || null);
    tap('success');
    setBusy(false);
    setF(x => ({ ...x, theoryObt: '', practObt: '' }));
  };

  return (
    <Screen icon={PlusCircle} title="Enter Marks" subtitle="Saved straight to the student record">
      <form onSubmit={submit} className="space-y-4">
        <Card className="p-4 space-y-4">
          <Field label="Class">
            <select value={f.cls}
                    onChange={e => setF(x => ({ ...x, cls: e.target.value, studentId: '' }))}
                    className={selectCls()}>
              {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Student" required error={errors.studentId}
                 hint={classStudents.length === 0 ? `No students in ${f.cls} yet — add one on the Enrol tab.` : undefined}>
            <select value={f.studentId} onChange={set('studentId')} className={selectCls(errors.studentId)}>
              <option value="">— choose a student —</option>
              {classStudents.map(s => (
                <option key={s.student_id} value={s.student_id}>
                  #{s.roll_no} · {s.name}{s.fee_status !== 'PAID' ? ' (fee due)' : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Examination term">
            <select value={f.exam} onChange={set('exam')} className={selectCls()}>
              {EXAM_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          <Field label="Subject" hint={`Course code ${f.code}`}>
            <select value={f.subject}
                    onChange={e => setF(x => ({ ...x, subject: e.target.value, code: SUBJECT_CODES[e.target.value] || 'SUB-001' }))}
                    className={selectCls()}>
              {Object.keys(SUBJECT_CODES).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </Card>

        {/* the numbers */}
        <Card className="p-4 space-y-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-faint">Theory</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Maximum" error={errors.theoryMax}>
              <input type="text" inputMode="decimal" autoComplete="off" value={f.theoryMax}
                     onChange={numeric(set('theoryMax'), { decimal: true })} className={inputCls(errors.theoryMax)} />
            </Field>
            <Field label="Obtained" required error={errors.theoryObt}>
              <input type="text" inputMode="decimal" autoComplete="off" value={f.theoryObt}
                     onChange={numeric(set('theoryObt'), { decimal: true })} placeholder="28"
                     className={`${inputCls(errors.theoryObt)} font-bold`} />
            </Field>
          </div>

          <QuickMax values={MAX_PRESETS.theory} current={f.theoryMax} label="Theory maximum"
                    onPick={v => set('theoryMax')({ target: { value: v } })} />

          <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-faint pt-1">Internal / practical</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Maximum" error={errors.practMax}>
              <input type="text" inputMode="decimal" autoComplete="off" value={f.practMax}
                     onChange={numeric(set('practMax'), { decimal: true })} className={inputCls(errors.practMax)} />
            </Field>
            <Field label="Obtained" required error={errors.practObt}>
              <input type="text" inputMode="decimal" autoComplete="off" value={f.practObt}
                     onChange={numeric(set('practObt'), { decimal: true })} placeholder="9"
                     className={`${inputCls(errors.practObt)} font-bold`} />
            </Field>
          </div>

          <QuickMax values={MAX_PRESETS.internal} current={f.practMax} label="Internal maximum"
                    onPick={v => set('practMax')({ target: { value: v } })} />

          {showPreview && (
            <div className="rounded-2xl bg-ink-50 border border-ink-900/8 p-3.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">This entry</p>
              <p className="text-[15px] font-extrabold text-ink-950 mt-1">
                {total} of {max} — {pct.toFixed(1)}%
              </p>
              <div className="h-2 rounded-full bg-ink-200 overflow-hidden mt-2">
                <div className={`h-full rounded-full transition-all ${pct >= 75 ? 'bg-garden-500' : pct >= 50 ? 'bg-brass-500' : 'bg-rose-500'}`}
                     style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          )}

          <Field label="Also set the fee status" hint="Leave unchanged unless you are clearing or holding dues.">
            <select value={f.feeOverride} onChange={set('feeOverride')} className={selectCls()}>
              <option value="">Leave unchanged</option>
              <option value="PAID">Mark PAID — releases the marksheet</option>
              <option value="PENDING">Mark PENDING — withholds it</option>
            </select>
          </Field>
        </Card>

        <Btn type="submit" disabled={busy}>
          {busy ? 'Saving…' : <><Save className="w-4.5 h-4.5" /> Save marks</>}
        </Btn>

        <p className="text-[11px] text-ink-faint text-center leading-relaxed px-2">
          Saving replaces any earlier entry for the same student, term and subject,
          so correcting a mistake just means entering it again.
        </p>
      </form>

      {/* what is already recorded */}
      {selected && (
        <>
          <h2 className="text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-faint mt-7 mb-2.5">
            {selected.name.split(' ')[0]} · {f.exam} so far
          </h2>

          {existing.length === 0 ? (
            <Empty icon={BookOpen} title="Nothing recorded yet">
              This will be the first entry for {f.exam}.
            </Empty>
          ) : (
            <Card className="divide-y divide-ink-900/6">
              {summary.perSubject.map(m => (
                <div key={m.code} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-ink-950 truncate">{m.subject}</p>
                    <p className="text-[10.5px] text-ink-faint font-mono">{m.code}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-extrabold text-ink-950 font-mono">{m.sObt}/{m.sMax}</p>
                    <p className={`text-[10.5px] font-extrabold ${m.sPct >= 33 ? 'text-garden-700' : 'text-rose-600'}`}>
                      {m.grade}
                    </p>
                  </div>
                  <button onClick={() => { tap(); deleteMarks(m.marks_id); }}
                          aria-label={`Delete ${m.subject} entry`}
                          className="w-9 h-9 shrink-0 rounded-xl text-rose-500 active:bg-rose-50 flex items-center justify-center transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="flex justify-between items-center px-4 py-3 bg-ink-50/60">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">Total</span>
                <span className="text-[13.5px] font-extrabold text-ink-950 font-mono">
                  {summary.obt}/{summary.max} · {summary.pct.toFixed(1)}%
                </span>
              </div>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

/* One-tap maximum marks, sized for a thumb, so "out of 80" is a single tap. */
function QuickMax({ values, current, onPick, label }) {
  return (
    <div className="-mt-1" role="group" aria-label={`Quick ${label}`}>
      <p className="text-[10.5px] font-bold text-ink-faint mb-1.5">Quick max</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map(v => {
          const on = String(current) === String(v);
          return (
            <button key={v} type="button" aria-pressed={on}
                    onClick={() => { tap(); onPick(String(v)); }}
                    className={`min-w-[2.75rem] h-9 px-2.5 rounded-xl text-[12.5px] font-extrabold font-mono border transition-colors active:scale-95 ${
                      on ? 'bg-ink-950 text-brass-300 border-ink-950'
                         : 'bg-white text-ink-700 border-ink-900/15 active:bg-brass-50'}`}>
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
