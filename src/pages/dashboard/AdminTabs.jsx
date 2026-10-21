import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  UserCheck, UserX, Trash2, Crown, GraduationCap, RefreshCw, History,
  Download, ChevronDown, ChevronRight, Clock, Info,
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { adminApi } from '../../lib/api';
import { Reveal, Badge, Modal } from '../../components/UI';
import { SkTable, EmptyState, Spinner } from '../../components/Loaders';
import { dateTime, initialsOf } from '../../utils/format';
import { ENTITY_LABEL, ACTION_META, changeLines } from '../../lib/activity';

/* ============================================================
   STAFF — approve, promote, deactivate, delete
   ============================================================ */
export function StaffTab() {
  const { toast, profile } = useSchool();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try { setRows(await adminApi.listStaff()); } catch (e) { setError(e.message); setRows([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (row, patch, message) => {
    setBusy(row.id);
    try { await adminApi.setStaff(row.id, patch); toast(message, 'success'); await load(); }
    catch (e) { toast(e.message, 'error', 'Not changed'); }
    finally { setBusy(null); }
  };

  const del = async (row) => {
    setBusy(row.id);
    try { await adminApi.deleteUser(row.id); toast(`${row.full_name}'s login was deleted.`, 'info', 'Account deleted'); setConfirmDel(null); await load(); }
    catch (e) { toast(e.message, 'error', 'Not deleted'); }
    finally { setBusy(null); }
  };

  const pending = (rows || []).filter(r => !r.is_active && !r.last_sign_in_at);
  const active = (rows || []).filter(r => r.is_active);
  const inactive = (rows || []).filter(r => !r.is_active && r.last_sign_in_at);

  const Row = ({ r }) => {
    const me = r.id === profile?.id;
    return (
      <div className="p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-extrabold ${
            r.role === 'admin' ? 'bg-brass-400 text-ink-950' : 'bg-ink-950 text-brass-400'}`}>
            {initialsOf(r.full_name)}
          </span>
          <div className="min-w-0">
            <p className="font-extrabold text-ink-950 text-[14px] flex flex-wrap items-center gap-2">
              {r.full_name}
              {me && <Badge tone="brass">You</Badge>}
              <Badge tone={r.role === 'admin' ? 'brass' : 'ink'} icon={r.role === 'admin' ? Crown : GraduationCap}>
                {r.role === 'admin' ? 'Principal / Admin' : 'Teacher'}
              </Badge>
              {!r.email_confirmed && <Badge tone="rose">Email not confirmed</Badge>}
            </p>
            <p className="text-[12px] text-ink-soft truncate">{r.email}</p>
            <p className="text-[11px] text-ink-faint mt-0.5">
              Joined {dateTime(r.created_at)} · {r.last_sign_in_at ? `last sign-in ${dateTime(r.last_sign_in_at)}` : 'never signed in'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {busy === r.id && <Spinner className="w-4 h-4" />}
          {!r.is_active ? (
            <button disabled={busy === r.id} onClick={() => act(r, { is_active: true }, `${r.full_name} can now sign in.`)} className="btn-garden text-xs py-1.5">
              <UserCheck className="w-3.5 h-3.5" /> {r.last_sign_in_at ? 'Reactivate' : 'Approve'}
            </button>
          ) : !me && (
            <button disabled={busy === r.id} onClick={() => act(r, { is_active: false }, `${r.full_name} can no longer sign in.`)} className="btn-ghost text-xs py-1.5">
              <UserX className="w-3.5 h-3.5" /> Deactivate
            </button>
          )}
          {!me && (r.role === 'admin' ? (
            <button disabled={busy === r.id} onClick={() => act(r, { role: 'teacher' }, `${r.full_name} is now a teacher.`)} className="btn-ghost text-xs py-1.5">
              <GraduationCap className="w-3.5 h-3.5" /> Make teacher
            </button>
          ) : (
            <button disabled={busy === r.id} onClick={() => act(r, { role: 'admin' }, `${r.full_name} is now an admin.`)} className="btn-ghost text-xs py-1.5">
              <Crown className="w-3.5 h-3.5" /> Make admin
            </button>
          ))}
          {!me && (
            <button disabled={busy === r.id} onClick={() => setConfirmDel(r)} title="Delete login"
                    className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const Section = ({ title, tone, list, empty }) => (
    <Reveal>
      <div className="panel overflow-hidden">
        <div className="px-5 py-3.5 border-b border-ink-900/8 flex items-center justify-between">
          <h3 className="font-display font-extrabold text-ink-950 flex items-center gap-2">{title} <Badge tone={tone}>{list.length}</Badge></h3>
        </div>
        {list.length === 0 ? <p className="p-5 text-[13px] text-ink-soft">{empty}</p>
          : <div className="divide-y divide-ink-900/6">{list.map(r => <Row key={r.id} r={r} />)}</div>}
      </div>
    </Reveal>
  );

  return (
    <div className="space-y-5">
      <Reveal>
        <div className="panel p-5 flex gap-3 items-start bg-brass-50/60 border-brass-200">
          <Info className="w-5 h-5 text-brass-700 shrink-0 mt-0.5" />
          <div className="text-[13px] text-ink-700 leading-relaxed flex-1">
            <strong className="text-ink-950">How new staff join:</strong> they tap <em>Request access</em> on the sign-in screen
            (website or app) and choose their own password. Their request appears below — approve it and they can sign in.
            Deleting a login keeps every mark and record they entered, and the activity log keeps their history.
          </div>
          <button onClick={load} className="btn-ghost text-xs py-1.5 shrink-0"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>
      </Reveal>

      {error ? <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-[13px] text-rose-800">{error}</div> :
       rows === null ? <SkTable rows={4} cols={3} /> : (
        <>
          <Section title="Waiting for approval" tone="rose" list={pending} empty="No pending requests." />
          <Section title="Active staff" tone="garden" list={active} empty="No active staff." />
          {inactive.length > 0 && <Section title="Deactivated" tone="ink" list={inactive} empty="" />}
        </>
      )}

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} icon={Trash2} size="sm"
             title="Delete this login?"
             subtitle="They will not be able to sign in again. Students, marks and payments they entered are kept, and so is their activity history.">
        {confirmDel && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <p className="font-extrabold text-ink-950">{confirmDel.full_name}</p>
              <p className="text-[12px] text-ink-soft">{confirmDel.email}</p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => del(confirmDel)} disabled={busy === confirmDel.id} className="btn bg-rose-600 text-white hover:bg-rose-700 flex-1">
                {busy === confirmDel.id ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />} Delete login
              </button>
              <button onClick={() => setConfirmDel(null)} className="btn-ghost flex-1">Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================================================
   ACTIVITY LOG — who did what, and when
   ============================================================ */
const PAGE = 50;

export function ActivityTab() {
  const { toast } = useSchool();
  const [staff, setStaff] = useState([]);
  const [filters, setFilters] = useState({ actorId: '', entity: '', action: '', from: '', to: '', search: '' });
  const [rows, setRows] = useState(null);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(() => new Set());

  useEffect(() => { adminApi.listStaff().then(setStaff, () => {}); }, []);

  const load = useCallback(async (append = false, before) => {
    setLoading(true);
    try {
      const page = await adminApi.listActivity({ ...filters, search: filters.search.trim(), before, limit: PAGE });
      setRows(prev => (append ? [...(prev || []), ...page] : page));
      setMore(page.length === PAGE);
    } catch (e) {
      toast(e.message, 'error', 'Could not load the log');
      if (!append) setRows([]);
    } finally { setLoading(false); }
  }, [filters, toast]);

  // Reload when a filter changes; the search box waits for typing to pause.
  useEffect(() => { const t = setTimeout(() => load(false), 300); return () => clearTimeout(t); }, [load]);

  const set = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value }));
  const clear = () => setFilters({ actorId: '', entity: '', action: '', from: '', to: '', search: '' });
  const anyFilter = Object.values(filters).some(Boolean);

  const toggle = (id) => setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exportCsv = () => {
    const header = ['When', 'Who', 'Email', 'Role', 'Action', 'Section', 'Record', 'Details'];
    const lines = (rows || []).map(r => [
      new Date(r.at).toLocaleString('en-IN'), r.actor_name, r.actor_email || '', r.actor_role || '',
      ACTION_META[r.action]?.[0] || r.action, ENTITY_LABEL[r.entity] || r.entity, r.summary || '',
      changeLines(r).map(l => (l.before !== undefined ? `${l.label}: ${l.before} → ${l.after}` : `${l.label}: ${l.value}`)).join('; '),
    ]);
    const csv = [header, ...lines].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `AshaDeep_Activity_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <Reveal>
        <div className="panel p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <select value={filters.actorId} onChange={set('actorId')} className="field font-semibold lg:col-span-2" aria-label="Filter by person">
              <option value="">Everyone</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role === 'admin' ? 'admin' : 'teacher'})</option>)}
              <option value="public">Public website / system</option>
            </select>
            <select value={filters.entity} onChange={set('entity')} className="field font-semibold" aria-label="Filter by section">
              <option value="">All sections</option>
              {Object.entries(ENTITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filters.action} onChange={set('action')} className="field font-semibold" aria-label="Filter by action">
              <option value="">All actions</option>
              {Object.entries(ACTION_META).map(([k, [v]]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="date" value={filters.from} onChange={set('from')} className="field" aria-label="From date" />
            <input type="date" value={filters.to} onChange={set('to')} className="field" aria-label="To date" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <input value={filters.search} onChange={set('search')} placeholder="Search a student, subject, notice…" className="field flex-1" />
            <div className="flex gap-2">
              {anyFilter && <button onClick={clear} className="btn-ghost text-xs">Clear</button>}
              <button onClick={() => load(false)} className="btn-ghost text-xs"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
              <button onClick={exportCsv} disabled={!rows?.length} className="btn-ink text-xs"><Download className="w-3.5 h-3.5" /> CSV</button>
            </div>
          </div>
        </div>
      </Reveal>

      {rows === null ? <SkTable rows={8} cols={4} /> :
       rows.length === 0 ? (
        <EmptyState icon={History} title="Nothing recorded for these filters">
          Every change made from the website or the app is recorded here automatically.
        </EmptyState>
      ) : (
        <div className="panel overflow-hidden divide-y divide-ink-900/6">
          {rows.map(r => {
            const [label, tone] = ACTION_META[r.action] || [r.action, 'ink'];
            const lines = changeLines(r);
            const isOpen = open.has(r.id);
            return (
              <div key={r.id} className="p-4">
                <button onClick={() => lines.length && toggle(r.id)} className="w-full text-left flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 text-ink-faint">
                    {lines.length ? (isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : <span className="w-4 h-4 block" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-ink-950 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <strong>{r.actor_name}</strong>
                      {r.actor_role && <span className="text-[11px] text-ink-faint">({r.actor_role === 'admin' ? 'admin' : 'teacher'})</span>}
                      <Badge tone={tone}>{label}</Badge>
                      <span className="text-ink-soft">{ENTITY_LABEL[r.entity] || r.entity}</span>
                    </p>
                    {r.summary && <p className="text-[12.5px] text-ink-700 mt-1 break-words">{r.summary}</p>}
                  </div>
                  <span className="shrink-0 text-[11.5px] text-ink-faint flex items-center gap-1 whitespace-nowrap">
                    <Clock className="w-3 h-3" /> {dateTime(r.at)}
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-3 ml-7 p-3 rounded-xl bg-ink-50 border border-ink-900/6 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                    {lines.map(l => (
                      <p key={l.label} className="text-[12px] text-ink-700">
                        <span className="text-ink-faint">{l.label}:</span>{' '}
                        {l.before !== undefined
                          ? <><span className="line-through text-rose-600">{l.before}</span> → <strong className="text-garden-700">{l.after}</strong></>
                          : <strong className="text-ink-950">{l.value}</strong>}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {more && (
        <div className="text-center">
          <button onClick={() => load(true, rows[rows.length - 1].id)} disabled={loading} className="btn-ghost text-xs">
            {loading ? <Spinner className="w-4 h-4" /> : null} Load older entries
          </button>
        </div>
      )}
    </div>
  );
}

