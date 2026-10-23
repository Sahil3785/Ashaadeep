import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Printer, Download, MessageCircle, Ban, RefreshCw, Receipt } from 'lucide-react';
import { CLASS_LIST } from '../../../data/school';
import { useSchool } from '../../../context/SchoolContext';
import { fees, waLink } from '../../../lib/fees';
import { Modal } from '../../../components/UI';
import { Spinner } from '../../../components/Loaders';
import FeeReceipt, { receiptText } from '../../../components/fees/FeeReceipt';
import { elementToPdf, printElement } from '../../../utils/pdf';
import { initialsOf } from '../../../utils/format';

/* Loads something once, and again whenever `deps` change or reload() is called. */
export function useLoad(load, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);
  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await run()); } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [run]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}

export function LoadError({ message, onRetry }) {
  return (
    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-[13px] text-rose-800 flex items-center justify-between gap-3">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry} className="btn-ghost text-xs py-1.5"><RefreshCw className="w-3.5 h-3.5" /> Retry</button>}
    </div>
  );
}

/* ============================================================
   StudentSearch — find a child by name, roll or father's name,
   optionally within one class. Fast on a register of thousands:
   it only filters, and shows the first 30 matches.
   ============================================================ */
export function StudentSearch({ onPick, selectedId, autoFocus = false }) {
  const { students } = useSchool();
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('ALL');

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return students
      .filter(x => (cls === 'ALL' || x.class === cls) &&
        (!s || x.name.toLowerCase().includes(s) || String(x.roll_no) === s ||
         (x.father_name || '').toLowerCase().includes(s) || (x.contact || '').includes(s)))
      .sort((a, b) => CLASS_LIST.indexOf(a.class) - CLASS_LIST.indexOf(b.class) || Number(a.roll_no) - Number(b.roll_no))
      .slice(0, 30);
  }, [students, q, cls]);

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
          <input value={q} onChange={e => setQ(e.target.value)} autoFocus={autoFocus} autoComplete="off"
                 placeholder="Name, roll no., father or phone" className="field pl-10" aria-label="Search students" />
        </div>
        <select value={cls} onChange={e => setCls(e.target.value)} className="field w-28 font-semibold" aria-label="Class">
          <option value="ALL">All</option>
          {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="mt-3 max-h-[26rem] overflow-y-auto -mx-1 px-1 space-y-1.5">
        {shown.length === 0 ? (
          <p className="text-[12.5px] text-ink-soft p-3">No student matches that search.</p>
        ) : shown.map(s => (
          <button key={s.student_id} type="button" onClick={() => onPick(s)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-colors ${
                    selectedId === s.student_id ? 'bg-ink-950 text-white border-ink-950' : 'bg-white border-ink-900/8 hover:border-brass-300'}`}>
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
              selectedId === s.student_id ? 'bg-brass-400 text-ink-950' : 'bg-ink-100 text-ink-600'}`}>{initialsOf(s.name)}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-bold truncate">{s.name}</span>
              <span className={`block text-[11px] truncate ${selectedId === s.student_id ? 'text-ink-300' : 'text-ink-faint'}`}>
                {s.class}-{s.section || 'A'} · Roll {s.roll_no}{s.father_name ? ` · ${s.father_name}` : ''}
              </span>
            </span>
            <span className={`text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
              s.fee_status === 'PAID' ? 'bg-garden-100 text-garden-800' : 'bg-rose-100 text-rose-700'}`}>{s.fee_status}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   ReasonModal — every cancellation or rejection needs a reason,
   because it ends up in the activity log and on the receipt.
   ============================================================ */
export function ReasonModal({ open, title, lead, confirmLabel = 'Confirm', onConfirm, onClose, presets = [] }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setReason(''); }, [open]);
  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    try { await onConfirm(reason.trim()); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} icon={Ban} title={title} subtitle={lead} size="sm">
      <form onSubmit={submit} className="space-y-3">
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {presets.map(p => (
              <button key={p} type="button" onClick={() => setReason(p)}
                      className="px-2.5 py-1 rounded-lg border border-ink-900/12 text-[11.5px] font-bold text-ink-700 hover:bg-ink-50">{p}</button>
            ))}
          </div>
        )}
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} maxLength={300}
                  placeholder="Reason (required)" className="field" autoFocus />
        <button type="submit" disabled={busy || !reason.trim()} className="btn bg-rose-600 text-white hover:bg-rose-700 w-full disabled:opacity-50">
          {busy ? <Spinner className="w-4 h-4" /> : <Ban className="w-4 h-4" />} {confirmLabel}
        </button>
      </form>
    </Modal>
  );
}

