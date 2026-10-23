/* ============================================================
   Fee ledger — shared helpers and the single entry point every
   screen uses.

   The ledger itself lives in the database (006_fee_ledger.sql).
   Without a database the same calls run against an on-device
   copy (feesLocal.js), so the demo behaves exactly like the
   real thing.

   Months are always 'YYYY-MM-01' strings. They are never turned
   into Date objects for arithmetic, so a phone set to another
   time zone cannot shift a payment into the wrong month.
   ============================================================ */
import { isConfigured } from './supabase';
import { feesRemote } from './api';
import * as local from './feesLocal';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                     'August', 'September', 'October', 'November', 'December'];

export const PAYMENT_MODES = [
  ['cash', 'Cash'], ['upi', 'UPI'], ['cheque', 'Cheque'], ['bank', 'Bank transfer'],
  ['card', 'Card'], ['online', 'Online gateway'], ['other', 'Other'],
];
export const modeLabel = (m) => (PAYMENT_MODES.find(x => x[0] === m) || [m, m || '—'])[1];

/* ---------- month arithmetic on 'YYYY-MM-DD' strings ---------- */
export const monthKey = (d) => String(d || '').slice(0, 7) + '-01';
export const addMonths = (key, n) => {
  const [y, m] = key.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}-01`;
};
export const monthLabel = (key, long = false) => {
  const [y, m] = String(key).split('-').map(Number);
  return `${(long ? MONTHS_LONG : MONTHS)[m - 1]} ${long ? y : String(y).slice(2)}`;
};
export const monthShort = (key) => MONTHS[Number(String(key).split('-')[1]) - 1];
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const sessionMonths = (session) =>
  session ? Array.from({ length: session.months || 12 }, (_, i) => addMonths(monthKey(session.starts_on), i)) : [];

// '2026-27' for a session starting April 2026.
export const sessionIdFor = (startKey) => {
  const y = Number(startKey.slice(0, 4));
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
};

const num = (v) => Math.round((Number(v) || 0) * 100) / 100;

/* ============================================================
   Month cards — fold the due lines into one card per month,
   which is how a school office and a parent both think about it.
   status: paid | partial | overdue | due | upcoming | waived | none
   ============================================================ */
export function monthCards(lines, session, { today = todayKey(), awaiting = [] } = {}) {
  const byMonth = new Map(sessionMonths(session).map(k => [k, []]));
  for (const l of lines || []) {
    const k = monthKey(l.period);
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k).push(l);
  }
  return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([period, ls]) => {
    const net = num(ls.reduce((a, l) => a + Number(l.net), 0));
    const paid = num(ls.reduce((a, l) => a + Number(l.paid), 0));
    const balance = num(ls.reduce((a, l) => a + Number(l.balance), 0));
    const dueDate = ls[0]?.due_date ? String(ls[0].due_date).slice(0, 10) : period;
    const allWaived = ls.length > 0 && ls.every(l => l.waived);
    let status = 'none';
    if (ls.length === 0) status = 'none';
    else if (allWaived) status = 'waived';
    else if (balance <= 0) status = 'paid';
    else if (paid > 0) status = 'partial';
    else if (dueDate < today) status = 'overdue';
    else if (period <= monthKey(today)) status = 'due';
    else status = 'upcoming';
    return {
      period, lines: ls.slice().sort((a, b) => (a.head_sort ?? 0) - (b.head_sort ?? 0)),
      net, paid, balance, dueDate, status, awaiting: awaiting.includes(period),
    };
  });
}

export const STATUS_STYLE = {
  paid:     { label: 'Paid',     cls: 'bg-garden-50 border-garden-300 text-garden-800', dot: 'bg-garden-500' },
  partial:  { label: 'Part paid', cls: 'bg-brass-50 border-brass-300 text-brass-800',   dot: 'bg-brass-500' },
  overdue:  { label: 'Overdue',  cls: 'bg-rose-50 border-rose-300 text-rose-700',       dot: 'bg-rose-500' },
  due:      { label: 'Due',      cls: 'bg-brass-50 border-brass-200 text-brass-800',    dot: 'bg-brass-400' },
  upcoming: { label: 'Upcoming', cls: 'bg-white border-ink-900/10 text-ink-500',        dot: 'bg-ink-300' },
  waived:   { label: 'Waived',   cls: 'bg-ink-50 border-ink-200 text-ink-500',          dot: 'bg-ink-400' },
  none:     { label: 'No fee',   cls: 'bg-white border-dashed border-ink-900/10 text-ink-300', dot: 'bg-ink-200' },
};

/* Totals for a student's card. */
export function ledgerTotals(lines, today = todayKey()) {
  const t = { net: 0, paid: 0, balance: 0, overdue: 0 };
  for (const l of lines || []) {
    t.net += Number(l.net); t.paid += Number(l.paid); t.balance += Number(l.balance);
    if (String(l.due_date).slice(0, 10) < today) t.overdue += Number(l.balance);
  }
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, num(v)]));
}

/* Allocation for a set of chosen months: every open line in full, oldest first.
   If `amount` is given (an online payment being verified), fill lines in that
   order until the money runs out, so the last month may be part-paid. */
export function allocate(cards, periods, amount = null) {
  const chosen = cards.filter(c => periods.includes(c.period))
                      .sort((a, b) => a.period.localeCompare(b.period));
  const out = [];
  let left = amount == null ? Infinity : num(amount);
  for (const c of chosen) {
    for (const l of c.lines) {
      const bal = num(l.balance);
      if (bal <= 0 || left <= 0) continue;
      const take = num(Math.min(bal, left));
      out.push({ due_id: l.id, amount: take, period: c.period, head: l.head_name });
      if (left !== Infinity) left = num(left - take);
    }
  }
  return { lines: out, total: num(out.reduce((a, l) => a + l.amount, 0)), unallocated: left === Infinity ? 0 : left };
}

/* WhatsApp reminder text for a parent. */
export function reminderText({ school, name, cls, months, amount }) {
  const list = (months || []).map(m => monthLabel(m, true)).join(', ');
  return `Dear Parent, this is a reminder from ${school}. The school fee of ₹${Number(amount).toLocaleString('en-IN')} ` +
         `for ${name} (Class ${cls}) is pending for ${list}. Please pay at the school office or online on the school website. ` +
         `Kindly ignore this message if already paid. Thank you.`;
}

export const waLink = (phone, text) => {
  const digits = String(phone || '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `https://wa.me/91${digits}?text=${encodeURIComponent(text)}` : null;
};

/* CSV download used by the reports. */
export function downloadCsv(filename, header, rows) {
  const csv = [header, ...rows]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============================================================
   The API. Every screen calls `fees.<name>(…)`; which engine
   answers depends only on whether a database is configured.
   ============================================================ */
const engine = () => (isConfigured ? feesRemote : local);

export const fees = new Proxy({}, {
  get: (_, name) => (...args) => {
    const fn = engine()[name];
    if (typeof fn !== 'function') return Promise.reject(new Error(`Unknown fee action: ${String(name)}`));
    return Promise.resolve().then(() => fn(...args));
  },
});

/* Demo mode needs the register (it lives in SchoolContext) and a way to
   push fee-status changes back into it. The provider calls this once. */
export const bindLocalFees = local.bind;
