import React, { useCallback, useEffect, useState } from 'react';
import { IndianRupee, ShieldCheck, BookOpen, AlertTriangle, Settings2 } from 'lucide-react';
import { useSchool } from '../../../context/SchoolContext';
import { fees } from '../../../lib/fees';
import { Tabs } from '../../../components/UI';
import Collect from './Collect';
import Verify from './Verify';
import Receipts from './Receipts';
import Defaulters from './Defaulters';
import Setup from './Setup';

/* ============================================================
   FEES — the office's fee desk, in five parts:
     Collect     take a payment at the counter, month by month
     Verify      confirm payments parents made online
     Receipts    the day book: totals by mode, reprint, cancel
     Defaulters  who owes what, with WhatsApp reminders
     Setup       session, fee heads and the class rate card
   ============================================================ */
export default function FeesTab() {
  const { feeSummary, refreshFeeSummary } = useSchool();
  const [view, setView] = useState('collect');
  const [collectFor, setCollectFor] = useState(null);
  const [toVerify, setToVerify] = useState(null);

  // A month whose due date passed overnight should already read PENDING.
  useEffect(() => { fees.refreshAllStatus().catch(() => {}); }, []);
  useEffect(() => { if (feeSummary) setToVerify(feeSummary.pending ?? null); }, [feeSummary]);

  // Stable, so Verify's "list loaded" effect does not fire on every render.
  const onVerifyCount = useCallback((n) => setToVerify(n), []);

  const tabs = [
    { id: 'collect', label: 'Collect fee', icon: IndianRupee },
    { id: 'verify', label: 'Verify online', icon: ShieldCheck, count: toVerify ?? undefined },
    { id: 'receipts', label: 'Receipts', icon: BookOpen },
    { id: 'defaulters', label: 'Defaulters', icon: AlertTriangle },
    { id: 'setup', label: 'Setup', icon: Settings2 },
  ];

  return (
    <div className="space-y-5">
      <Tabs tabs={tabs} active={view} onChange={setView} label="Fee sections" />
      {view === 'collect' && <Collect initialStudentId={collectFor} onSetup={() => setView('setup')} />}
      {view === 'verify' && <Verify onCount={onVerifyCount} onChanged={refreshFeeSummary} />}
      {view === 'receipts' && <Receipts />}
      {view === 'defaulters' && <Defaulters onCollect={(id) => { setCollectFor(id); setView('collect'); }} />}
      {view === 'setup' && <Setup />}
    </div>
  );
}
