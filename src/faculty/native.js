/* ============================================================
   Native bridge.

   Every call here is optional: the same code runs in a desktop
   browser during `npm run dev:app`, where Capacitor is absent.
   Each helper checks for the plugin and quietly no-ops if it is
   not there, so nothing crashes outside the APK.
   ============================================================ */

let Capacitor = null;
let AppPlugin = null;
let StatusBar = null;
let Keyboard = null;
let Haptics = null;
let ImpactStyle = null;

export async function initNative() {
  try {
    ({ Capacitor } = await import('@capacitor/core'));
  } catch {
    return false;
  }
  if (!Capacitor?.isNativePlatform?.()) return false;

  // Load the plugins only on a real device.
  try { ({ App: AppPlugin } = await import('@capacitor/app')); } catch {}
  try { ({ StatusBar } = await import('@capacitor/status-bar')); } catch {}
  try { ({ Keyboard } = await import('@capacitor/keyboard')); } catch {}
  try { ({ Haptics, ImpactStyle } = await import('@capacitor/haptics')); } catch {}

  // Navy status bar with light icons, sitting above the web view rather
  // than behind it — that way nothing hides under the notch.
  try {
    await StatusBar?.setOverlaysWebView({ overlay: false });
    await StatusBar?.setBackgroundColor({ color: '#18213c' });
    await StatusBar?.setStyle({ style: 'DARK' }); // 'DARK' = light icons on dark bar
  } catch {}

  // Let the layout know the keyboard is up so the bottom bar can hide.
  try {
    Keyboard?.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });
    Keyboard?.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });
  } catch {}

  return true;
}

export const isNative = () => {
  try { return !!Capacitor?.isNativePlatform?.(); } catch { return false; }
};

/* Android hardware back button. `handler` returns true if it consumed
   the press; returning false lets the app minimise instead of exiting,
   which is what Android users expect from a home screen. */
export function onBackButton(handler) {
  if (!AppPlugin) return () => {};

  let sub = null;
  let cancelled = false;

  AppPlugin.addListener('backButton', () => {
    const consumed = handler();
    if (!consumed) AppPlugin.minimizeApp?.();
  }).then(s => {
    sub = s;
    // addListener resolves asynchronously. If the caller unsubscribed while
    // it was still pending, `sub` was null in the cleanup below and the
    // listener would have leaked — one extra handler per re-registration,
    // all firing on a single back press.
    if (cancelled) { try { s.remove(); } catch {} }
  });

  return () => {
    cancelled = true;
    try { sub?.remove(); } catch {}
  };
}

/* A short tap of feedback on meaningful actions (save, sign in, errors). */
export async function tap(kind = 'light') {
  try {
    if (!Haptics) return;
    if (kind === 'success') return Haptics.notification({ type: 'SUCCESS' });
    if (kind === 'error') return Haptics.notification({ type: 'ERROR' });
    return Haptics.impact({ style: ImpactStyle?.Light ?? 'LIGHT' });
  } catch {}
}
