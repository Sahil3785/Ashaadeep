import React from 'react';
import { SCHOOL } from '../../data/school';
import { monthLabel, modeLabel } from '../../lib/fees';
import { inr, shortDate, dateTime, rupeesInWords } from '../../utils/format';

/* ============================================================
   FeeReceipt — the official, printable receipt for one payment,
   listing every month and fee head it paid.

   Inline colours on purpose: html2canvas (PDF export) and the
   print window both read them reliably, whatever the theme.
   ============================================================ */
export default function FeeReceipt({ payment, items = [], id = 'fee-receipt' }) {
  if (!payment) return null;
  const cancelled = payment.status === 'cancelled';
  const pending = payment.status === 'pending';
  const ink = '#18213c', soft = '#4a5578', faint = '#8792b0';

  // Group the lines by month so a twelve-line receipt still reads at a glance.
  const months = [...new Set(items.map(i => i.period))];

  return (
    <div id={id} className="document relative rounded-2xl p-6 sm:p-8 bg-white"
         style={{ border: `3px solid ${ink}`, color: ink }}>
      {(cancelled || pending) && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', fontSize: 64, fontWeight: 800, letterSpacing: 4,
          color: cancelled ? 'rgba(225,29,72,.13)' : 'rgba(47,83,198,.10)', transform: 'rotate(-24deg)',
        }}>{cancelled ? 'CANCELLED' : 'NOT VERIFIED'}</div>
      )}

      <div className="text-center pb-4 mb-4" style={{ borderBottom: `2px solid ${ink}` }}>
        <h2 className="font-display text-lg sm:text-xl font-extrabold uppercase tracking-wide">{SCHOOL.name}</h2>
        <p className="text-[11px] font-semibold mt-0.5" style={{ color: soft }}>{SCHOOL.address}</p>
        <p className="text-[10px] mt-0.5" style={{ color: faint }}>
          School Code {SCHOOL.schoolCode} · {SCHOOL.phone} · {SCHOOL.email}
        </p>
        <div className="inline-block mt-2.5 px-4 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider"
             style={cancelled ? { background: '#ffe4e6', color: '#9f1239', border: '1px solid #fecdd3' }
                  : pending ? { background: '#dce8fd', color: '#273a80', border: '1px solid #c1d6fb' }
                  : { background: '#d4f7e3', color: '#0b4933', border: '1px solid #aceecb' }}>
          {cancelled ? 'Receipt cancelled' : pending ? 'Payment reported · awaiting verification' : 'Fee receipt'}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-3 mb-4 text-[12px]">
        {[
          ['Receipt no.', payment.receipt_no || payment.txn_ref, true],
          ['Date', shortDate(payment.paid_on || payment.paid_at)],
          ['Session', payment.session || SCHOOL.session],
          ['Student', payment.student_name],
          ['Class & roll', `${payment.class || '—'} · Roll ${payment.roll_no || '—'}`],
          ['Payment mode', `${modeLabel(payment.mode)}${payment.utr ? ` · ${payment.utr}` : ''}`, !!payment.utr],
        ].map(([k, v, mono]) => (
          <div key={k}>
            <span className="block text-[9px] font-extrabold uppercase tracking-wider" style={{ color: faint }}>{k}</span>
            <strong className={`block font-bold mt-0.5 break-words ${mono ? 'font-mono' : ''}`}>{v}</strong>
          </div>
        ))}
      </div>

      <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: ink, color: '#fff' }}>
            <th className="text-left p-2 font-bold">Month</th>
            <th className="text-left p-2 font-bold">Fee head</th>
            <th className="text-right p-2 font-bold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={3} className="p-2" style={{ color: soft }}>
              {payment.periods?.length ? `Towards ${payment.periods.map(p => monthLabel(p, true)).join(', ')}` : payment.category || 'School fee'}
            </td></tr>
          ) : months.map(m => items.filter(i => i.period === m).map((i, k) => (
            <tr key={`${m}-${i.head_name}`} style={{ borderBottom: '1px solid #e3e7f0' }}>
              <td className="p-2 font-semibold">{k === 0 ? monthLabel(m, true) : ''}</td>
              <td className="p-2">{i.head_name}</td>
              <td className="p-2 text-right font-mono">{inr(i.amount)}</td>
            </tr>
          )))}
        </tbody>
      </table>

      <div className="flex items-center justify-between gap-4 mt-3 p-4 rounded-xl" style={{ background: ink }}>
        <div className="min-w-0">
          <p className="text-[9.5px] font-extrabold uppercase tracking-wider" style={{ color: '#9fb0d4' }}>Total received</p>
          <p className="text-[11px] mt-0.5" style={{ color: '#cbd4e9' }}>{rupeesInWords(payment.amount)}</p>
        </div>
        <p className="font-display text-2xl font-extrabold font-mono shrink-0" style={{ color: '#fbb420' }}>{inr(payment.amount)}</p>
      </div>

      {(payment.note || cancelled) && (
        <p className="text-[11px] mt-3" style={{ color: soft }}>
          {payment.note && <>Note: {payment.note}. </>}
          {cancelled && <>Cancelled {payment.cancelled_at ? dateTime(payment.cancelled_at) : ''}: {payment.cancel_reason}</>}
        </p>
      )}

      <div className="flex justify-between items-end gap-6 mt-7 pt-5" style={{ borderTop: '2px solid #d7dce8' }}>
        <p className="text-[10px] max-w-xs" style={{ color: faint }}>
          Computer-generated receipt. Please keep it safe — it is your proof of payment. Fees once paid are not refundable.
        </p>
        <div className="w-36 pt-1.5 text-center text-[11px] font-extrabold shrink-0" style={{ borderTop: `2px solid ${ink}` }}>
          Accounts Office
        </div>
      </div>
    </div>
  );
}

/* Plain-text version, for WhatsApp / the Android share sheet. */
export function receiptText(payment, items = []) {
  const lines = [
    `*${SCHOOL.name}*`,
    `Fee receipt ${payment.receipt_no || payment.txn_ref}`,
    `${payment.student_name} · Class ${payment.class} · Roll ${payment.roll_no}`,
    `Date: ${shortDate(payment.paid_on || payment.paid_at)} · ${modeLabel(payment.mode)}`,
    '',
    ...(items.length
      ? items.map(i => `${monthLabel(i.period, true)} — ${i.head_name}: ${inr(i.amount)}`)
      : (payment.periods || []).map(p => monthLabel(p, true))),
    '',
    `*Total: ${inr(payment.amount)}*`,
  ];
  if (payment.status === 'cancelled') lines.push(`CANCELLED — ${payment.cancel_reason || ''}`);
  return lines.join('\n');
}
