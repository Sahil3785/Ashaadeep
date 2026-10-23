/* ============================================================
   Fee ledger — on-device engine for demo mode.

   A faithful copy of 006_fee_ledger.sql in JavaScript, kept in
   localStorage, so the demo build has the same months, receipts,
   cancellations and reports as the live database. Function names
   and return shapes match feesRemote in api.js exactly.
   ============================================================ */
import { addMonths, monthKey, todayKey } from './fees';
import { SCHOOL, CLASS_LIST } from '../data/school';

const KEY = 'ada.fees.v1';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const num = (v) => Math.round((Number(v) || 0) * 100) / 100;
const fail = (msg) => { throw new Error(msg); };

/* ---------- binding to the register held in SchoolContext ---------- */
let getStudents = () => [];
let onStatus = () => {};
export function bind({ students, setStatuses }) {
  getStudents = students;
  onStatus = setStatuses;
}
const idOf = (s) => s.student_id || s.id;
const activeStudents = () => getStudents().filter(s => s.is_active !== false);

/* ---------- storage ---------- */
const RATE_CARD = {
  'Tuition fee':     { PP: 900, P: 1100, M: 1400, H: 1800 },
  'Examination fee': { PP: 400, P: 500, M: 600, H: 800 },
  'Admission fee':   { PP: 2000, P: 2500, M: 3000, H: 3500 },
};
const band = (c) => (c.startsWith('PP') ? 'PP' : ['1ST', '2ND', '3RD', '4TH', '5TH'].includes(c) ? 'P'
  : ['6TH', '7TH', '8TH'].includes(c) ? 'M' : 'H');

function seed() {
  const start = `${SCHOOL.session.slice(0, 4)}-04-01`;
  const heads = [
    { name: 'Tuition fee', frequency: 'monthly', due_month: 1, is_optional: false, sort: 1 },
    { name: 'Transport fee', frequency: 'monthly', due_month: 1, is_optional: true, sort: 2 },
    { name: 'Examination fee', frequency: 'annual', due_month: 1, is_optional: false, sort: 3 },
    { name: 'Admission fee', frequency: 'one_time', due_month: 1, is_optional: false, sort: 4 },
    { name: 'Late fine', frequency: 'one_time', due_month: 1, is_optional: true, sort: 9 },
  ].map(h => ({ id: uid(), is_active: true, ...h }));
  const rates = [];
  for (const h of heads) {
    const card = RATE_CARD[h.name];
    if (card) for (const c of CLASS_LIST) rates.push({ class: c, head_id: h.id, amount: card[band(c)] });
  }
  return {
    session: { id: SCHOOL.session, starts_on: start, months: 12, due_day: 10, billing_from: start, billing_enabled: true, is_current: true },
    heads, rates, adjustments: [], dues: [], payments: [], allocations: [], counter: 0, manual: {}, seededPaid: false,
  };
}

let cache = null;
function db() {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY)) || null; } catch { cache = null; }
  if (!cache) cache = seed();
  return cache;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* storage full — keep in memory */ }
}
export function resetLocalFees() {
  cache = seed();
  save();
  seedHistory();
}

/* ---------- the ledger view ---------- */
const headOf = (id) => db().heads.find(h => h.id === id) || { name: 'Fee', sort: 99 };
const paidOn = (dueId) => {
  const d = db();
  const live = new Set(d.payments.filter(p => p.status === 'verified').map(p => p.id));
  return num(d.allocations.filter(a => a.due_id === dueId && live.has(a.payment_id)).reduce((s, a) => s + a.amount, 0));
};
const lineOf = (row) => {
  const h = headOf(row.head_id);
  const net = num(row.amount - row.concession);
  const paid = paidOn(row.id);
  return {
    ...row, head_name: h.name, head_sort: h.sort, net, paid,
    balance: row.waived ? 0 : Math.max(num(net - paid), 0),
    due_date: `${row.period.slice(0, 8)}${String(db().session.due_day).padStart(2, '0')}`,
  };
};
const linesFor = (studentId) => db().dues.filter(r => r.student_id === studentId).map(lineOf);

