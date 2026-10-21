import React, { useState, useRef, useEffect } from 'react';
import {
  GraduationCap, Delete, ShieldCheck, Info, Mail, KeyRound, Eye, EyeOff,
  AlertCircle, LogIn, WifiOff, UserPlus, User, CheckCircle2,
} from 'lucide-react';
import { SCHOOL } from '../data/school';
import { useSchool } from '../context/SchoolContext';
import { tap } from './native';
import { Field, Btn, inputCls } from './components/Chrome';
import { auth } from '../lib/api';

/* ============================================================
   Sign-in.

   Connected to the school database → each teacher uses their own
   email and password. Supabase keeps the session, so they sign in
   once and stay signed in until they sign out.

   Not connected → the original keypad PIN, so the app still runs
   before the database is set up.
   ============================================================ */
export default function Login() {
  const { isConfigured } = useSchool();
  return (
    <div className="min-h-screen flex flex-col bg-ink-950 text-white">
      <Crest />
      {isConfigured ? <ConnectedLogin /> : <PinLogin />}
    </div>
  );
}

function Crest() {
  return (
    <div className="pt-12 pb-6 flex flex-col items-center text-center px-6">
      <div className="relative w-20 h-20 mb-5">
        <div className="absolute inset-0 rounded-3xl bg-brass-500/25 blur-2xl" />
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-brass-400 to-brass-600 flex items-center justify-center shadow-brass">
          <GraduationCap className="w-10 h-10 text-ink-950" strokeWidth={2.3} />
        </div>
      </div>
      <p className="text-[10px] font-extrabold uppercase tracking-[.28em] text-brass-400">Faculty App</p>
      <h1 className="font-display text-xl font-extrabold mt-2 leading-tight">{SCHOOL.name}</h1>
      <p className="text-[12px] text-ink-400 mt-1">{SCHOOL.village}, {SCHOOL.district}</p>
    </div>
  );
}

/* ---------- Connected: sign in, or ask for an account ---------- */
function ConnectedLogin() {
  const [mode, setMode] = useState('signin');
  return mode === 'signin'
    ? <EmailLogin onRequest={() => setMode('request')} />
    : <RequestAccess onBack={() => setMode('signin')} />;
}

const darkInput = (error) =>
  `w-full rounded-2xl border bg-white/8 pl-10 pr-3.5 py-3.5 text-base text-white placeholder:text-ink-600 outline-none transition-all
   ${error ? 'border-rose-400' : 'border-white/15 focus:border-brass-400 focus:bg-white/12'}`;

