/* ============================================================
   A stack of "close me" callbacks for anything overlaying the
   screen (bottom sheets today). The Android back button pops the
   top entry, so back closes the sheet instead of leaving the
   screen — which is what the platform's users expect.
   ============================================================ */
const stack = [];

export function pushDismiss(fn) {
  stack.push(fn);
  return () => {
    const i = stack.indexOf(fn);
    if (i >= 0) stack.splice(i, 1);
  };
}

/* Returns true if something was actually dismissed. */
export function popDismiss() {
  const fn = stack.pop();
  if (!fn) return false;
  try { fn(); } catch { /* a closed sheet is not worth crashing over */ }
  return true;
}

export const hasOverlay = () => stack.length > 0;