/* ---------- engine ---------- */
function refreshStatus(studentId = null) {
  const today = todayKey();
  const d = db();
  const changes = {};
  for (const s of activeStudents()) {
    const id = idOf(s);
    if (studentId && id !== studentId) continue;
    if (d.manual?.[id]) continue;
    const ls = linesFor(id);
    if (!ls.length) continue;
    // Report every computed status, not just the ones that look different:
    // the register handed to us can be a render behind, and the receiver
    // ignores values that are already right.
    changes[id] = ls.some(l => l.due_date <= today && l.balance > 0) ? 'PENDING' : 'PAID';
  }
  if (Object.keys(changes).length) onStatus(changes);
  return Object.keys(changes).length;
}

function generate(studentId) {
  const d = db();
  const s = d.session;
  const from = monthKey(s.billing_from || s.starts_on);
  const months = Array.from({ length: s.months }, (_, i) => ({ period: addMonths(monthKey(s.starts_on), i), idx: i + 1 }));
  const want = new Map();
  for (const st of activeStudents()) {
    const id = idOf(st);
    if (studentId && id !== studentId) continue;
    for (const h of d.heads.filter(x => x.is_active)) {
      const adj = d.adjustments.find(a => a.student_id === id && a.head_id === h.id);
      if ((h.is_optional || h.frequency === 'one_time') && !adj?.opted) continue;
      const base = adj?.amount_override ?? d.rates.find(r => r.class === st.class && r.head_id === h.id)?.amount ?? 0;
      if (!(base > 0)) continue;
      const conc = Math.min(base, num(base * (adj?.concession_pct || 0) / 100 + (adj?.concession_flat || 0)));
      for (const m of months) {
        if (m.period < from) continue;
        if (h.frequency !== 'monthly' && m.idx !== h.due_month) continue;
        want.set(`${id}|${m.period}|${h.id}`, { student_id: id, period: m.period, head_id: h.id, amount: num(base), concession: conc });
      }
    }
  }
  const paidIds = new Set(d.allocations.map(a => a.due_id));
  let changed = 0;
  // remove or re-price untouched lines
  d.dues = d.dues.filter(r => {
    if (studentId && r.student_id !== studentId) return true;
    const k = `${r.student_id}|${r.period}|${r.head_id}`;
    const w = want.get(k);
    if (w) {
      want.delete(k);
      if (!r.is_manual && !paidIds.has(r.id) && (r.amount !== w.amount || r.concession !== w.concession)) {
        r.amount = w.amount; r.concession = w.concession; changed++;
      }
      return true;
    }
    if (r.is_manual || paidIds.has(r.id)) return true;
    changed++;
    return false;
  });
  for (const w of want.values()) {
    d.dues.push({ id: uid(), session: s.id, waived: false, is_manual: false, note: null, ...w });
    changed++;
  }
  save();
  refreshStatus(studentId);
  return changed;
}

/* The demo register says some children are PAID. Make the ledger agree on
   first run by settling their months up to today, so results still show. */
function seedHistory() {
  const d = db();
  if (d.seededPaid) return;
  d.seededPaid = true;
  // Read who is PAID before generating — generating flips everyone with an
  // unpaid past month to PENDING.
  const paidIds = new Set(activeStudents().filter(x => x.fee_status === 'PAID').map(idOf));
  generate(null);
  const today = todayKey();
  for (const s of activeStudents().filter(x => paidIds.has(idOf(x)))) {
    const open = linesFor(idOf(s)).filter(l => l.due_date <= addMonths(monthKey(today), 1) && l.balance > 0);
    if (open.length) {
      collectInternal(idOf(s), open.map(l => ({ due_id: l.id, amount: l.balance })),
        { mode: open.length > 3 ? 'upi' : 'cash', note: 'Opening balance (demo)', paidOn: today, source: 'counter' });
    }
  }
  save();
  refreshStatus(null);
}