/* ============================================================
   ReceiptModal — view, print, download, WhatsApp or cancel one
   receipt. Loads it fresh so a reprint is always the ledger's
   current truth.
   ============================================================ */
export function ReceiptModal({ paymentId, onClose, onChanged }) {
  const { toast, students, isAdmin, afterFeeChange } = useSchool();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [askCancel, setAskCancel] = useState(false);

  useEffect(() => {
    if (!paymentId) { setData(null); return; }
    let alive = true;
    fees.getPayment(paymentId).then(d => alive && setData(d), e => { toast(e.message, 'error', 'Receipt'); onClose(); });
    return () => { alive = false; };
  }, [paymentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const p = data?.payment;
  const contact = p && (p.contact || students.find(s => s.student_id === p.student_id)?.contact);
  const wa = p && waLink(contact, receiptText(p, data.items));

  const pdf = async () => {
    setBusy(true);
    try { await elementToPdf('fee-receipt', `Receipt_${(p.receipt_no || p.txn_ref).replace(/\//g, '-')}`); }
    catch (e) { toast(e.message, 'error', 'PDF'); }
    finally { setBusy(false); }
  };

  const print = () => { try { printElement('fee-receipt', `Receipt ${p.receipt_no || ''}`); } catch (e) { toast(e.message, 'error', 'Print'); } };

  const cancel = async (reason) => {
    try {
      await fees.cancel(p.id, reason);
      toast(`Receipt ${p.receipt_no} cancelled. Its months are due again.`, 'warning', 'Receipt cancelled');
      setAskCancel(false);
      afterFeeChange(p.student_id);
      setData(await fees.getPayment(p.id));
      onChanged?.();
    } catch (e) { toast(e.message, 'error', 'Not cancelled'); }
  };

  return (
    <>
      <Modal open={!!paymentId} onClose={onClose} icon={Receipt} title="Fee receipt" size="lg">
        {!p ? <div className="py-10 flex justify-center"><Spinner /></div> : (
          <>
            <FeeReceipt payment={p} items={data.items} />
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={print} className="btn-ghost text-xs"><Printer className="w-4 h-4" /> Print</button>
              <button onClick={pdf} disabled={busy} className="btn-ink text-xs">
                {busy ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />} PDF
              </button>
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn-garden text-xs"><MessageCircle className="w-4 h-4" /> WhatsApp</a>}
              {p.status === 'verified' && (
                <button onClick={() => setAskCancel(true)} className="btn-danger text-xs ml-auto">
                  <Ban className="w-4 h-4" /> Cancel receipt
                </button>
              )}
            </div>
            {p.status === 'verified' && !isAdmin && (
              <p className="text-[11px] text-ink-faint mt-2">You can cancel a receipt you entered yourself within 24 hours. After that, ask the principal.</p>
            )}
          </>
        )}
      </Modal>
      <ReasonModal open={askCancel} onClose={() => setAskCancel(false)} onConfirm={cancel}
                   title="Cancel this receipt?" confirmLabel="Cancel receipt"
                   lead="The receipt stays on record, marked cancelled, and the months it paid become due again."
                   presets={['Entered for the wrong student', 'Wrong amount entered', 'Duplicate entry', 'Cheque bounced']} />
    </>
  );
}

export function FeeStat({ label, value, note, tone = 'ink' }) {
  const tones = { ink: 'text-ink-950', garden: 'text-garden-700', rose: 'text-rose-600', brass: 'text-brass-700' };
  return (
    <div className="rounded-2xl bg-white border border-ink-900/8 p-3.5">
      <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-faint">{label}</p>
      <p className={`font-display text-xl font-extrabold tabular-nums mt-1 ${tones[tone]}`}>{value}</p>
      {note && <p className="text-[11px] text-ink-soft mt-0.5">{note}</p>}
    </div>
  );
}
