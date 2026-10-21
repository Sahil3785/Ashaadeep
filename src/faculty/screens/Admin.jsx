import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, UserCheck, UserX, Trash2, Crown, GraduationCap, History, RefreshCw, Clock, ChevronDown,
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { adminApi } from '../../lib/api';
import { ENTITY_LABEL, ACTION_META, changeLines } from '../../lib/activity';
import { Screen, Card, Btn, Pill, Sheet, Empty } from '../components/Chrome';
import { tap } from '../native';
import { dateTime, initialsOf } from '../../utils/format';

/* ============================================================
   Admin — the principal's tools on the phone: approve or remove
   staff, and read who did what. The database enforces all of
   this; the screen only appears for admins as a convenience.
   ============================================================ */
export default function Admin({ onBack }) {
  const [view, setView] = useState('staff');
  return (
    <Screen title="Admin" subtitle="Staff approvals and activity" onBack={onBack}>
      <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-white border border-ink-900/8 mb-4">
        {[['staff', 'Staff', ShieldCheck], ['activity', 'Activity', History]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => { tap(); setView(id); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${
                    view === id ? 'bg-ink-950 text-brass-300' : 'text-ink-600 active:bg-ink-50'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      {view === 'staff' ? <StaffList /> : <ActivityList />}
    </Screen>
  );
}

function StaffList() {
  const { toast, profile } = useSchool();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = useCallback(async () => {
    try { setRows(await adminApi.listStaff()); } catch (e) { toast(e.message, 'error'); setRows([]); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const act = async (r, patch, msg) => {
    tap(); setBusy(r.id);
    try { await adminApi.setStaff(r.id, patch); tap('success'); toast(msg, 'success'); await load(); }
    catch (e) { tap('error'); toast(e.message, 'error', 'Not changed'); }
    finally { setBusy(null); }
  };

  const del = async (r) => {
    setBusy(r.id);
    try { await adminApi.deleteUser(r.id); toast(`${r.full_name}'s login was deleted.`, 'info'); setConfirmDel(null); await load(); }
    catch (e) { toast(e.message, 'error', 'Not deleted'); }
    finally { setBusy(null); }
  };

  if (rows === null) return <p className="text-center text-[13px] text-ink-faint py-10">Loading staff…</p>;

  const groups = [
    ['Waiting for approval', rows.filter(r => !r.is_active && !r.last_sign_in_at), 'rose'],
    ['Active staff', rows.filter(r => r.is_active), 'garden'],
    ['Deactivated', rows.filter(r => !r.is_active && r.last_sign_in_at), 'ink'],
  ].filter(([, list], i) => list.length || i < 2);

  return (
    <>
      {groups.map(([title, list, tone]) => (
        <div key={title} className="mb-5">
          <h2 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-faint mb-2">
            {title} <Pill tone={tone}>{list.length}</Pill>
          </h2>
          {list.length === 0 ? (
            <Card className="p-4 text-[13px] text-ink-soft">{title.startsWith('Waiting') ? 'No pending requests.' : 'Nobody here.'}</Card>
          ) : (
            <Card className="divide-y divide-ink-900/6">
              {list.map(r => {
                const me = r.id === profile?.id;
                return (
                  <div key={r.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center text-[11px] font-extrabold ${
                        r.role === 'admin' ? 'bg-brass-400 text-ink-950' : 'bg-ink-950 text-brass-400'}`}>{initialsOf(r.full_name)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-extrabold text-ink-950 truncate">{r.full_name}{me ? ' (you)' : ''}</p>
                        <p className="text-[11.5px] text-ink-soft truncate">{r.email}</p>
                        <p className="text-[10.5px] text-ink-faint">
                          {r.role === 'admin' ? 'Admin' : 'Teacher'} · {r.last_sign_in_at ? `seen ${dateTime(r.last_sign_in_at)}` : 'never signed in'}
                          {!r.email_confirmed ? ' · email not confirmed' : ''}
                        </p>
                      </div>
                    </div>
                    {!me && (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {r.is_active
                          ? <Btn variant="ghost" className="!py-2 !text-[12.5px]" disabled={busy === r.id}
                                 onClick={() => act(r, { is_active: false }, `${r.full_name} can no longer sign in.`)}><UserX className="w-4 h-4" /> Stop</Btn>
                          : <Btn variant="garden" className="!py-2 !text-[12.5px]" disabled={busy === r.id}
                                 onClick={() => act(r, { is_active: true }, `${r.full_name} can now sign in.`)}><UserCheck className="w-4 h-4" /> Approve</Btn>}
                        {r.role === 'admin'
                          ? <Btn variant="ghost" className="!py-2 !text-[12.5px]" disabled={busy === r.id}
                                 onClick={() => act(r, { role: 'teacher' }, `${r.full_name} is now a teacher.`)}><GraduationCap className="w-4 h-4" /> Teacher</Btn>
                          : <Btn variant="ghost" className="!py-2 !text-[12.5px]" disabled={busy === r.id}
                                 onClick={() => act(r, { role: 'admin' }, `${r.full_name} is now an admin.`)}><Crown className="w-4 h-4" /> Admin</Btn>}
                        <Btn variant="danger" className="!py-2 !text-[12.5px]" disabled={busy === r.id}
                             onClick={() => { tap(); setConfirmDel(r); }}><Trash2 className="w-4 h-4" /> Delete</Btn>
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      ))}

      <Btn variant="ghost" onClick={() => { tap(); setRows(null); load(); }}><RefreshCw className="w-4 h-4" /> Refresh</Btn>

      <Sheet open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete this login?">
        {confirmDel && (
          <>
            <p className="text-[13px] text-ink-soft text-center leading-relaxed mb-4">
              <strong className="text-ink-950">{confirmDel.full_name}</strong> will not be able to sign in again.
              Records they entered and their activity history are kept.
            </p>
            <div className="space-y-2.5">
              <Btn variant="danger" disabled={busy === confirmDel.id} onClick={() => { tap('error'); del(confirmDel); }}>
                <Trash2 className="w-4 h-4" /> Delete login
              </Btn>
              <Btn variant="ghost" onClick={() => setConfirmDel(null)}>Cancel</Btn>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}

const PAGE = 40;

function ActivityList() {
  const { toast } = useSchool();
  const [staff, setStaff] = useState([]);
  const [actorId, setActorId] = useState('');
  const [rows, setRows] = useState(null);
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState(null);

  useEffect(() => { adminApi.listStaff().then(setStaff, () => {}); }, []);

  const load = useCallback(async (before) => {
    try {
      const page = await adminApi.listActivity({ actorId, before, limit: PAGE });
      setRows(prev => (before ? [...(prev || []), ...page] : page));
      setMore(page.length === PAGE);
    } catch (e) { toast(e.message, 'error'); if (!before) setRows([]); }
  }, [actorId, toast]);

  useEffect(() => { setRows(null); load(); }, [load]);

  return (
    <>
      <select value={actorId} onChange={e => setActorId(e.target.value)}
              className="app-select w-full rounded-2xl border border-ink-900/15 bg-white px-3.5 py-3 text-base font-semibold text-ink-950 appearance-none bg-no-repeat mb-3"
              aria-label="Whose activity">
        <option value="">Everyone</option>
        {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        <option value="public">Public website / system</option>
      </select>

      {rows === null ? <p className="text-center text-[13px] text-ink-faint py-10">Loading activity…</p> :
       rows.length === 0 ? <Empty icon={History} title="Nothing recorded yet">Every change made from the app or the website appears here.</Empty> : (
        <Card className="divide-y divide-ink-900/6">
          {rows.map(r => {
            const [label, tone] = ACTION_META[r.action] || [r.action, 'ink'];
            const lines = changeLines(r);
            const isOpen = open === r.id;
            return (
              <button key={r.id} onClick={() => lines.length && setOpen(isOpen ? null : r.id)} className="w-full text-left p-3.5 block">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-extrabold text-ink-950">{r.actor_name}</span>
                  <Pill tone={tone}>{label}</Pill>
                  <span className="text-[11.5px] text-ink-soft">{ENTITY_LABEL[r.entity] || r.entity}</span>
                  {lines.length > 0 && <ChevronDown className={`w-3.5 h-3.5 text-ink-faint ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                </div>
                {r.summary && <p className="text-[12px] text-ink-700 mt-1 break-words">{r.summary}</p>}
                <p className="text-[10.5px] text-ink-faint mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {dateTime(r.at)}</p>
                {isOpen && (
                  <div className="mt-2 p-2.5 rounded-xl bg-ink-50 space-y-1">
                    {lines.map(l => (
                      <p key={l.label} className="text-[11.5px] text-ink-700">
                        <span className="text-ink-faint">{l.label}:</span>{' '}
                        {l.before !== undefined
                          ? <><span className="line-through text-rose-600">{l.before}</span> → <strong className="text-garden-700">{l.after}</strong></>
                          : <strong className="text-ink-950">{l.value}</strong>}
                      </p>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </Card>
      )}

      {more && (
        <Btn variant="ghost" className="mt-3" onClick={() => { tap(); load(rows[rows.length - 1].id); }}>Load older entries</Btn>
      )}
    </>
  );
}