const ready = () => { if (getStudents().length) seedHistory(); return db(); };

function allocateInternal(paymentId, studentId, lines) {
  if (!Array.isArray(lines) || !lines.length) fail('Choose at least one month to pay.');
  const d = db();
  let total = 0;
  for (const x of lines) {
    const row = d.dues.find(r => r.id === x.due_id);
    if (!row || row.student_id !== studentId) fail('A selected month does not belong to this student.');
    const l = lineOf(row);
    const amt = num(x.amount);
    if (!(amt > 0)) fail('Each amount must be more than zero.');
    if (amt > l.balance) fail(`${l.head_name} for ${l.period.slice(0, 7)} is only ₹${l.balance} outstanding.`);
    d.allocations.push({ id: uid(), payment_id: paymentId, due_id: row.id, amount: amt });
    total += amt;
  }
  return num(total);
}

const nextReceipt = () => { const d = db(); d.counter += 1; return `${d.session.id}/${String(d.counter).padStart(5, '0')}`; };
const periodsOf = (paymentId) => {
  const d = db();
  const ids = new Set(d.allocations.filter(a => a.payment_id === paymentId).map(a => a.due_id));
  return [...new Set(d.dues.filter(r => ids.has(r.id)).map(r => r.period))].sort();
};
const headsOf = (paymentId) => {
  const d = db();
  const ids = new Set(d.allocations.filter(a => a.payment_id === paymentId).map(a => a.due_id));
  return [...new Set(d.dues.filter(r => ids.has(r.id)).map(r => headOf(r.head_id).name))].sort().join(', ');
};

function collectInternal(studentId, lines, { mode = 'cash', reference = null, paidOn: on = todayKey(), note = null, source = 'counter' } = {}) {
  const d = db();
  const st = activeStudents().find(s => idOf(s) === studentId) || fail('Student not found on the register.');
  if (on > todayKey()) fail('The payment date cannot be in the future.');
  const id = uid();
  const snapshot = d.allocations.length;
  let total;
  try { total = allocateInternal(id, studentId, lines); } catch (e) { d.allocations.length = snapshot; throw e; }
  const receipt = nextReceipt();
  d.payments.unshift({
    id, student_id: studentId, student_name: st.name, roll_no: st.roll_no, class: st.class,
    category: headsOf(id), amount: total, txn_ref: receipt, receipt_no: receipt, session: d.session.id,
    mode, status: 'verified', periods: periodsOf(id), utr: reference || null, note: note || null,
    paid_on: on, paid_at: new Date().toISOString(), contact: st.contact || null, source,
    verified_at: new Date().toISOString(),
  });
  return { ok: true, payment_id: id, receipt_no: receipt, amount: total };
}

/* A status the office set by hand holds until that student's next payment. */
export function markManual(studentId) {
  const d = db();
  d.manual = { ...(d.manual || {}), [studentId]: true };
  save();
}
const clearManual = (studentId) => {
  const d = db();
  if (d.manual?.[studentId]) { delete d.manual[studentId]; save(); }
};

/* ============================================================
   Public surface — mirrors feesRemote
   ============================================================ */
export function getSetup() {
  const d = ready();
  return { session: d.session, heads: [...d.heads].sort((a, b) => a.sort - b.sort), rates: d.rates };
}

export function saveSetup({ id, starts_on, due_day, billing_from, rates, generate: gen }) {
  const d = db();
  d.session = { ...d.session, id: id || d.session.id, starts_on: monthKey(starts_on),
                due_day: Number(due_day) || 10, billing_from: monthKey(billing_from || starts_on) };
  for (const r of rates || []) {
    const hit = d.rates.find(x => x.class === r.class && x.head_id === r.head_id);
    if (hit) hit.amount = Math.max(num(r.amount), 0); else d.rates.push({ class: r.class, head_id: r.head_id, amount: Math.max(num(r.amount), 0) });
  }
  let changed = 0;
  if (gen || d.session.billing_enabled) { d.session.billing_enabled = true; changed = generate(null); }
  save();
  return { ok: true, lines_changed: changed };
}

