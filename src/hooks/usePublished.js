import { useEffect, useState } from 'react';
import { publicApi, isConfigured } from '../lib/api';
import { NOTICES, EVENTS } from '../data/school';

/* ============================================================
   usePublished — the notices and events the public sees.

   Connected: whatever the office has published in the database,
   shown from the last cached copy first so the page never waits.
   If the office has not published anything yet, the built-in
   notices are shown instead of an empty board.
   Not connected: the built-in notices, as before.
   ============================================================ */
export function usePublished() {
  const pick = (rows, fallback) => (rows && rows.length ? rows : fallback);

  const [notices, setNotices] = useState(() => (isConfigured ? pick(publicApi.cachedNotices(), NOTICES) : NOTICES));
  const [events, setEvents] = useState(() => (isConfigured ? pick(publicApi.cachedEvents(), EVENTS) : EVENTS));

  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;
    publicApi.getNotices().then(r => alive && setNotices(pick(r, NOTICES)), () => {});
    publicApi.getEvents().then(r => alive && setEvents(pick(r, EVENTS)), () => {});
    return () => { alive = false; };
  }, []);

  return { notices, events };
}
