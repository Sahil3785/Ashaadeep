import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IndianRupee, CheckCircle2, Plus, RefreshCw, Phone, MessageCircle, Megaphone,
  CalendarDays, Pencil, Trash2, Eye, EyeOff, Save, ClipboardList, Search,
} from 'lucide-react';
import { CLASS_LIST } from '../../data/school';
import { useSchool } from '../../context/SchoolContext';
import { staffApi, officeApi } from '../../lib/api';
import { Reveal, Badge, Modal } from '../../components/UI';
import { SkTable, EmptyState, Spinner } from '../../components/Loaders';
import { inr, dateTime, longDate } from '../../utils/format';

/* Loads a list from the server and reloads on demand. */
function useServerList(load) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    setError(null);
    try { setRows(await load()); } catch (e) { setError(e.message); setRows([]); }
  }, [load]);
  useEffect(() => { reload(); }, [reload]);
  return { rows, error, reload };
}

function PanelTitle({ icon: Icon, title, lead, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
      <div>
        <h3 className="font-display text-lg font-extrabold text-ink-950 flex items-center gap-2.5">
          <Icon className="w-5 h-5 text-brass-600" /> {title}
        </h3>
        {lead && <p className="text-[13px] text-ink-soft mt-1.5 max-w-2xl">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

function LoadError({ message, onRetry }) {
  return (
    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-[13px] text-rose-800 flex items-center justify-between gap-3">
      <span>{message}</span>
      <button onClick={onRetry} className="btn-ghost text-xs py-1.5"><RefreshCw className="w-3.5 h-3.5" /> Retry</button>
    </div>
  );
}

/* ============================================================
   FEES — verify online payments, record counter payments
   ============================================================ */
export function FeesTab() {
  const { toast, refresh } = useSchool();
  const { rows, error, reload } = useServerList(staffApi.listPayments);
  const [busyId, setBusyId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('unverified');

  const shown = useMemo(() => (rows || []).filter(p =>
    filter === 'all' ? true : filter === 'unverified' ? !p.student_id : !!p.student_id), [rows, filter]);
  const unverified = (rows || []).filter(p => !p.student_id).length;
  const total = (rows || []).reduce((a, p) => a + Number(p.amount || 0), 0);

  const verify = async (p) => {
    setBusyId(p.id);
    try {
      const res = await officeApi.settleFee(p);
      if (res?.ok) {
        toast(`${p.student_name}'s fee is now PAID and the marksheet is released.`, 'success', 'Payment verified');
        await Promise.all([reload(), refresh()]);
      } else {
        toast(res?.reason === 'student_not_found'
          ? `No active student with roll ${p.roll_no} in class ${p.class}. Check the register, then mark the fee by hand.`
          : 'This payment could not be matched.', 'error', 'Not verified');
      }
    } catch (e) {
      toast(e.message, 'error', 'Not verified');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <Reveal>
        <div className="panel p-6 sm:p-7">
          <PanelTitle
            icon={IndianRupee}
            title="Fee payments"
            lead="Payments made on the website are recorded here but do not clear dues on their own. Check each one against the bank or UPI statement, then verify it to mark the student PAID."
            action={<button onClick={() => setShowForm(true)} className="btn-primary text-xs shrink-0"><Plus className="w-4 h-4" /> Record office payment</button>}
          />

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {[['unverified', `To verify (${unverified})`], ['verified', 'Verified'], ['all', 'All']].map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                        filter === id ? 'bg-ink-950 text-brass-300 border-ink-950' : 'bg-white text-ink-700 border-ink-900/12 hover:bg-ink-50'}`}>
                {label}
              </button>
            ))}
            <span className="ml-auto text-[12px] text-ink-soft">Last 200 payments · <strong className="text-ink-950">{inr(total)}</strong></span>
          </div>

          {error ? <LoadError message={error} onRetry={reload} /> :
           rows === null ? <SkTable rows={5} cols={5} /> :
           shown.length === 0 ? (
            <EmptyState icon={CheckCircle2} title={filter === 'unverified' ? 'Nothing waiting to be verified' : 'No payments yet'}>
              {filter === 'unverified' ? 'Every recorded payment has been checked.' : 'Payments from the website and the office appear here.'}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-ink-faint border-b border-ink-900/8">
                    <th className="p-2.5">When</th><th className="p-2.5">Student</th><th className="p-2.5">Amount</th>
                    <th className="p-2.5 hidden md:table-cell">Reference</th><th className="p-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-900/6">
                  {shown.map(p => (
                    <tr key={p.id}>
                      <td className="p-2.5 text-[12px] text-ink-soft whitespace-nowrap">{dateTime(p.paid_at)}</td>
                      <td className="p-2.5">
                        <p className="font-bold text-ink-950 text-[13px]">{p.student_name}</p>
                        <p className="text-[11px] text-ink-faint">Class {p.class || '—'} · Roll {p.roll_no || '—'}{p.category ? ` · ${p.category}` : ''}</p>
                      </td>
                      <td className="p-2.5 font-extrabold text-ink-950 whitespace-nowrap">{inr(p.amount)}</td>
                      <td className="p-2.5 hidden md:table-cell">
                        <p className="font-mono text-[11px] text-ink-700">{p.txn_ref}</p>
                        <Badge tone={p.source === 'portal' ? 'brass' : 'ink'} className="mt-1">{p.source === 'portal' ? 'Website' : 'Office'}</Badge>
                      </td>
                      <td className="p-2.5 text-right">
                        {p.student_id ? (
                          <Badge tone="garden" icon={CheckCircle2}>Verified</Badge>
                        ) : (
                          <button onClick={() => verify(p)} disabled={busyId === p.id} className="btn-garden text-xs py-1.5 whitespace-nowrap">
                            {busyId === p.id ? <Spinner className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Verify &amp; mark PAID
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>

      <CounterPaymentModal open={showForm} onClose={() => setShowForm(false)}
                           onSaved={async () => { setShowForm(false); await Promise.all([reload(), refresh()]); }} />
    </div>
  );
}

function CounterPaymentModal({ open, onClose, onSaved }) {
  const { toast, students } = useSchool();
  const [f, setF] = useState({ cls: '10TH', roll: '', name: '', amount: '', category: 'Tuition fee' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.value }));

  // Fill the name from the register once class and roll match a student.
  const match = students.find(s => s.class === f.cls && String(s.roll_no) === String(f.roll).trim());
  useEffect(() => { if (match) setF(x => ({ ...x, name: match.name })); }, [match]);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.roll.trim() || !f.name.trim() || !(Number(f.amount) > 0)) {
      toast('Fill in the class, roll number, name and amount.', 'error', 'Check the form');
      return;
    }
    setBusy(true);
    try {
      const res = await officeApi.recordCounterPayment(f);
      toast(res?.ok ? `${inr(f.amount)} recorded for ${f.name}; fee marked PAID.`
                    : `${inr(f.amount)} recorded, but no student matched roll ${f.roll} in ${f.cls} — update the fee status by hand.`,
            res?.ok ? 'success' : 'warning', 'Payment recorded');
      setF({ cls: f.cls, roll: '', name: '', amount: '', category: 'Tuition fee' });
      onSaved();
    } catch (err) {
      toast(err.message, 'error', 'Could not record');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} icon={IndianRupee} title="Record an office payment"
           subtitle="Cash or cheque received at the counter. The student is marked PAID straight away." size="md">
      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label" htmlFor="cp-cls">Class</label>
          <select id="cp-cls" value={f.cls} onChange={set('cls')} className="field font-semibold">
            {CLASS_LIST.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="cp-roll">Roll number</label>
          <input id="cp-roll" value={f.roll} onChange={set('roll')} className="field" inputMode="numeric" />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="cp-name">Student name</label>
          <input id="cp-name" value={f.name} onChange={set('name')} className="field" />
          {match && <p className="text-[11px] text-garden-700 mt-1 font-semibold">Matched in the register</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="cp-amt">Amount (₹)</label>
          <input id="cp-amt" type="number" min="1" value={f.amount} onChange={set('amount')} className="field font-bold" />
        </div>
        <div>
          <label className="field-label" htmlFor="cp-cat">Paid towards</label>
          <select id="cp-cat" value={f.category} onChange={set('category')} className="field">
            {['Tuition fee', 'Admission fee', 'Examination fee', 'Transport fee', 'Annual charges', 'Other'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button type="submit" disabled={busy} className="btn-primary sm:col-span-2">
          {busy ? <><Spinner className="w-4 h-4" /> Saving…</> : <><Save className="w-4 h-4" /> Record payment</>}
        </button>
      </form>
    </Modal>
  );
}

/* ============================================================
   ENQUIRIES — admission forms from the website
   ============================================================ */
const ENQ_STATUS = [
  ['new', 'New', 'rose'], ['contacted', 'Contacted', 'brass'],
  ['admitted', 'Admitted', 'garden'], ['closed', 'Closed', 'ink'],
];

export function EnquiriesTab() {
  const { toast } = useSchool();
  const { rows, error, reload } = useServerList(staffApi.listEnquiries);
  const [status, setStatus] = useState('new');
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows || []).filter(e => (status === 'all' || e.status === status) &&
      (!s || [e.student_name, e.parent_name, e.phone, e.village].join(' ').toLowerCase().includes(s)));
  }, [rows, status, q]);

  const change = async (e, next) => {
    try {
      await staffApi.setEnquiryStatus(e.id, next);
      toast(`${e.student_name}: marked ${next}.`, 'success');
      reload();
    } catch (err) { toast(err.message, 'error', 'Not saved'); }
  };

  const count = (s) => (rows || []).filter(e => e.status === s).length;

  return (
    <Reveal>
      <div className="panel p-6 sm:p-7">
        <PanelTitle icon={ClipboardList} title="Admission enquiries"
                    lead="Forms submitted on the Admissions page. Call the parent, then move the enquiry along so nobody is contacted twice or forgotten." />

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            {[...ENQ_STATUS.map(([id, label]) => [id, `${label} (${count(id)})`]), ['all', 'All']].map(([id, label]) => (
              <button key={id} onClick={() => setStatus(id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                        status === id ? 'bg-ink-950 text-brass-300 border-ink-950' : 'bg-white text-ink-700 border-ink-900/12 hover:bg-ink-50'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone, village" className="field pl-10" />
          </div>
        </div>

        {error ? <LoadError message={error} onRetry={reload} /> :
         rows === null ? <SkTable rows={4} cols={4} /> :
         shown.length === 0 ? <EmptyState icon={ClipboardList} title="No enquiries here">Nothing matches this filter.</EmptyState> : (
          <div className="space-y-3">
            {shown.map(e => (
              <div key={e.id} className="p-4 rounded-2xl border border-ink-900/8 bg-white flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-ink-950 text-[14px]">
                    {e.student_name} <span className="text-ink-faint font-semibold text-[12px]">· for {e.class_applying || '—'}</span>
                  </p>
                  <p className="text-[12px] text-ink-soft mt-0.5">
                    Parent {e.parent_name} · {e.phone}{e.village ? ` · ${e.village}` : ''}{e.transport ? ` · transport: ${e.transport}` : ''}
                  </p>
                  {e.message && <p className="text-[12px] text-ink-700 mt-1.5 italic">“{e.message}”</p>}
                  <p className="text-[11px] text-ink-faint mt-1">{dateTime(e.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={`tel:${e.phone}`} className="btn-ghost text-xs py-1.5" title="Call"><Phone className="w-3.5 h-3.5" /></a>
                  <a href={`https://wa.me/91${String(e.phone).replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer"
                     className="btn-ghost text-xs py-1.5" title="WhatsApp"><MessageCircle className="w-3.5 h-3.5" /></a>
                  <select value={e.status} onChange={ev => change(e, ev.target.value)} className="field py-1.5 text-xs font-bold w-36"
                          aria-label={`Status for ${e.student_name}`}>
                    {ENQ_STATUS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}

/* ============================================================
   NOTICES & EVENTS — what the public website shows
   ============================================================ */
const NOTICE_TAGS = ['General', 'Admissions', 'Examination', 'Fees', 'Event', 'PTM', 'Holiday'];
const EVENT_TYPES = ['Academic', 'Examination', 'Cultural', 'Sports', 'National'];
const today = () => new Date().toISOString().slice(0, 10);

export function NoticesTab() {
  const { toast } = useSchool();
  const notices = useServerList(officeApi.listNotices);
  const events = useServerList(officeApi.listEvents);
  const [editing, setEditing] = useState(null);   // { kind: 'notice'|'event', row }

  const remove = async (kind, row) => {
    if (!confirm(`Delete "${row.title}"? It disappears from the website immediately.`)) return;
    try {
      await (kind === 'notice' ? officeApi.deleteNotice(row.id) : officeApi.deleteEvent(row.id));
      toast('Deleted.', 'info');
      (kind === 'notice' ? notices : events).reload();
    } catch (e) { toast(e.message, 'error', 'Not deleted'); }
  };

  const togglePublish = async (kind, row) => {
    try {
      await (kind === 'notice' ? officeApi.saveNotice({ ...row, is_published: !row.is_published })
                               : officeApi.saveEvent({ ...row, is_published: !row.is_published }));
      toast(row.is_published ? 'Hidden from the website.' : 'Published on the website.', 'success');
      (kind === 'notice' ? notices : events).reload();
    } catch (e) { toast(e.message, 'error', 'Not saved'); }
  };

  const List = ({ kind, state, empty }) => (
    state.error ? <LoadError message={state.error} onRetry={state.reload} /> :
    state.rows === null ? <SkTable rows={3} cols={3} /> :
    state.rows.length === 0 ? <p className="text-[13px] text-ink-soft p-4 rounded-2xl bg-ink-50">{empty}</p> : (
      <div className="divide-y divide-ink-900/6 rounded-2xl border border-ink-900/8 bg-white">
        {state.rows.map(r => (
          <div key={r.id} className="p-3.5 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-ink-950 text-[13.5px]">
                {r.title}
                {kind === 'notice' && r.is_urgent && <Badge tone="rose" className="ml-2">Urgent</Badge>}
                {!r.is_published && <Badge tone="ink" className="ml-2">Hidden</Badge>}
              </p>
              <p className="text-[11.5px] text-ink-faint mt-0.5">
                {kind === 'notice' ? `${r.tag} · ${longDate(r.publish_date)}` : `${r.event_type} · ${longDate(r.event_date)}`}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => togglePublish(kind, r)} title={r.is_published ? 'Hide from website' : 'Publish'}
                      className="w-8 h-8 rounded-lg text-ink-500 hover:bg-ink-100 flex items-center justify-center">
                {r.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setEditing({ kind, row: r })} title="Edit"
                      className="w-8 h-8 rounded-lg text-ink-500 hover:bg-ink-100 flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => remove(kind, r)} title="Delete"
                      className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Reveal>
        <div className="panel p-6">
          <PanelTitle icon={Megaphone} title="Notices"
                      lead="Shown on the Notices page and the scrolling strip on every page."
                      action={<button onClick={() => setEditing({ kind: 'notice', row: null })} className="btn-primary text-xs shrink-0"><Plus className="w-4 h-4" /> New notice</button>} />
          <List kind="notice" state={notices} empty="No notices yet — the website shows its built-in sample notices until you publish one." />
        </div>
      </Reveal>
      <Reveal delay={80}>
        <div className="panel p-6">
          <PanelTitle icon={CalendarDays} title="Calendar events"
                      lead="Shown on the Notices calendar and the home page."
                      action={<button onClick={() => setEditing({ kind: 'event', row: null })} className="btn-primary text-xs shrink-0"><Plus className="w-4 h-4" /> New event</button>} />
          <List kind="event" state={events} empty="No events yet — the website shows its built-in sample calendar until you add one." />
        </div>
      </Reveal>

      <ContentModal editing={editing} onClose={() => setEditing(null)}
                    onSaved={(kind) => { setEditing(null); (kind === 'notice' ? notices : events).reload(); }} />
    </div>
  );
}

function ContentModal({ editing, onClose, onSaved }) {
  const { toast } = useSchool();
  const kind = editing?.kind;
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    const r = editing.row;
    setF(kind === 'notice'
      ? { id: r?.id, title: r?.title || '', body: r?.body || '', tag: r?.tag || 'General', is_urgent: !!r?.is_urgent,
          is_published: r ? r.is_published : true, publish_date: r?.publish_date || today() }
      : { id: r?.id, title: r?.title || '', description: r?.description || '', event_type: r?.event_type || 'Academic',
          event_date: r?.event_date || today(), is_published: r ? r.is_published : true });
  }, [editing, kind]);

  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.title?.trim()) { toast('A title is required.', 'error'); return; }
    setBusy(true);
    try {
      await (kind === 'notice' ? officeApi.saveNotice(f) : officeApi.saveEvent(f));
      toast(f.is_published ? 'Saved and live on the website.' : 'Saved (hidden from the website).', 'success');
      onSaved(kind);
    } catch (err) { toast(err.message, 'error', 'Not saved'); } finally { setBusy(false); }
  };

  return (
    <Modal open={!!editing} onClose={onClose} icon={kind === 'notice' ? Megaphone : CalendarDays}
           title={`${f.id ? 'Edit' : 'New'} ${kind === 'notice' ? 'notice' : 'event'}`} size="md">
      {editing && (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="field-label" htmlFor="c-title">Title</label>
            <input id="c-title" value={f.title || ''} onChange={set('title')} className="field" maxLength={140} />
          </div>
          <div>
            <label className="field-label" htmlFor="c-body">{kind === 'notice' ? 'Notice text' : 'Description'}</label>
            <textarea id="c-body" rows={4} value={(kind === 'notice' ? f.body : f.description) || ''}
                      onChange={set(kind === 'notice' ? 'body' : 'description')} className="field" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="c-type">{kind === 'notice' ? 'Category' : 'Type'}</label>
              <select id="c-type" value={(kind === 'notice' ? f.tag : f.event_type) || ''}
                      onChange={set(kind === 'notice' ? 'tag' : 'event_type')} className="field">
                {(kind === 'notice' ? NOTICE_TAGS : EVENT_TYPES).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="c-date">{kind === 'notice' ? 'Notice date' : 'Event date'}</label>
              <input id="c-date" type="date" value={(kind === 'notice' ? f.publish_date : f.event_date) || ''}
                     onChange={set(kind === 'notice' ? 'publish_date' : 'event_date')} className="field" />
            </div>
          </div>
          <div className="flex flex-wrap gap-5">
            {kind === 'notice' && (
              <label className="flex items-center gap-2 text-[13px] font-semibold text-ink-800">
                <input type="checkbox" checked={!!f.is_urgent} onChange={set('is_urgent')} className="w-4 h-4 accent-rose-600" /> Mark as urgent
              </label>
            )}
            <label className="flex items-center gap-2 text-[13px] font-semibold text-ink-800">
              <input type="checkbox" checked={!!f.is_published} onChange={set('is_published')} className="w-4 h-4 accent-garden-600" /> Show on the website
            </label>
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <><Spinner className="w-4 h-4" /> Saving…</> : <><Save className="w-4 h-4" /> Save</>}
          </button>
        </form>
      )}
    </Modal>
  );
}