export function saveHead(h) {
  const d = db();
  if (!h.name?.trim()) fail('Give the fee head a name.');
  if (d.heads.some(x => x.name.toLowerCase() === h.name.trim().toLowerCase() && x.id !== h.id)) fail('A fee head with that name already exists.');
  if (h.id) Object.assign(d.heads.find(x => x.id === h.id) || {}, { ...h, name: h.name.trim() });
  else d.heads.push({ id: uid(), frequency: 'monthly', due_month: 1, is_optional: false, sort: d.heads.length + 1, is_active: true, ...h, name: h.name.trim() });
  save();
  if (d.session.billing_enabled) generate(null);
  return { ok: true };
}

export function getLedger(studentId) {
  const d = ready();
  return {
    session: d.session,
    lines: linesFor(studentId).sort((a, b) => a.period.localeCompare(b.period) || a.head_sort - b.head_sort),
    adjustments: d.adjustments.filter(a => a.student_id === studentId),
    payments: d.payments.filter(p => p.student_id === studentId || p.claimed_student_id === studentId),
  };
}

export function collect({ studentId, lines, mode, reference, paidOn: on, note, source }) {
  ready();
  const res = collectInternal(studentId, lines, { mode, reference, paidOn: on, note, source });
  clearManual(studentId);
  save();
  refreshStatus(studentId);
  return res;
}

export function listPayments({ status = 'all', from, to, q, limit = 200 } = {}) {
  const d = ready();
  const s = (q || '').trim().toLowerCase();
  return d.payments.filter(p =>
    (status === 'all' || p.status === status) &&
    (!from || p.paid_on >= from) && (!to || p.paid_on <= to) &&
    (!s || [p.student_name, p.roll_no, p.receipt_no, p.utr, p.txn_ref].join(' ').toLowerCase().includes(s))
  ).slice(0, limit);
}

export function getPayment(id) {
  const d = ready();
  const payment = d.payments.find(p => p.id === id) || fail('Receipt not found.');
  const items = d.allocations.filter(a => a.payment_id === id).map(a => {
    const row = d.dues.find(r => r.id === a.due_id);
    return { period: row?.period, head_name: headOf(row?.head_id).name, amount: a.amount };
  }).sort((a, b) => String(a.period).localeCompare(String(b.period)));
  return { payment, items };
}

export function verify(paymentId, studentId, lines) {
  const d = ready();
  const p = d.payments.find(x => x.id === paymentId) || fail('Payment not found.');
  if (p.status !== 'pending') fail('This payment has already been dealt with.');
  const st = activeStudents().find(s => idOf(s) === studentId) || fail('Student not found on the register.');
  const snapshot = d.allocations.length;
  let total;
  try {
    total = allocateInternal(p.id, studentId, lines);
    if (Math.abs(total - p.amount) > 0.009) fail(`The months chosen add up to ₹${total}, but the payment was ₹${p.amount}.`);
  } catch (e) { d.allocations.length = snapshot; throw e; }
  Object.assign(p, {
    status: 'verified', student_id: studentId, student_name: st.name, roll_no: st.roll_no, class: st.class,
    receipt_no: p.receipt_no || nextReceipt(), periods: periodsOf(p.id), verified_at: new Date().toISOString(),
  });
  clearManual(studentId);
  save();
  refreshStatus(studentId);
  return { ok: true, receipt_no: p.receipt_no, amount: total };
}

export function reject(paymentId, reason) {
  if (!reason?.trim()) fail('Give a reason for rejecting it.');
  const p = ready().payments.find(x => x.id === paymentId);
  if (!p || p.status !== 'pending') fail('Only a payment waiting for verification can be rejected.');
  Object.assign(p, { status: 'rejected', cancel_reason: reason.trim(), cancelled_at: new Date().toISOString() });
  save();
  return { ok: true };
}