function RequestAccess({ onBack }) {
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => { setF(x => ({ ...x, [k]: e.target.value })); setError(null); };

  const submit = async (e) => {
    e.preventDefault();
    let problem = null;
    if (f.name.trim().length < 2) problem = 'Enter your full name.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) problem = 'Enter a valid email address.';
    else if (f.password.length < 8) problem = 'Choose a password of at least 8 characters.';
    else if (f.password !== f.confirm) problem = 'The two passwords do not match.';
    if (problem) { tap('error'); setError(problem); return; }

    setBusy(true);
    try {
      setDone(await auth.requestAccess({ fullName: f.name, email: f.email, password: f.password }));
      tap('success');
    } catch (err) {
      tap('error');
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex-1 flex flex-col px-5 pb-8 text-center">
        <CheckCircle2 className="w-14 h-14 text-garden-400 mx-auto mt-4" />
        <p className="font-display text-xl font-extrabold mt-4">Request sent</p>
        <p className="text-[13px] text-ink-300 mt-2 leading-relaxed">
          {done.needsEmailConfirmation && <>First, open the email sent to <strong className="text-white">{f.email}</strong> and confirm your address. </>}
          The principal will approve your account — then sign in with this email and password.
        </p>
        <button onClick={onBack}
                className="mt-8 w-full rounded-2xl px-5 py-3.5 text-[15px] font-bold bg-white/10 text-white active:scale-[.97]">
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex-1 flex flex-col px-5 pb-8">
      <p className="text-[12px] text-ink-300 bg-white/6 border border-white/10 rounded-2xl p-3 mb-4 leading-relaxed">
        For teaching staff only. Your account stays locked until the principal approves it.
      </p>
      <div className="space-y-3.5">
        {[
          ['ra-name', 'Full name', 'name', 'text', 'name', User],
          ['ra-email', 'School email address', 'email', 'email', 'username', Mail],
          ['ra-pass', 'Choose a password', 'password', 'password', 'new-password', KeyRound],
          ['ra-confirm', 'Repeat the password', 'confirm', 'password', 'new-password', KeyRound],
        ].map(([id, label, key, type, ac, Icon]) => (
          <div key={id}>
            <label htmlFor={id} className="block text-[12px] font-bold text-ink-300 mb-1.5">{label}</label>
            <div className="relative">
              <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500 pointer-events-none" />
              <input id={id} type={type} autoComplete={ac} value={f[key]} onChange={set(key)}
                     inputMode={type === 'email' ? 'email' : undefined} className={darkInput(error)} />
            </div>
          </div>
        ))}

        {error && (
          <p className="flex items-start gap-2 text-[12px] font-semibold text-rose-300 bg-rose-500/12 border border-rose-500/30 rounded-2xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </p>
        )}

        <button type="submit" disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-bold
                           bg-gradient-to-br from-brass-400 to-brass-500 text-ink-950 shadow-brass active:scale-[.97] transition-all disabled:opacity-55">
          <UserPlus className="w-4.5 h-4.5" /> {busy ? 'Sending…' : 'Request access'}
        </button>
        <button type="button" onClick={onBack} className="w-full py-2 text-[13px] font-bold text-ink-300 active:text-white">
          Already approved? Sign in
        </button>
      </div>
    </form>
  );
}

/* ---------- Connected: email + password ---------- */
function EmailLogin({ onRequest }) {
  const { signIn, online } = useSchool();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Remember the last email used on this device — teachers share phones rarely,
  // and retyping an address on a phone keypad is a real annoyance.
  useEffect(() => {
    try { setEmail(localStorage.getItem('ada.lastEmail') || ''); } catch {}
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) { setError('Enter both your email and your password.'); return; }

    setBusy(true);
    try {
      await signIn(email, password);
      try { localStorage.setItem('ada.lastEmail', email.trim().toLowerCase()); } catch {}
      tap('success');
    } catch (err) {
      tap('error');
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex-1 flex flex-col px-5 pb-8">
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-[12px] font-bold text-ink-300 mb-1.5">
            School email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500 pointer-events-none" />
            <input
              id="email" type="email" inputMode="email" autoComplete="username"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              placeholder="teacher@ashadeepadarsh.in"
              className={`w-full rounded-2xl border bg-white/8 pl-10 pr-3.5 py-3.5 text-base text-white
                         placeholder:text-ink-600 outline-none transition-all
                         ${error ? 'border-rose-400' : 'border-white/15 focus:border-brass-400 focus:bg-white/12'}`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-[12px] font-bold text-ink-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500 pointer-events-none" />
            <input
              id="password" type={show ? 'text' : 'password'} autoComplete="current-password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              placeholder="Your password"
              className={`w-full rounded-2xl border bg-white/8 pl-10 pr-12 py-3.5 text-base text-white
                         placeholder:text-ink-600 outline-none transition-all
                         ${error ? 'border-rose-400' : 'border-white/15 focus:border-brass-400 focus:bg-white/12'}`}
            />
            <button type="button" onClick={() => setShow(s => !s)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 active:text-white p-1">
              {show ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="flex items-start gap-2 text-[12px] font-semibold text-rose-300 bg-rose-500/12 border border-rose-500/30 rounded-2xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </p>
        )}

        {!online && (
          <p className="flex items-start gap-2 text-[12px] font-semibold text-brass-300 bg-brass-500/12 border border-brass-500/30 rounded-2xl p-3">
            <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
            You appear to be offline. Signing in for the first time needs a connection;
            after that the app remembers you.
          </p>
        )}

        <button type="submit" disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5
                           text-[15px] font-bold bg-gradient-to-br from-brass-400 to-brass-500
                           text-ink-950 shadow-brass active:scale-[.97] transition-all disabled:opacity-55">
          {busy
            ? <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg> Signing in…</>
            : <><LogIn className="w-4.5 h-4.5" /> Sign in</>}
        </button>
      </div>

      <div className="mt-auto pt-8 space-y-3">
        <button type="button" onClick={onRequest}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-bold
                           bg-white/8 border border-white/12 text-white active:scale-[.97] transition-all">
          <UserPlus className="w-4 h-4" /> New teacher? Request access
        </button>
        <p className="text-center text-[11px] text-ink-500 leading-relaxed">
          Forgotten your password? Ask the principal to reset it for you.
        </p>
        <p className="text-center text-[10.5px] text-ink-600 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3 h-3" /> Your session stays on this phone only
        </p>
      </div>
    </form>
  );
}

/* ---------- Not connected: the original keypad PIN ---------- */
const PIN_LENGTH = SCHOOL.teacherPin.length;
const KEYS = [['A', 'S', 'H'], ['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['0', 'DEL']];

function PinLogin() {
  const { verifyPin } = useSchool();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const checking = useRef(false);

  const push = (k) => {
    if (busy) return;
    tap();
    if (k === 'DEL') { setPin(p => p.slice(0, -1)); return; }
    setPin(p => (p.length >= PIN_LENGTH ? p : p + k));
  };

  useEffect(() => {
    if (pin.length !== PIN_LENGTH || checking.current) return;
    checking.current = true;
    setBusy(true);
    const t = setTimeout(() => {
      const ok = verifyPin(pin);
      setBusy(false);
      checking.current = false;
      if (ok) tap('success');
      else {
        tap('error'); setPin(''); setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    }, 380);
    return () => clearTimeout(t);
  }, [pin, verifyPin]);

  return (
    <div className="flex-1 flex flex-col px-5 pb-6">
      <div className={`flex gap-2.5 justify-center mb-2 ${shake ? 'animate-shake' : ''}`}
           role="status" aria-label={`${pin.length} of ${PIN_LENGTH} characters entered`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span key={i} className={`w-3 h-3 rounded-full transition-all duration-200 ${
            i < pin.length ? 'bg-brass-400 scale-110' : 'bg-white/18'}`} />
        ))}
      </div>
      <p className="text-[12.5px] text-ink-300 h-5 text-center mb-6">
        {busy ? 'Checking…' : 'Enter the faculty PIN'}
      </p>

      <div className="space-y-2.5 mt-auto">
        {KEYS.map((row, ri) => (
          <div key={ri} className="flex gap-2.5 justify-center">
            {row.map(k => (
              <button key={k} onClick={() => push(k)} disabled={busy}
                      aria-label={k === 'DEL' ? 'Delete last character' : `Enter ${k}`}
                      className={`flex-1 max-w-[7.5rem] h-14 rounded-2xl font-display text-xl font-extrabold
                                 flex items-center justify-center transition-all active:scale-90 disabled:opacity-40
                                 ${k === 'DEL' ? 'bg-white/8 text-ink-300'
                                   : 'bg-white/12 text-white active:bg-brass-400 active:text-ink-950'}`}>
                {k === 'DEL' ? <Delete className="w-5 h-5" /> : k}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-2.5 mt-5 p-3 rounded-2xl bg-white/6 border border-white/10">
        <Info className="w-4 h-4 text-brass-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-ink-300 leading-relaxed">
          No school database is connected, so this build is in offline demo mode and the
          PIN is <strong className="font-mono text-brass-300">{SCHOOL.teacherPin}</strong>.
          Once Supabase credentials are added this becomes a per-teacher email sign-in.
        </p>
      </div>
    </div>
  );
}
