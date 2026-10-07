import React, { useState, useMemo } from 'react';
import {
  Users, Search, Phone, Trash2, Pencil, X, Save, Filter, ChevronRight, MessageCircle,
} from 'lucide-react';
import { CLASS_LIST } from '../../data/school';
import { useSchool } from '../../context/SchoolContext';
import { Screen, Card, Field, Btn, Pill, Sheet, Empty, inputCls, selectCls } from '../components/Chrome';
import { initialsOf } from '../../utils/format';
import { tap } from '../native';

/* ============================================================
   Students — the register.

   A searchable list of cards rather than a table, because a
   table does not work on a phone. Tapping a card opens a bottom
   sheet with that student's full details and the actions:
   toggle the fee, call the guardian, edit, or remove.
   ============================================================ */
export default function Students() {
  const { students, marks, toggleFee, deleteStudent, updateStudent } = useSchool();
  const [query, setQuery] = useState('');
  const [cls, setCls] = useState('ALL');
  const [feeFilter, setFeeFilter] = useState('ALL');
  const [open, setOpen] = useState(null);     // student being viewed
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter(s => {
      const mq = !q || (s.name || '').toLowerCase().includes(q) || String(s.roll_no).includes(q);
      const mc = cls === 'ALL' || s.class.toUpperCase() === cls.toUpperCase();
      const mf = feeFilter === 'ALL' || (s.fee_status || 'PAID') === feeFilter;
      return mq && mc && mf;
    });
  }, [students, query, cls, feeFilter]);

  const marksFor = (id) => marks.filter(m => m.student_id === id).length;
  const current = open ? students.find(s => s.student_id === open) : null;

  return (
    <Screen icon={Users} title="Student Register" subtitle={`${students.length} students on roll`}>
      {/* search + filters */}
      <Card className="p-3 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
          <input value={query} onChange={e => setQuery(e.target.value)}
                 placeholder="Search name or roll number"
                 aria-label="Search the register"
                 className={`${inputCls()} pl-10`} />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <select value={cls} onChange={e => setCls(e.target.value)} aria-label="Filter by class" className={selectCls()}>
            <option value="ALL">All classes</option>
            {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={feeFilter} onChange={e => setFeeFilter(e.target.value)} aria-label="Filter by fee status" className={selectCls()}>
            <option value="ALL">Any fee status</option>
            <option value="PAID">Paid only</option>
            <option value="PENDING">Pending only</option>
          </select>
        </div>
        {(query || cls !== 'ALL' || feeFilter !== 'ALL') && (
          <p className="text-[12px] text-ink-soft px-1">
            Showing <strong className="text-ink-950">{filtered.length}</strong> of {students.length}.
            <button onClick={() => { setQuery(''); setCls('ALL'); setFeeFilter('ALL'); }}
                    className="ml-2 font-bold text-brass-700">Clear</button>
          </p>
        )}
      </Card>

      {/* list */}
      <div className="mt-4 space-y-2.5">
        {filtered.length === 0 ? (
          <Empty icon={Search} title="No student matched"
                 action={<Btn variant="ghost" onClick={() => { setQuery(''); setCls('ALL'); setFeeFilter('ALL'); }}>Clear filters</Btn>}>
            Nothing in the register fits the current search and filters.
          </Empty>
        ) : filtered.map(s => (
          <button key={s.student_id} onClick={() => { tap(); setOpen(s.student_id); }}
                  className="w-full text-left active:scale-[.99] transition-transform">
            <Card className="p-3.5 flex items-center gap-3">
              <span className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center text-[12px] font-extrabold text-white ${
                s.fee_status === 'PAID' ? 'bg-ink-950' : 'bg-rose-500'
              }`}>
                {initialsOf(s.name)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-extrabold text-ink-950 truncate">{s.name}</span>
                <span className="block text-[11.5px] text-ink-soft mt-0.5">
                  Roll #{s.roll_no} · {s.class}-{s.section || 'A'} · {marksFor(s.student_id)} marks
                </span>
              </span>
              {s.fee_status === 'PAID'
                ? <Pill tone="garden">paid</Pill>
                : <Pill tone="rose">due</Pill>}
              <ChevronRight className="w-4 h-4 text-ink-300 shrink-0" />
            </Card>
          </button>
        ))}
      </div>

      {/* ---------- detail sheet ---------- */}
      <Sheet open={!!current && !editing && !confirm} onClose={() => setOpen(null)} title={current?.name}>
        {current && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Pill tone="ink">Roll #{current.roll_no}</Pill>
              <Pill tone="ink">{current.class}-{current.section || 'A'}</Pill>
              {current.house && <Pill tone="brass">{current.house}</Pill>}
            </div>

            <Card className="divide-y divide-ink-900/6">
              {[
                ["Father's name", current.father_name || '—'],
                ["Mother's name", current.mother_name || '—'],
                ['Contact', current.contact || '—'],
                ['Date of birth', current.dob || '—'],
                ['Student ID', current.student_id],
                ['Mark entries', String(marksFor(current.student_id))],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center gap-3 px-4 py-2.5">
                  <span className="text-[12px] text-ink-soft">{k}</span>
                  <span className="text-[12.5px] font-bold text-ink-950 text-right truncate">{v}</span>
                </div>
              ))}
            </Card>

            {/* fee toggle */}
            <button onClick={() => { tap(); toggleFee(current.student_id); }}
                    className={`w-full flex items-center justify-between gap-3 p-4 rounded-2xl border active:scale-[.98] transition-transform ${
                      current.fee_status === 'PAID'
                        ? 'bg-garden-50 border-garden-200' : 'bg-rose-50 border-rose-200'
                    }`}>
              <span className="text-left">
                <span className="block text-[13px] font-extrabold text-ink-950">
                  Fee status: {current.fee_status || 'PAID'}
                </span>
                <span className="block text-[11.5px] text-ink-soft mt-0.5">
                  Tap to mark as {current.fee_status === 'PAID' ? 'PENDING' : 'PAID'}
                </span>
              </span>
              <span className={`shrink-0 w-12 h-7 rounded-full p-1 transition-colors ${
                current.fee_status === 'PAID' ? 'bg-garden-500' : 'bg-rose-400'
              }`}>
                <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  current.fee_status === 'PAID' ? 'translate-x-5' : ''
                }`} />
              </span>
            </button>

            {/* contact actions */}
            {current.contact && (
              <div className="grid grid-cols-2 gap-2.5">
                <a href={`tel:${current.contact}`} className="block">
                  <Btn variant="garden"><Phone className="w-4 h-4" /> Call</Btn>
                </a>
                <a href={`https://wa.me/91${String(current.contact).replace(/\D/g, '').slice(-10)}`}
                   target="_blank" rel="noopener noreferrer" className="block">
                  <Btn variant="ghost"><MessageCircle className="w-4 h-4 text-garden-600" /> WhatsApp</Btn>
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <Btn variant="ink" onClick={() => setEditing(current)}>
                <Pencil className="w-4 h-4" /> Edit
              </Btn>
              <Btn variant="danger" onClick={() => setConfirm(current)}>
                <Trash2 className="w-4 h-4" /> Remove
              </Btn>
            </div>
          </div>
        )}
      </Sheet>

      {/* ---------- edit sheet ---------- */}
      <EditSheet student={editing} onClose={() => setEditing(null)}
                 onSave={(id, patch) => { updateStudent(id, patch); tap('success'); setEditing(null); }} />

      {/* ---------- delete confirmation ---------- */}
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title="Remove this student?">
        {confirm && (
          <div className="space-y-4">
            <Card className="p-4 bg-rose-50 border-rose-200">
              <p className="text-[14px] font-extrabold text-ink-950">{confirm.name}</p>
              <p className="text-[12px] text-ink-soft mt-0.5">
                Roll #{confirm.roll_no} · {confirm.class}-{confirm.section || 'A'} ·{' '}
                {marksFor(confirm.student_id)} mark entries
              </p>
            </Card>
            <p className="text-[12.5px] text-ink-soft leading-relaxed">
              This deletes the student and every mark recorded for them on this device.
              It cannot be undone.
            </p>
            <Btn variant="danger" onClick={() => {
              deleteStudent(confirm.student_id); tap('error'); setConfirm(null); setOpen(null);
            }}>
              <Trash2 className="w-4 h-4" /> Remove permanently
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirm(null)}>Keep the record</Btn>
          </div>
        )}
      </Sheet>
    </Screen>
  );
}

/* Edit form, shown in its own sheet. */
function EditSheet({ student, onClose, onSave }) {
  const [d, setD] = useState(student || {});
  React.useEffect(() => { setD(student || {}); }, [student]);
  if (!student) return null;

  const set = (k) => (e) => setD(x => ({ ...x, [k]: e.target.value }));

  return (
    <Sheet open={!!student} onClose={onClose} title="Edit student">
      <form onSubmit={(e) => {
        e.preventDefault();
        onSave(student.student_id, {
          roll_no: d.roll_no, name: (d.name || '').toUpperCase(),
          class: d.class, section: d.section, father_name: d.father_name,
          mother_name: d.mother_name, contact: d.contact, house: d.house,
          fee_status: d.fee_status,
        });
      }} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Roll number">
            <input value={d.roll_no || ''} onChange={set('roll_no')} inputMode="numeric" className={inputCls()} />
          </Field>
          <Field label="Class">
            <select value={d.class || '10TH'} onChange={set('class')} className={selectCls()}>
              {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Full name">
          <input value={d.name || ''}
                 onChange={e => setD(x => ({ ...x, name: e.target.value.toUpperCase() }))}
                 className={`${inputCls()} uppercase font-bold`} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Section">
            <select value={d.section || 'A'} onChange={set('section')} className={selectCls()}>
              {['A', 'B', 'C'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="House">
            <select value={d.house || 'Jyoti'} onChange={set('house')} className={selectCls()}>
              {['Shakti', 'Vidya', 'Prakriti', 'Jyoti'].map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Father's name">
          <input value={d.father_name || ''} onChange={set('father_name')} className={inputCls()} />
        </Field>
        <Field label="Mother's name">
          <input value={d.mother_name || ''} onChange={set('mother_name')} className={inputCls()} />
        </Field>
        <Field label="Contact number">
          <input value={d.contact || ''} onChange={set('contact')} inputMode="tel" className={inputCls()} />
        </Field>
        <Field label="Fee status">
          <select value={d.fee_status || 'PAID'} onChange={set('fee_status')} className={selectCls()}>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
          </select>
        </Field>

        <Btn type="submit"><Save className="w-4 h-4" /> Save changes</Btn>
        <Btn type="button" variant="ghost" onClick={onClose}><X className="w-4 h-4" /> Cancel</Btn>
      </form>
    </Sheet>
  );
}
