import React from 'react';
import { WifiOff, CloudUpload, Cloud, HardDrive } from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';

/* ============================================================
   SyncBar — a thin strip under the title bar that tells the
   teacher the truth about where their work is going.

   It is deliberately quiet when everything is normal: a teacher
   with a good connection and nothing queued sees nothing at all.
   ============================================================ */
export default function SyncBar() {
  const { online, queuedChanges, isConfigured, loadingData } = useSchool();

  // Not connected to a database at all — say so once, clearly.
  if (!isConfigured) {
    return (
      <Strip tone="ink" icon={HardDrive}>
        Demo mode — records are saved on this phone only
      </Strip>
    );
  }

  if (!online) {
    return (
      <Strip tone="brass" icon={WifiOff}>
        Offline{queuedChanges > 0 && ` — ${queuedChanges} ${queuedChanges === 1 ? 'change' : 'changes'} waiting to upload`}
      </Strip>
    );
  }

  if (queuedChanges > 0) {
    return (
      <Strip tone="brass" icon={CloudUpload}>
        Uploading {queuedChanges} saved {queuedChanges === 1 ? 'change' : 'changes'}…
      </Strip>
    );
  }

  if (loadingData) {
    return (
      <Strip tone="ink" icon={Cloud}>
        Refreshing the register…
      </Strip>
    );
  }

  return null;   // all well: stay out of the way
}

function Strip({ tone, icon: Icon, children }) {
  const tones = {
    brass: 'bg-brass-100 text-brass-900 border-brass-300',
    ink: 'bg-ink-100 text-ink-700 border-ink-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <div className={`flex items-center gap-2 px-4 py-2 border-b text-[11.5px] font-semibold ${tones[tone]}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  );
}
