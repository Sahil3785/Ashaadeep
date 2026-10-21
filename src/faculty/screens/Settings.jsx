import React, { useState } from 'react';
import {
  Settings as Cog, LogOut, RotateCcw, Phone, Mail, MapPin, CheckCircle2,
  ShieldCheck, Download, Database, GraduationCap, AlertTriangle, Crown, ChevronRight,
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { Screen, Card, Btn, Sheet, Pill } from '../components/Chrome';
import { tap } from '../native';
import { APP_VERSION } from '../version';
import Admin from './Admin';

/* ============================================================
   Settings — session, data management, and the honest notes
   about what this build does and does not do.
   ============================================================ */
export default function Settings() {
  const { school, signOutTeacher, resetDemoData, students, marks, payments, toast,
          isConfigured, queuedChanges, profile, online, isAdmin } = useSchool();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  /* Export the register as CSV. In the app this hands the file to
     Android's share sheet; in a browser it downloads directly. */
  const exportCsv = async () => {
    tap();
    const header = ['Roll', 'Name', 'Class', 'Section', 'Father', 'Mother', 'Contact', 'House', 'Fee status'];
    const rows = students.map(s => [
      s.roll_no, s.name, s.class, s.section || 'A', s.father_name || '',
      s.mother_name || '', s.contact || '', s.house || '', s.fee_status || 'PAID',
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const filename = `AshaDeep_Register_${new Date().toISOString().slice(0, 10)}.csv`;

    try {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      await Filesystem.writeFile({ path: filename, data: csv, directory: Directory.Cache, encoding: Encoding.UTF8 });
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
      await Share.share({ title: 'Student register', url: uri });
    } catch {
      // Browser (or the plugins are not installed) — fall back to a download.
      try {
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        toast('Register exported.', 'success');
      } catch {
        toast('Could not export the register on this device.', 'error');
      }
    }
  };

  if (showAdmin && isAdmin && isConfigured) {
    return <Admin onBack={() => { setShowAdmin(false); window.scrollTo({ top: 0, behavior: 'instant' }); }} />;
  }

  return (
    <Screen icon={Cog} title="More" subtitle="Session, data and app information">
      {/* session */}
      <h2 className="text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-faint mb-2.5">Session</h2>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-garden-100 text-garden-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-extrabold text-ink-950 truncate">
              {profile?.full_name || 'Signed in as faculty'}
            </p>
            <p className="text-[11.5px] text-ink-soft truncate">
              {profile?.role === 'admin' ? 'Principal / Admin' : isConfigured ? 'Teacher' : 'Demo session'}
              {online ? '' : ' · offline'}
            </p>
          </div>
        </div>
        <Btn variant="danger" className="mt-3.5" onClick={() => setConfirmOut(true)}>
          <LogOut className="w-4 h-4" /> Sign out
        </Btn>
      </Card>

      {isAdmin && isConfigured && (
        <button onClick={() => { tap(); setShowAdmin(true); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                className="w-full mt-3 flex items-center gap-3 p-4 rounded-2xl bg-ink-950 text-white shadow-lift active:scale-[.98] transition-transform text-left">
          <span className="w-10 h-10 rounded-2xl bg-brass-400 text-ink-950 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5" />
          </span>
          <span className="flex-1">
            <span className="block text-[14px] font-extrabold">Admin</span>
            <span className="block text-[11.5px] text-ink-300">Approve staff · activity log</span>
          </span>
          <ChevronRight className="w-5 h-5 text-ink-400" />
        </button>
      )}

      {/* data */}
      <h2 className="text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-faint mt-7 mb-2.5">Data on this device</h2>
      <Card className="divide-y divide-ink-900/6">
        {[
          ['Students', students.length],
          ['Mark entries', marks.length],
          ['Payments logged', payments.length],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between items-center px-4 py-3">
            <span className="text-[13px] text-ink-soft">{k}</span>
            <span className="text-[13.5px] font-extrabold text-ink-950 tabular-nums">{v}</span>
          </div>
        ))}
      </Card>

      <div className="space-y-2.5 mt-3">
        <Btn variant="ink" onClick={exportCsv}>
          <Download className="w-4 h-4" /> Export register as CSV
        </Btn>
        {!isConfigured && (
          <Btn variant="ghost" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="w-4 h-4" /> Restore demo data
          </Btn>
        )}
      </div>

      {/* Where the data actually lives — different answer in each mode. */}
      {isConfigured ? (
        <Card className="p-4 mt-4 bg-garden-50 border-garden-200">
          <div className="flex gap-3">
            <CheckCircle2 className="w-4.5 h-4.5 text-garden-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-[12.5px] font-extrabold text-ink-950">Connected to the school database</p>
              <p className="text-[11.5px] text-ink-soft mt-1 leading-relaxed">
                Marks you enter appear on the school website and on every other
                teacher's phone. If you lose signal the app keeps working and
                uploads your changes when the connection returns
                {queuedChanges > 0 && ` — ${queuedChanges} waiting right now`}.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 mt-4 bg-brass-50 border-brass-200">
          <div className="flex gap-3">
            <AlertTriangle className="w-4.5 h-4.5 text-brass-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-[12.5px] font-extrabold text-ink-950">Demo mode — this phone only</p>
              <p className="text-[11.5px] text-ink-soft mt-1 leading-relaxed">
                No school database is connected, so marks entered here stay on this
                phone, do not reach the website, and are erased if the app is
                uninstalled. Add your Supabase credentials to switch this on.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* school */}
      <h2 className="text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-faint mt-7 mb-2.5">School office</h2>
      <Card className="divide-y divide-ink-900/6">
        <a href={`tel:${school.phoneRaw}`} className="flex items-center gap-3 px-4 py-3 active:bg-ink-50">
          <Phone className="w-4 h-4 text-garden-600 shrink-0" />
          <span className="flex-1 text-[13px] font-semibold text-ink-950">{school.phone}</span>
        </a>
        <a href={`mailto:${school.email}`} className="flex items-center gap-3 px-4 py-3 active:bg-ink-50">
          <Mail className="w-4 h-4 text-brass-600 shrink-0" />
          <span className="flex-1 text-[13px] font-semibold text-ink-950 truncate">{school.email}</span>
        </a>
        <div className="flex items-start gap-3 px-4 py-3">
          <MapPin className="w-4 h-4 text-ink-400 shrink-0 mt-0.5" />
          <span className="flex-1 text-[12.5px] text-ink-soft leading-snug">{school.address}</span>
        </div>
      </Card>

      {/* about */}
      <div className="flex flex-col items-center gap-2 mt-8 mb-2 text-center">
        <span className="w-12 h-12 rounded-2xl bg-ink-950 flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-brass-400" strokeWidth={2.3} />
        </span>
        <p className="text-[13px] font-extrabold text-ink-950">{school.name}</p>
        <p className="text-[11.5px] text-ink-faint">Faculty app · version {APP_VERSION}</p>
        <Pill tone="ink">School code {school.schoolCode}</Pill>
      </div>

      {/* confirmations */}
      <Sheet open={confirmOut} onClose={() => setConfirmOut(false)} title="Sign out?">
        <p className="text-[13px] text-ink-soft leading-relaxed">
          You will need the faculty PIN to get back in. Nothing you have saved is deleted.
        </p>
        <div className="space-y-2.5 mt-5">
          <Btn variant="danger" onClick={() => { setConfirmOut(false); signOutTeacher(); }}>
            <LogOut className="w-4 h-4" /> Sign out
          </Btn>
          <Btn variant="ghost" onClick={() => setConfirmOut(false)}>Stay signed in</Btn>
        </div>
      </Sheet>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Restore demo data?">
        <p className="text-[13px] text-ink-soft leading-relaxed">
          This replaces the register and all marks with the original ten sample students.
          Everything you have added or changed on this device is discarded, and it cannot
          be undone. Export a CSV first if you need a copy.
        </p>
        <div className="space-y-2.5 mt-5">
          <Btn variant="danger" onClick={() => { resetDemoData(); tap('error'); setConfirmReset(false); }}>
            <Database className="w-4 h-4" /> Discard and restore
          </Btn>
          <Btn variant="ghost" onClick={() => setConfirmReset(false)}>Keep my data</Btn>
        </div>
      </Sheet>
    </Screen>
  );
}
