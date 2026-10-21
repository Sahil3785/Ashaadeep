import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard, PlusCircle, UserPlus, Users, Search, Trash2, LogOut, Lock,
  CheckCircle2, AlertCircle, TrendingUp, IndianRupee, FileSpreadsheet, RotateCcw,
  Filter, Download, BookOpen, Pencil, X, Save, ClipboardList,
} from 'lucide-react';
import { SCHOOL, CLASS_LIST, EXAM_TERMS, SUBJECT_CODES, MAX_PRESETS } from '../data/school';
import { summarise } from '../data/syllabus';
import { useSchool } from '../context/SchoolContext';
import { PageHeader, Reveal, Badge, Tabs, StatTile, Modal, ProgressBar } from '../components/UI';
import { SkTable, EmptyState, Spinner } from '../components/Loaders';
import { useDelay, useAnchorOnChange } from '../hooks';
import { inr, initialsOf } from '../utils/format';

export default function FacultyDashboard() {
  const { signOutTeacher, resetDemoData, students } = useSchool();
  const [tab, setTab] = useState('overview');
  // First mount only — switching dashboard tabs must not reflow the page.
  const ready = useDelay(450);
  // Dashboard tabs vary a lot in height — keep the tab bar in view when switching.
  const tabsRef = useAnchorOnChange(tab);

  const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'marks', label: 'Enter marks', icon: PlusCircle },
    { id: 'enroll', label: 'Enrol student', icon: UserPlus },
    { id: 'register', label: 'Register', icon: Users, count: students.length },
  ];

  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        eyebrow="Faculty area"
        title="Faculty dashboard"
        lead="Enter marks, enrol students and manage the fee ledger. Everything you save here is written to this browser's local storage, which is what the public result and fee pages read from."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="garden" icon={CheckCircle2}>Session active</Badge>
          <button onClick={signOutTeacher} className="btn-danger text-xs py-2">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </PageHeader>

      <div className="max-w-6xl mx-auto px-4 pb-20">
        <Reveal>
          <div ref={tabsRef} className="flex justify-center mb-8 scroll-mt-28">
            <Tabs tabs={TABS} active={tab} onChange={setTab} label="Dashboard sections" />
          </div>
        </Reveal>

        {tab === 'overview' && <Overview ready={ready} />}
        {tab === 'marks' && <MarksEntry />}
        {tab === 'enroll' && <EnrolStudent />}
        {tab === 'register' && <Register ready={ready} />}

        {/* ---------- Reset demo data ---------- */}
        <Reveal>
          <div className="card p-6 mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-brass-200 bg-brass-50/50">
            <div className="flex gap-3.5">
              <RotateCcw className="w-5 h-5 text-brass-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[13.5px] font-extrabold text-ink-950">Restore the demo data</p>
                <p className="text-[12px] text-ink-soft mt-0.5 leading-relaxed max-w-lg">
                  Puts the student register and all marks back to the original ten sample records. Anything you
                  have added or changed in this browser is discarded. Nothing on a server is touched.
                </p>
              </div>
            </div>
            <button onClick={() => { if (confirm('Discard your changes and restore the original demo records?')) resetDemoData(); }}
                    className="btn-ghost text-xs shrink-0">
              <RotateCcw className="w-3.5 h-3.5" /> Reset data
            </button>
          </div>
        </Reveal>
      </div>
    </>
  );
}

/* ============================================================
   TAB 1 — OVERVIEW
   ============================================================ */