export function cancel(paymentId, reason) {
  if (!reason?.trim()) fail('Give a reason for cancelling it.');
  const p = ready().payments.find(x => x.id === paymentId);
  if (!p || p.status !== 'verified') fail('Only an active receipt can be cancelled.');
  Object.assign(p, { status: 'cancelled', cancel_reason: reason.trim(), cancelled_at: new Date().toISOString() });
  if (p.student_id) clearManual(p.student_id);
  save();
  if (p.student_id) refreshStatus(p.student_id);
  return { ok: true };
}

export function updateDue(dueId, { amount, concession, waived, note } = {}) {
  const d = ready();
  const row = d.dues.find(r => r.id === dueId) || fail('That month was not found.');
  const l = lineOf(row);
  const nextAmt = amount ?? row.amount, nextCon = concession ?? row.concession;
  if (nextCon > nextAmt) fail('The concession cannot be more than the amount.');
  if (nextAmt - nextCon < l.paid) fail(`₹${l.paid} has already been paid for this month; the amount cannot go below that.`);
  Object.assign(row, { amount: num(nextAmt), concession: num(nextCon), waived: waived ?? row.waived,
                       note: note?.trim() || row.note, is_manual: true });
  save();
  refreshStatus(row.student_id);
  return { ok: true };
}

export function addDue({ studentId, period, headId, amount, note }) {
  const d = ready();
  if (!(Number(amount) > 0)) fail('Enter an amount.');
  const key = monthKey(period);
  const hit = d.dues.find(r => r.student_id === studentId && r.period === key && r.head_id === headId);
  if (hit) Object.assign(hit, { amount: num(hit.amount + Number(amount)), is_manual: true, note: [hit.note, note].filter(Boolean).join(' · ') });
  else d.dues.push({ id: uid(), student_id: studentId, session: d.session.id, period: key, head_id: headId,
                     amount: num(amount), concession: 0, waived: false, is_manual: true, note: note || null });
  save();
  refreshStatus(studentId);
  return { ok: true };
}

export function setAdjustment({ studentId, headId, opted = true, amountOverride = null, concessionPct = 0, concessionFlat = 0, reason = '' }) {
  const d = ready();
  const row = { student_id: studentId, session: d.session.id, head_id: headId, opted,
                amount_override: amountOverride === '' || amountOverride == null ? null : num(amountOverride),
                concession_pct: num(concessionPct), concession_flat: num(concessionFlat), reason: reason || null };
  if (row.concession_pct < 0 || row.concession_pct > 100) fail('Concession must be between 0 and 100%.');
  const i = d.adjustments.findIndex(a => a.student_id === studentId && a.head_id === headId);
  if (i >= 0) d.adjustments[i] = { ...d.adjustments[i], ...row }; else d.adjustments.push({ id: uid(), ...row });
  save();
  if (d.session.billing_enabled) generate(studentId);
  return { ok: true };
}

export function classSummary(upto = todayKey()) {
  ready();
  const byClass = new Map();
  for (const s of activeStudents()) {
    const c = byClass.get(s.class) || { class: s.class, students: 0, billed: 0, collected: 0, overdue: 0, upcoming: 0, defaulters: 0 };
    c.students++;
    let owes = false;
    for (const l of linesFor(idOf(s))) {
      if (!l.waived && l.due_date <= upto) c.billed += l.net;
      c.collected += l.paid;
      if (l.due_date <= upto) { c.overdue += l.balance; if (l.balance > 0) owes = true; } else c.upcoming += l.balance;
    }
    if (owes) c.defaulters++;
    byClass.set(s.class, c);
  }
  return [...byClass.values()].map(c => ({ ...c, billed: num(c.billed), collected: num(c.collected), overdue: num(c.overdue), upcoming: num(c.upcoming) }))
    .sort((a, b) => CLASS_LIST.indexOf(a.class) - CLASS_LIST.indexOf(b.class));
}

