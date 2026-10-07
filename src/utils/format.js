/* ============================================================
   Formatting helpers shared across pages.
   ============================================================ */

// ₹1,23,456 — Indian digit grouping, no decimals.
export const inr = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// 7 October 2026
export const longDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

// 07/10/2026
export const shortDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

// 07 Oct 2026, 2:45 pm
export const dateTime = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

// { d, m } for the calendar-style date blocks on the Events page.
export const dateParts = (d) => {
  const date = new Date(d);
  return {
    day: date.toLocaleDateString('en-IN', { day: '2-digit' }),
    month: date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    year: date.getFullYear(),
  };
};

// "in 13 days" / "4 days ago" / "today"
export const relativeDays = (d) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(d); target.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
};

// Builds the UPI deep-link that the QR encodes.
export const upiLink = ({ upiId, payeeName, amount, note }) =>
  `upi://pay?pa=${encodeURIComponent(upiId)}` +
  `&pn=${encodeURIComponent(payeeName)}` +
  `&am=${encodeURIComponent(amount)}` +
  `&cu=INR&tn=${encodeURIComponent(note)}`;

// A readable, unique-enough transaction reference.
export const makeTxnId = () => {
  const stamp = new Date();
  const ymd = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `ADA${ymd}${rand}`;
};

// Sequential-looking admission/student id.
export const makeStudentId = () => `STU-${Date.now().toString().slice(-6)}`;
export const makeMarksId = () => `M-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;

// Initials for avatar circles — first letter of first two words.
export const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();

// Validation used by the forms.
export const isPhone = (v) => /^[6-9]\d{9}$/.test(String(v).replace(/\D/g, ''));
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
export const nonEmpty = (v) => String(v ?? '').trim().length > 0;