function Overview({ ready }) {
  const { stats, students, marks, payments } = useSchool();

  const collected = payments.reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const pendingList = students.filter(s => s.fee_status !== 'PAID');

  return (
    <div className="space-y-6">
      {/* headline tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Reveal delay={0}><StatTile icon={Users} value={stats.totalStudents} label="Students on roll" note={`Across ${stats.classCount} classes`} tone="ink" /></Reveal>
        <Reveal delay={80}><StatTile icon={CheckCircle2} value={stats.collectionRate} suffix="%" label="Fee collection" note={`${stats.paid} paid · ${stats.pending} pending`} tone="garden" /></Reveal>
        <Reveal delay={160}><StatTile icon={FileSpreadsheet} value={stats.totalMarks} label="Mark entries" note="All terms and subjects" tone="brass" /></Reveal>
        <Reveal delay={240}><StatTile icon={IndianRupee} value={payments.length} label="Payments logged" note={collected ? `${inr(collected)} total` : 'This browser session'} tone="brass" /></Reveal>
      </div>

      {/* class-wise breakdown */}
      <Reveal>
        <div className="panel p-6 sm:p-7">
          <h3 className="font-display text-lg font-extrabold text-ink-950 flex items-center gap-2.5">
            <ClipboardList className="w-5 h-5 text-brass-600" /> Class-wise strength and dues
          </h3>
          <p className="text-[13px] text-ink-soft mt-1.5 mb-6">
            Bar length is the number of students; the figure beside it is how many have fees outstanding.
          </p>

          {!ready ? <SkTable rows={4} cols={3} /> : (
            <div className="space-y-4">
              {stats.byClass.map(c => (
                <div key={c.cls} className="flex items-center gap-4">
                  <span className="shrink-0 w-14 text-[12.5px] font-extrabold text-ink-950">{c.cls}</span>
                  <div className="flex-1">
                    <ProgressBar
                      value={c.count}
                      max={Math.max(...stats.byClass.map(x => x.count), 1)}
                      tone={c.pending > 0 ? 'brass' : 'garden'}
                      label={`${c.count} ${c.count === 1 ? 'student' : 'students'}`}
                      showValue={false}
                    />
                  </div>
                  <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                    c.pending > 0 ? 'bg-rose-50 text-rose-700' : 'bg-garden-50 text-garden-700'
                  }`}>
                    {c.pending > 0 ? `${c.pending} pending` : 'All clear'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {/* pending dues list */}
      <Reveal>
        <div className="panel p-6 sm:p-7">
          <h3 className="font-display text-lg font-extrabold text-ink-950 flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-500" /> Outstanding fees
          </h3>
          <p className="text-[13px] text-ink-soft mt-1.5 mb-5">
            These students cannot open their marksheet until the dues are cleared.
          </p>

          {pendingList.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-garden-50 border border-garden-200">
              <CheckCircle2 className="w-5 h-5 text-garden-600 shrink-0" />
              <p className="text-[13px] font-semibold text-garden-900">
                No outstanding dues — every student on the register is marked paid.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingList.map(s => (
                <div key={s.student_id} className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200">
                  <span className="shrink-0 w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center text-[11px] font-extrabold">
                    {initialsOf(s.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-extrabold text-ink-950 truncate">{s.name}</p>
                    <p className="text-[11.5px] text-ink-soft">
                      Roll #{s.roll_no} · Class {s.class}-{s.section || 'A'} · {s.contact || 'no contact on file'}
                    </p>
                  </div>
                  <Badge tone="rose">Pending</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}

/* ============================================================
   TAB 2 — MARKS ENTRY
   ============================================================ */
function MarksEntry() {
  const { students, marks, saveMarks, toast } = useSchool();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    cls: '10TH', studentId: '', exam: 'UT-1',
    subject: 'Mathematics Standard', code: 'MAT-103',
    theoryMax: '30', theoryObt: '', practMax: '10', practObt: '',
    feeOverride: '',
  });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => { setF(x => ({ ...x, [k]: e.target.value })); setErrors(x => ({ ...x, [k]: undefined })); };

  const classStudents = students.filter(s => s.class.toUpperCase() === f.cls.toUpperCase());
  const selected = students.find(s => s.student_id === f.studentId);

  // What this student already has for the chosen term.
  const existing = useMemo(() => {
    if (!f.studentId) return [];
    return marks.filter(m => m.student_id === f.studentId && m.exam_name === f.exam);
  }, [marks, f.studentId, f.exam]);

  const existingSummary = existing.length ? summarise(existing) : null;

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!f.studentId) next.studentId = 'Choose a student first.';

    const tMax = Number(f.theoryMax), tObt = Number(f.theoryObt);
    const pMax = Number(f.practMax), pObt = Number(f.practObt);

    if (!(tMax > 0)) next.theoryMax = 'Theory maximum must be greater than zero.';
    if (f.theoryObt === '' || tObt < 0) next.theoryObt = 'Enter the theory marks obtained.';
    else if (tObt > tMax) next.theoryObt = `Cannot exceed the maximum of ${tMax}.`;

    if (pMax < 0) next.practMax = 'Internal maximum cannot be negative.';
    if (f.practObt === '' || pObt < 0) next.practObt = 'Enter the internal marks obtained.';
    else if (pObt > pMax) next.practObt = `Cannot exceed the maximum of ${pMax}.`;

    if (Object.keys(next).length) {
      setErrors(next);
      toast('Please correct the highlighted fields.', 'error', 'Check the entry');
      return;
    }

    setBusy(true);
    await new Promise(r => setTimeout(r, 500));
    saveMarks({
      student_id: f.studentId, class: f.cls, exam_name: f.exam,
      subject: f.subject, code: f.code,
      theory_max: tMax, theory_obt: tObt,
      practical_max: pMax, practical_obt: pObt,
    }, f.feeOverride || null);
    setBusy(false);
    setF(x => ({ ...x, theoryObt: '', practObt: '' }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

      {/* ---- form ---- */}
      <div className="lg:col-span-7">
        <Reveal>
          <form onSubmit={submit} className="panel p-6 sm:p-7">
            <h3 className="font-display text-lg font-extrabold text-ink-950 flex items-center gap-2.5 mb-5">
              <PlusCircle className="w-5 h-5 text-brass-600" /> Record subject marks
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="mcls" className="field-label">Class</label>
                <select id="mcls" value={f.cls}
                        onChange={e => setF(x => ({ ...x, cls: e.target.value, studentId: '' }))}
                        className="field font-semibold">
                  {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="mstu" className="field-label">Student <span className="text-rose-500">*</span></label>
                <select id="mstu" value={f.studentId} onChange={set('studentId')}
                        className={`field font-semibold ${errors.studentId ? 'field-error' : ''}`}>
                  <option value="">— choose a student —</option>
                  {classStudents.map(s => (
                    <option key={s.student_id} value={s.student_id}>
                      #{s.roll_no} · {s.name} {s.fee_status !== 'PAID' ? '(fee pending)' : ''}
                    </option>
                  ))}
                </select>
                {errors.studentId ? <Err>{errors.studentId}</Err>
                  : classStudents.length === 0 && (
                    <p className="text-[11px] text-brass-700 font-semibold mt-1.5">
                      No students enrolled in {f.cls} yet — add one on the "Enrol student" tab.
                    </p>
                  )}
              </div>

              <div>
                <label htmlFor="mexam" className="field-label">Examination term</label>
                <select id="mexam" value={f.exam} onChange={set('exam')} className="field font-semibold">
                  {EXAM_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="msub" className="field-label">Subject</label>
                <select id="msub" value={f.subject}
                        onChange={e => setF(x => ({ ...x, subject: e.target.value, code: SUBJECT_CODES[e.target.value] || 'SUB-001' }))}
                        className="field font-semibold">
                  {Object.keys(SUBJECT_CODES).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <p className="text-[11px] text-ink-faint mt-1.5 font-mono">Code: {f.code}</p>
              </div>

              <div>
                <label htmlFor="tmax" className="field-label">Theory maximum</label>
                <input id="tmax" type="number" min="0" value={f.theoryMax} onChange={set('theoryMax')}
                       className={`field ${errors.theoryMax ? 'field-error' : ''}`} />
                {errors.theoryMax && <Err>{errors.theoryMax}</Err>}
                <QuickMax values={MAX_PRESETS.theory} current={f.theoryMax} label="Theory maximum"
                          onPick={v => set('theoryMax')({ target: { value: v } })} />
              </div>

              <div>
                <label htmlFor="tobt" className="field-label">Theory obtained <span className="text-rose-500">*</span></label>
                <input id="tobt" type="number" min="0" value={f.theoryObt} onChange={set('theoryObt')}
                       placeholder="e.g. 28"
                       className={`field font-bold ${errors.theoryObt ? 'field-error' : ''}`} />
                {errors.theoryObt && <Err>{errors.theoryObt}</Err>}
              </div>

              <div>
                <label htmlFor="pmax" className="field-label">Internal / practical maximum</label>
                <input id="pmax" type="number" min="0" value={f.practMax} onChange={set('practMax')}
                       className={`field ${errors.practMax ? 'field-error' : ''}`} />
                {errors.practMax && <Err>{errors.practMax}</Err>}
                <QuickMax values={MAX_PRESETS.internal} current={f.practMax} label="Internal maximum"
                          onPick={v => set('practMax')({ target: { value: v } })} />
              </div>

              <div>
                <label htmlFor="pobt" className="field-label">Internal obtained <span className="text-rose-500">*</span></label>
                <input id="pobt" type="number" min="0" value={f.practObt} onChange={set('practObt')}
                       placeholder="e.g. 9"
                       className={`field font-bold ${errors.practObt ? 'field-error' : ''}`} />
                {errors.practObt && <Err>{errors.practObt}</Err>}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="mfee" className="field-label">Also set the fee status <span className="text-ink-faint font-normal">(optional)</span></label>
                <select id="mfee" value={f.feeOverride} onChange={set('feeOverride')} className="field font-semibold">
                  <option value="">Leave the fee status unchanged</option>
                  <option value="PAID">Mark PAID — releases the marksheet</option>
                  <option value="PENDING">Mark PENDING — withholds the marksheet</option>
                </select>
              </div>
            </div>

            {/* live preview of the entry being saved */}
            {f.theoryObt !== '' && f.practObt !== '' && (
              <div className="mt-5 p-4 rounded-2xl bg-ink-50 border border-ink-900/8">
                {(() => {
                  const total = (Number(f.theoryObt) || 0) + (Number(f.practObt) || 0);
                  const max = (Number(f.theoryMax) || 0) + (Number(f.practMax) || 0);
                  const pct = max ? (total / max) * 100 : 0;
                  return (
                    <>
                      <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-ink-faint mb-2">This entry</p>
                      <p className="text-[13.5px] font-bold text-ink-950">
                        {total} out of {max} — {pct.toFixed(1)}%
                      </p>
                      <div className="mt-2.5">
                        <ProgressBar value={pct} tone={pct >= 75 ? 'garden' : pct >= 50 ? 'brass' : 'rose'} showValue={false} />
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full mt-5">
              {busy ? <><Spinner className="w-4 h-4" /> Saving…</>
                    : <><Save className="w-4 h-4" /> Save to the official record</>}
            </button>

            <p className="text-[11px] text-ink-faint mt-3 leading-relaxed">
              Saving replaces any existing entry for the same student, term and subject — so correcting a mistake
              is just a matter of entering it again.
            </p>
          </form>
        </Reveal>
      </div>

      {/* ---- existing entries for the selected student ---- */}
      <aside className="lg:col-span-5">
        <Reveal dir="left">
          <div className="panel p-6 sm:p-7 lg:sticky lg:top-28">
            <h3 className="font-display text-base font-extrabold text-ink-950 flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-garden-600" /> Already recorded
            </h3>

            {!selected ? (
              <p className="text-[13px] text-ink-soft mt-3 leading-relaxed">
                Choose a student and term on the left to see what has already been entered for them.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3 mt-4 pb-4 border-b border-ink-900/8">
                  <span className="w-10 h-10 rounded-xl bg-ink-950 text-brass-400 flex items-center justify-center text-[12px] font-extrabold shrink-0">
                    {initialsOf(selected.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-extrabold text-ink-950 truncate">{selected.name}</p>
                    <p className="text-[11.5px] text-ink-soft">
                      Roll #{selected.roll_no} · {selected.class}-{selected.section || 'A'} ·{' '}
                      <span className={selected.fee_status === 'PAID' ? 'text-garden-700 font-bold' : 'text-rose-600 font-bold'}>
                        {selected.fee_status}
                      </span>
                    </p>
                  </div>
                </div>

                {existing.length === 0 ? (
                  <p className="text-[13px] text-ink-soft mt-4 leading-relaxed">
                    Nothing recorded for <strong className="text-ink-950">{f.exam}</strong> yet. This will be the
                    first entry.
                  </p>
                ) : (
                  <>
                    <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-ink-faint mt-4 mb-3">
                      {f.exam} — {existing.length} {existing.length === 1 ? 'subject' : 'subjects'}
                    </p>
                    <div className="space-y-2">
                      {existingSummary.perSubject.map(m => (
                        <div key={m.code} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-ink-900/8">
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-bold text-ink-950 truncate">{m.subject}</p>
                            <p className="text-[10.5px] text-ink-faint font-mono">{m.code}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[12.5px] font-extrabold text-ink-950 font-mono">{m.sObt}/{m.sMax}</p>
                            <p className={`text-[10.5px] font-extrabold ${m.sPct >= 33 ? 'text-garden-700' : 'text-rose-600'}`}>
                              {m.grade}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-ink-900/8 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">Total</p>
                        <p className="text-[14px] font-extrabold text-ink-950 font-mono">{existingSummary.obt}/{existingSummary.max}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-faint">Percentage</p>
                        <p className="text-[14px] font-extrabold text-ink-950 font-mono">{existingSummary.pct.toFixed(2)}%</p>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </Reveal>
      </aside>
    </div>
  );
}

/* ============================================================
   TAB 3 — ENROL STUDENT
   ============================================================ */
function EnrolStudent() {
  const { addStudent, toast } = useSchool();
  const [busy, setBusy] = useState(false);
  const blank = {
    cls: '10TH', section: 'A', roll: '', name: '', father: '', mother: '',
    contact: '', dob: '', house: 'Jyoti', fee: 'PAID',
  };
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => { setF(x => ({ ...x, [k]: e.target.value })); setErrors(x => ({ ...x, [k]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!String(f.roll).trim()) next.roll = 'Assign a roll number.';
    if (!f.name.trim()) next.name = "Enter the student's full name.";
    if (f.contact && !/^[6-9]\d{9}$/.test(f.contact.replace(/\D/g, ''))) {
      next.contact = 'Enter a valid 10-digit Indian mobile number, or leave it blank.';
    }

    if (Object.keys(next).length) {
      setErrors(next);
      document.getElementById(Object.keys(next)[0] === 'roll' ? 'eroll' : Object.keys(next)[0] === 'name' ? 'ename' : 'econtact')?.focus();
      toast('Please correct the highlighted fields.', 'error', 'Check the form');
      return;
    }

    setBusy(true);
    await new Promise(r => setTimeout(r, 550));
    const ok = addStudent({
      roll_no: String(f.roll).trim(), name: f.name.trim().toUpperCase(),
      class: f.cls, section: f.section, father_name: f.father.trim(),
      mother_name: f.mother.trim(), contact: f.contact.trim(),
      dob: f.dob, house: f.house, fee_status: f.fee,
    });
    setBusy(false);
    if (ok) setF({ ...blank, cls: f.cls, section: f.section });
  };

  return (
    <Reveal>
      <form onSubmit={submit} className="panel p-6 sm:p-8 max-w-3xl mx-auto">
        <h3 className="font-display text-lg font-extrabold text-ink-950 flex items-center gap-2.5 mb-5">
          <UserPlus className="w-5 h-5 text-garden-600" /> Enrol a new student
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ecls" className="field-label">Class</label>
            <select id="ecls" value={f.cls} onChange={set('cls')} className="field font-semibold">
              {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="esec" className="field-label">Section</label>
            <select id="esec" value={f.section} onChange={set('section')} className="field font-semibold">
              {['A', 'B', 'C'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="eroll" className="field-label">Roll number <span className="text-rose-500">*</span></label>
            <input id="eroll" type="number" min="1" value={f.roll} onChange={set('roll')}
                   placeholder="e.g. 15" className={`field ${errors.roll ? 'field-error' : ''}`} />
            {errors.roll && <Err>{errors.roll}</Err>}
          </div>

          <div>
            <label htmlFor="edob" className="field-label">Date of birth</label>
            <input id="edob" type="date" value={f.dob} onChange={set('dob')} className="field" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="ename" className="field-label">Full name <span className="text-rose-500">*</span></label>
            <input id="ename" value={f.name}
                   onChange={e => { setF(x => ({ ...x, name: e.target.value.toUpperCase() })); setErrors(x => ({ ...x, name: undefined })); }}
                   placeholder="e.g. AARAV SHARMA"
                   className={`field uppercase font-bold ${errors.name ? 'field-error' : ''}`} />
            {errors.name && <Err>{errors.name}</Err>}
          </div>

          <div>
            <label htmlFor="efather" className="field-label">Father's name</label>
            <input id="efather" value={f.father} onChange={set('father')} placeholder="e.g. Rajesh Sharma" className="field" />
          </div>

          <div>
            <label htmlFor="emother" className="field-label">Mother's name</label>
            <input id="emother" value={f.mother} onChange={set('mother')} placeholder="e.g. Sunita Sharma" className="field" />
          </div>

          <div>
            <label htmlFor="econtact" className="field-label">Contact number</label>
            <input id="econtact" value={f.contact} onChange={set('contact')} inputMode="tel"
                   placeholder="e.g. 9812045678" className={`field ${errors.contact ? 'field-error' : ''}`} />
            {errors.contact && <Err>{errors.contact}</Err>}
          </div>

          <div>
            <label htmlFor="ehouse" className="field-label">House</label>
            <select id="ehouse" value={f.house} onChange={set('house')} className="field font-semibold">
              {['Shakti', 'Vidya', 'Prakriti', 'Jyoti'].map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="efee" className="field-label">Initial fee status</label>
            <select id="efee" value={f.fee} onChange={set('fee')} className="field font-semibold">
              <option value="PAID">PAID — marksheet accessible</option>
              <option value="PENDING">PENDING — marksheet withheld</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={busy} className="btn-garden w-full mt-6">
          {busy ? <><Spinner className="w-4 h-4" /> Adding to the register…</>
                : <><UserPlus className="w-4 h-4" /> Add to the register</>}
        </button>

        <p className="text-[11px] text-ink-faint mt-3 leading-relaxed">
          A roll number must be unique within its class and section. If it is already taken you will be told, and
          nothing is overwritten.
        </p>
      </form>
    </Reveal>
  );
}

/* ============================================================
   TAB 4 — REGISTER
   ============================================================ */
function Register({ ready }) {
  const { students, marks, deleteStudent, toggleFee, updateStudent } = useSchool();
  const [query, setQuery] = useState('');
  const [cls, setCls] = useState('ALL');
  const [feeFilter, setFeeFilter] = useState('ALL');
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter(s => {
      const matchQ = !q || (s.name || '').toLowerCase().includes(q) || String(s.roll_no).includes(q);
      const matchC = cls === 'ALL' || s.class.toUpperCase() === cls.toUpperCase();
      const matchF = feeFilter === 'ALL' || (s.fee_status || 'PAID') === feeFilter;
      return matchQ && matchC && matchF;
    });
  }, [students, query, cls, feeFilter]);

  // Export the filtered view as CSV — useful for the office copy.
  const exportCsv = () => {
    const header = ['Roll', 'Name', 'Class', 'Section', 'Father', 'Mother', 'Contact', 'House', 'Fee status'];
    const rows = filtered.map(s => [
      s.roll_no, s.name, s.class, s.section || 'A', s.father_name || '',
      s.mother_name || '', s.contact || '', s.house || '', s.fee_status || 'PAID',
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `AshaDeep_Register_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const marksCountFor = (id) => marks.filter(m => m.student_id === id).length;

  return (
    <div className="space-y-5">
      {/* filters */}
      <Reveal>
        <div className="panel p-5">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                     placeholder="Search by name or roll number…" className="field pl-10"
                     aria-label="Search the register" />
            </div>
            <div className="relative lg:w-40">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
              <select value={cls} onChange={e => setCls(e.target.value)} className="field pl-10 font-semibold" aria-label="Filter by class">
                <option value="ALL">All classes</option>
                {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <select value={feeFilter} onChange={e => setFeeFilter(e.target.value)}
                    className="field font-semibold lg:w-40" aria-label="Filter by fee status">
              <option value="ALL">Any fee status</option>
              <option value="PAID">Paid only</option>
              <option value="PENDING">Pending only</option>
            </select>
            <button onClick={exportCsv} disabled={!filtered.length} className="btn-ink text-xs shrink-0">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          <p className="text-[12px] text-ink-soft mt-3">
            Showing <strong className="text-ink-950">{filtered.length}</strong> of {students.length} students.
            {(query || cls !== 'ALL' || feeFilter !== 'ALL') && (
              <button onClick={() => { setQuery(''); setCls('ALL'); setFeeFilter('ALL'); }}
                      className="ml-2 font-bold text-brass-700 hover:underline">Clear filters</button>
            )}
          </p>
        </div>
      </Reveal>

      {/* table */}
      {!ready ? <SkTable rows={8} cols={6} /> :
       filtered.length === 0 ? (
        <EmptyState icon={Users} title="No student matched these filters"
                    action={<button onClick={() => { setQuery(''); setCls('ALL'); setFeeFilter('ALL'); }} className="btn-ghost text-xs">Clear filters</button>}>
          Nothing in the register fits the current search and filters. Clear them to see all {students.length} students.
        </EmptyState>
      ) : (
        <Reveal>
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-950 text-white text-left">
                    <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider">Roll</th>
                    <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider">Student</th>
                    <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider">Class</th>
                    <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider hidden md:table-cell">Parents</th>
                    <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider hidden lg:table-cell">Contact</th>
                    <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider">Marks</th>
                    <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider">Fee</th>
                    <th className="p-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-900/6">
                  {filtered.map((s, i) => (
                    <tr key={s.student_id} className={`${i % 2 ? 'bg-parchment-100/50' : 'bg-white'} hover:bg-brass-50/60 transition-colors`}>
                      <td className="p-3.5 font-mono font-extrabold text-ink-950">#{s.roll_no}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="shrink-0 w-8 h-8 rounded-xl bg-ink-950 text-brass-400 flex items-center justify-center text-[10px] font-extrabold">
                            {initialsOf(s.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-ink-950 text-[13px] truncate">{s.name}</p>
                            {s.house && <p className="text-[10.5px] text-ink-faint">{s.house} house</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-ink-700 text-[13px] whitespace-nowrap">{s.class}-{s.section || 'A'}</td>
                      <td className="p-3.5 text-ink-soft text-[12.5px] hidden md:table-cell">
                        {s.father_name || '—'}
                        {s.mother_name && <span className="block text-[11px] text-ink-faint">{s.mother_name}</span>}
                      </td>
                      <td className="p-3.5 text-ink-soft text-[12.5px] font-mono hidden lg:table-cell">{s.contact || '—'}</td>
                      <td className="p-3.5">
                        <span className="chip-ink text-[10px]">{marksCountFor(s.student_id)}</span>
                      </td>
                      <td className="p-3.5">
                        <button onClick={() => toggleFee(s.student_id)}
                                title="Click to switch between PAID and PENDING"
                                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold border transition-colors whitespace-nowrap ${
                                  s.fee_status === 'PAID'
                                    ? 'bg-garden-50 text-garden-700 border-garden-200 hover:bg-garden-100'
                                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                }`}>
                          {s.fee_status || 'PAID'}
                        </button>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`} title="Edit details"
                                  className="w-8 h-8 rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900 flex items-center justify-center transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirmDelete(s)} aria-label={`Remove ${s.name}`} title="Remove student"
                                  className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      )}

      {/* edit dialog */}
      <EditStudentModal student={editing} onClose={() => setEditing(null)} onSave={updateStudent} />

      {/* delete confirmation */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
             icon={Trash2} title="Remove this student?"
             subtitle="This also deletes every mark entry linked to them. It cannot be undone from here — only a data reset would bring the demo records back."
             size="sm">
        {confirmDelete && (
          <>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 mb-5">
              <p className="text-[13.5px] font-extrabold text-ink-950">{confirmDelete.name}</p>
              <p className="text-[12px] text-ink-soft mt-0.5">
                Roll #{confirmDelete.roll_no} · Class {confirmDelete.class}-{confirmDelete.section || 'A'} ·{' '}
                {marksCountFor(confirmDelete.student_id)} mark entries
              </p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => { deleteStudent(confirmDelete.student_id); setConfirmDelete(null); }}
                      className="btn bg-rose-600 text-white hover:bg-rose-700 flex-1">
                <Trash2 className="w-4 h-4" /> Remove permanently
              </button>
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Keep it</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

/* Edit dialog for one student row. */
function EditStudentModal({ student, onClose, onSave }) {
  const [draft, setDraft] = useState(student || {});

  // Re-seed the draft whenever a different row is opened.
  React.useEffect(() => { setDraft(student || {}); }, [student]);

  if (!student) return null;

  const set = (k) => (e) => setDraft(d => ({ ...d, [k]: e.target.value }));

  const save = (e) => {
    e.preventDefault();
    onSave(student.student_id, {
      roll_no: draft.roll_no, name: (draft.name || '').toUpperCase(),
      class: draft.class, section: draft.section,
      father_name: draft.father_name, mother_name: draft.mother_name,
      contact: draft.contact, house: draft.house, fee_status: draft.fee_status,
    });
    onClose();
  };

  return (
    <Modal open={!!student} onClose={onClose} icon={Pencil}
           title="Edit student details" subtitle={`Student ID ${student.student_id}`} size="md">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Roll number</label>
            <input value={draft.roll_no || ''} onChange={set('roll_no')} className="field" />
          </div>
          <div>
            <label className="field-label">Class</label>
            <select value={draft.class || '10TH'} onChange={set('class')} className="field font-semibold">
              {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Full name</label>
            <input value={draft.name || ''}
                   onChange={e => setDraft(d => ({ ...d, name: e.target.value.toUpperCase() }))}
                   className="field uppercase font-bold" />
          </div>
          <div>
            <label className="field-label">Section</label>
            <select value={draft.section || 'A'} onChange={set('section')} className="field font-semibold">
              {['A', 'B', 'C'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">House</label>
            <select value={draft.house || 'Jyoti'} onChange={set('house')} className="field font-semibold">
              {['Shakti', 'Vidya', 'Prakriti', 'Jyoti'].map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Father's name</label>
            <input value={draft.father_name || ''} onChange={set('father_name')} className="field" />
          </div>
          <div>
            <label className="field-label">Mother's name</label>
            <input value={draft.mother_name || ''} onChange={set('mother_name')} className="field" />
          </div>
          <div>
            <label className="field-label">Contact number</label>
            <input value={draft.contact || ''} onChange={set('contact')} inputMode="tel" className="field" />
          </div>
          <div>
            <label className="field-label">Fee status</label>
            <select value={draft.fee_status || 'PAID'} onChange={set('fee_status')} className="field font-semibold">
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button type="submit" className="btn-primary flex-1">
            <Save className="w-4 h-4" /> Save changes
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* One-tap maximum marks under a Max field, so "out of 80" is a single tap. */
function QuickMax({ values, current, onPick, label }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2" role="group" aria-label={`Quick ${label}`}>
      {values.map(v => {
        const on = String(current) === String(v);
        return (
          <button key={v} type="button" onClick={() => onPick(String(v))} aria-pressed={on}
                  className={`min-w-[2.25rem] px-2 py-1 rounded-lg text-[11px] font-bold font-mono border transition-colors ${
                    on ? 'bg-ink-950 text-brass-300 border-ink-950'
                       : 'bg-white text-ink-700 border-ink-900/15 hover:border-brass-400 hover:bg-brass-50'}`}>
            {v}
          </button>
        );
      })}
    </div>
  );
}

function Err({ children }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 mt-1.5">
      <AlertCircle className="w-3 h-3 shrink-0" /> {children}
    </p>
  );
}