export function defaulters({ cls = null, upto = todayKey() } = {}) {
  ready();
  return activeStudents()
    .filter(s => !cls || s.class === cls)
    .map(s => {
      const open = linesFor(idOf(s)).filter(l => l.balance > 0 && l.due_date <= upto);
      return { student_id: idOf(s), name: s.name, class: s.class, section: s.section || 'A', roll_no: s.roll_no,
               father_name: s.father_name, contact: s.contact,
               months: [...new Set(open.map(l => l.period))].sort(), amount: num(open.reduce((a, l) => a + l.balance, 0)) };
    })
    .filter(r => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function collectionSummary(from, to) {
  const d = ready();
  const rows = d.payments.filter(p => p.status === 'verified' && p.paid_on >= from && p.paid_on <= to);
  const byMode = {}, byDay = {};
  for (const p of rows) {
    byMode[p.mode] = num((byMode[p.mode] || 0) + p.amount);
    byDay[p.paid_on] = byDay[p.paid_on] || { day: p.paid_on, total: 0, count: 0 };
    byDay[p.paid_on].total = num(byDay[p.paid_on].total + p.amount);
    byDay[p.paid_on].count++;
  }
  return { total: num(rows.reduce((a, p) => a + p.amount, 0)), receipts: rows.length, by_mode: byMode,
           by_day: Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day)),
           pending: d.payments.filter(p => p.status === 'pending').length };
}

export function refreshAllStatus() { ready(); return refreshStatus(null); }

/* ---------- parents (no login) ---------- */
const findStudent = (roll, cls, name) => {
  const n = String(name || '').trim().toUpperCase().replace(/\s+/g, ' ');
  if (!String(roll || '').trim() || n.length < 2) return null;
  return activeStudents().find(s => String(s.roll_no) === String(roll).trim() &&
    s.class.toUpperCase() === String(cls).trim().toUpperCase() &&
    s.name.toUpperCase().split(' ')[0] === n.split(' ')[0] && s.name.toUpperCase().startsWith(n)) || null;
};

export function statement(roll, cls, name) {
  const d = ready();
  const s = findStudent(roll, cls, name);
  if (!s) return { status: 'not_found' };
  const student = { name: s.name, class: s.class, section: s.section || 'A', roll_no: s.roll_no };
  const ls = linesFor(idOf(s));
  if (!ls.length) return { status: 'no_ledger', student };
  const awaiting = new Set(d.payments.filter(p => p.status === 'pending' && p.claimed_student_id === idOf(s)).flatMap(p => p.periods));
  return { status: 'success', session: d.session.id, student, lines: ls, awaiting: [...awaiting] };
}

export function submitOnline({ roll, cls, name, periods, amount, utr, phone, category }) {
  const d = ready();
  const ref = String(utr || '').replace(/\s/g, '').toUpperCase();
  if (!(Number(amount) >= 1) || Number(amount) > 200000) fail('Enter an amount between ₹1 and ₹2,00,000.');
  if (!/^[A-Z0-9]{6,30}$/.test(ref)) fail('Enter the UPI reference (UTR) number shown in your payment app.');
  if (d.payments.some(p => (p.utr || '').toUpperCase() === ref && p.status !== 'rejected')) {
    fail('This UPI reference has already been submitted. The office will verify it shortly.');
  }
  const s = findStudent(roll, cls, name);
  const reference = `WEB-${todayKey().slice(2).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  d.payments.unshift({
    id: uid(), student_id: null, claimed_student_id: s ? idOf(s) : null,
    student_name: String(name).trim().toUpperCase(), roll_no: String(roll).trim(), class: String(cls).toUpperCase(),
    category: category || 'School fee', amount: num(amount), txn_ref: reference, utr: ref, contact: phone || null,
    source: 'portal', mode: 'upi', status: 'pending', periods: periods || [], session: d.session.id,
    paid_on: todayKey(), paid_at: new Date().toISOString(),
  });
  save();
  return { ok: true, reference, matched: !!s };
}
