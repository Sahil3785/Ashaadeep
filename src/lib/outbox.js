/* ============================================================
   Offline outbox.

   Teachers in Karhans will not always have a signal. Rather than
   failing a save, every write that cannot reach the server is
   appended here and replayed, in order, once the connection is
   back. The UI updates immediately either way, so entering marks
   never depends on the network.

   Conflict rule: last write wins. If two teachers edit the same
   student while one is offline, the one whose change reaches the
   server last is the one that sticks. For a school register that
   is the right trade — the alternative is refusing to save.
   ============================================================ */

const KEY = 'ada.outbox.v1';
const MAX = 500;   // beyond this something is wrong; stop growing forever

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (items) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(-MAX)));
  } catch { /* storage full or blocked — the queue stays in memory only */ }
};

export const pending = () => read();
export const pendingCount = () => read().length;

/* Queue one operation. `op` names a handler in the flush map below. */
export function enqueue(op, payload) {
  const items = read();
  items.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    op,
    payload,
    queued_at: new Date().toISOString(),
    attempts: 0,
  });
  write(items);
  return items.length;
}

export function clear() {
  write([]);
}

/* Replay everything, oldest first.

   `handlers` maps op name → async function(payload).
   An entry is dropped once it succeeds, or after repeated failures that are
   clearly not the network (a rejected write will never start working).
   Returns a summary so the UI can tell the teacher what happened. */
export async function flush(handlers, { isNetworkError }) {
  const items = read();
  if (!items.length) return { sent: 0, failed: 0, remaining: 0 };

  const remaining = [];
  let sent = 0;
  let failed = 0;

  for (const item of items) {
    const handler = handlers[item.op];
    if (!handler) { failed++; continue; }   // unknown op: drop it

    try {
      await handler(item.payload);
      sent++;
    } catch (err) {
      if (isNetworkError(err)) {
        // Still offline — stop here and keep this and everything after it,
        // so the original order is preserved.
        remaining.push(item, ...items.slice(items.indexOf(item) + 1));
        break;
      }
      // A real rejection (duplicate roll number, lost permission). Retry a
      // couple of times in case it was transient, then give up on it.
      item.attempts = (item.attempts || 0) + 1;
      if (item.attempts < 3) remaining.push(item);
      else failed++;
    }
  }

  write(remaining);
  return { sent, failed, remaining: remaining.length };
}
