import { createClient } from '@supabase/supabase-js';

/* ============================================================
   Supabase client.

   Credentials come from environment variables, never from source.
   Copy .env.example to .env and fill in your own project's values
   (Supabase dashboard → Project Settings → API).

   The anon key is designed to be public — it ships inside the
   website bundle and inside the APK. It is safe ONLY because Row
   Level Security is switched on for every table; see
   supabase/migrations/002_security.sql. Never put the service_role
   key in any .env the app reads.
   ============================================================ */

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/* Whether the app has been pointed at a database yet. When false the app
   falls back to local-only mode, so it still runs during development and a
   missing .env never shows visitors a blank screen. */
export const isConfigured = Boolean(url && anonKey && url.startsWith('http'));

if (!isConfigured && import.meta.env.DEV) {
  console.warn(
    '[Asha Deep] Supabase is not configured — running in local-only mode.\n' +
    'Copy .env.example to .env and add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        // Keep teachers signed in across app restarts; the token refreshes
        // itself so nobody is thrown out mid-way through entering marks.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,   // no OAuth redirects in this app
        storageKey: 'ada.auth',
      },
      global: { headers: { 'x-client-info': 'ashadeep-portal' } },
      db: { schema: 'public' },
    })
  : null;

/* Turns a Postgres or auth error into something a teacher can act on. */
export function friendlyError(error) {
  if (!error) return null;
  const msg = String(error.message || error);

  if (error.code === '23505' || /duplicate key/i.test(msg)) {
    if (/roll/i.test(msg)) return 'That roll number is already used in this class and section.';
    return 'That record already exists.';
  }
  if (/marks_theory_within_max/i.test(msg)) return 'Theory marks cannot be more than the maximum.';
  if (/marks_practical_within_max/i.test(msg)) return 'Internal marks cannot be more than the maximum.';
  if (/row-level security|not authorised|permission denied/i.test(msg)) {
    return 'Your account is not allowed to do that. Ask the principal to check your role.';
  }
  if (/Invalid login credentials/i.test(msg)) return 'That email and password do not match.';
  if (/Email not confirmed/i.test(msg)) return 'Confirm your email address first — check your inbox.';
  if (/Failed to fetch|NetworkError|network|fetch failed/i.test(msg)) {
    return 'No connection to the school database. Your work is saved on this device and will sync when you are back online.';
  }
  return msg;
}

/* True when the failure was the network rather than a rule or a mistake —
   the data layer uses this to decide whether to queue a write for later. */
export function isNetworkError(error) {
  if (!error) return false;
  const msg = String(error.message || error);
  return /Failed to fetch|NetworkError|network|fetch failed|timeout|ECONN/i.test(msg);
}
