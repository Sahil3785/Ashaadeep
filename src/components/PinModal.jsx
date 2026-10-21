import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Info, Mail, Eye, EyeOff, AlertCircle, KeyRound, UserPlus, User, CheckCircle2 } from 'lucide-react';
import { Modal } from './UI';
import { useSchool } from '../context/SchoolContext';
import { SCHOOL } from '../data/school';
import { Spinner } from './Loaders';
import { auth } from '../lib/api';

/* ============================================================
   Faculty sign-in.

   Connected to the database → each teacher signs in with their own
   email and password, so the register shows who entered what and a
   departing teacher can be removed without disturbing anyone else.

   Not yet connected → falls back to the original shared demo PIN,
   so the project still runs before Supabase is set up.
   ============================================================ */
export default function PinModal() {
  const { pinModalOpen, setPinModalOpen, isConfigured } = useSchool();
  return (
    <Modal
      open={pinModalOpen}
      onClose={() => setPinModalOpen(false)}
      icon={ShieldCheck}
      title="Faculty Sign In"
      subtitle={isConfigured
        ? 'Use the email and password the school gave you. Only teaching staff should use this area.'
        : 'Enter the faculty PIN to open the marks and register dashboard.'}
      size="sm"
    >
      {isConfigured ? <ConnectedForms /> : <PinForm />}
    </Modal>
  );
}

/* ---------- Connected: sign in, or ask for an account ---------- */
function ConnectedForms() {
  const [mode, setMode] = useState('signin');
  return mode === 'signin'
    ? <EmailForm onRequest={() => setMode('request')} />
    : <RequestAccessForm onBack={() => setMode('signin')} />;
}

function RequestAccessForm({ onBack }) {
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => { setF(x => ({ ...x, [k]: e.target.value })); setError(null); };

  const submit = async (e) => {
    e.preventDefault();
    if (f.name.trim().length < 2) return setError('Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setError('Enter a valid email address.');
    if (f.password.length < 8) return setError('Choose a password of at least 8 characters.');
    if (f.password !== f.confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      setDone(await auth.requestAccess({ fullName: f.name, email: f.email, password: f.password }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-garden-600 mx-auto" />
        <p className="font-display text-lg font-extrabold text-ink-950">Request sent</p>
        <p className="text-[13px] text-ink-soft leading-relaxed">
          {done.needsEmailConfirmation && <>First, open the email we just sent to <strong>{f.email}</strong> and confirm your address. </>}
          The principal will approve your account — after that, sign in with this email and password.
        </p>
        <button onClick={onBack} className="btn-ghost w-full">Back to sign in</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <p className="text-[12px] text-ink-soft bg-ink-50 border border-ink-900/8 rounded-xl p-3 leading-relaxed">
        For teaching staff only. Your account stays locked until the principal approves it.
      </p>
      {[
        ['ra-name', 'Full name', 'name', 'text', 'name', User],
        ['ra-email', 'School email address', 'email', 'email', 'username', Mail],
        ['ra-pass', 'Choose a password', 'password', 'password', 'new-password', KeyRound],
        ['ra-confirm', 'Repeat the password', 'confirm', 'password', 'new-password', KeyRound],
      ].map(([id, label, key, type, ac, Icon]) => (
        <div key={id}>
          <label htmlFor={id} className="field-label">{label}</label>
          <div className="relative">
            <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
            <input id={id} type={type} autoComplete={ac} value={f[key]} onChange={set(key)} className="field pl-10" />
          </div>
        </div>
      ))}
      {error && (
        <p className="flex items-start gap-2 text-[12px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? <><Spinner className="w-4 h-4" /> Sending…</> : <><UserPlus className="w-4 h-4" /> Request access</>}
      </button>
      <button type="button" onClick={onBack} className="w-full text-[12px] font-bold text-ink-soft hover:text-ink-950">
        Already approved? Sign in
      </button>
    </form>
  );
}

/* ---------- Connected: per-teacher email + password ---------- */
function EmailForm({ onRequest }) {
  const { signIn } = useSchool();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const first = useRef(null);

  useEffect(() => { setTimeout(() => first.current?.focus(), 120); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter both your email and your password.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      navigate('/faculty-dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="staff-email" className="field-label">School email address</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
          <input
            ref={first}
            id="staff-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null); }}
            placeholder="teacher@ashadeepadarsh.in"
            className={`field pl-10 ${error ? 'field-error' : ''}`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="staff-password" className="field-label">Password</label>
        <div className="relative">
          <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
          <input
            id="staff-password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null); }}
            placeholder="Your password"
            className={`field pl-10 pr-11 ${error ? 'field-error' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-900 transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="flex items-start gap-2 text-[12px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? <><Spinner className="w-4 h-4" /> Signing in…</> : <><Lock className="w-4 h-4" /> Sign in</>}
      </button>

      <button type="button" onClick={onRequest} className="btn-ghost w-full text-xs py-2.5">
        <UserPlus className="w-4 h-4" /> New teacher? Request access
      </button>

      <p className="text-[11px] text-ink-faint text-center leading-relaxed">
        Forgotten your password? Ask the principal to reset it.
      </p>
    </form>
  );
}

/* ---------- Not connected yet: the original shared demo PIN ---------- */
const LENGTH = SCHOOL.teacherPin.length;

function PinForm() {
  const { verifyPin } = useSchool();
  const [chars, setChars] = useState(Array(LENGTH).fill(''));
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputs = useRef([]);
  const navigate = useNavigate();
  const checking = useRef(false);

  useEffect(() => { setTimeout(() => inputs.current[0]?.focus(), 120); }, []);

  const pin = chars.join('');
  const setAt = (i, v) => setChars(prev => { const n = [...prev]; n[i] = v; return n; });

  const onChange = (i, raw) => {
    const v = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!v) { setAt(i, ''); return; }
    const letters = v.split('');
    setChars(prev => {
      const next = [...prev];
      letters.forEach((c, k) => { if (i + k < LENGTH) next[i + k] = c; });
      return next;
    });
    inputs.current[Math.min(i + letters.length, LENGTH - 1)]?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) {
      e.preventDefault(); setAt(i - 1, ''); inputs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const submit = (e) => {
    e?.preventDefault();
    if (pin.length < LENGTH || checking.current) {
      setShake(true); setTimeout(() => setShake(false), 480); return;
    }
    checking.current = true;
    setBusy(true);
    setTimeout(() => {
      const ok = verifyPin(pin);
      setBusy(false);
      checking.current = false;
      if (ok) navigate('/faculty-dashboard');
      else {
        setChars(Array(LENGTH).fill(''));
        setShake(true);
        setTimeout(() => { setShake(false); inputs.current[0]?.focus(); }, 480);
      }
    }, 420);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex justify-center gap-1.5" style={shake ? { animation: 'shake .45s ease' } : undefined}>
        {chars.map((c, i) => (
          <input
            key={i}
            ref={el => (inputs.current[i] = el)}
            value={c}
            onChange={e => onChange(i, e.target.value)}
            onKeyDown={e => onKeyDown(i, e)}
            onFocus={e => e.target.select()}
            type="text" inputMode="text" autoComplete="off"
            aria-label={`PIN character ${i + 1} of ${LENGTH}`}
            className={`w-9 h-12 rounded-xl border-2 text-center font-mono text-lg font-extrabold uppercase
                       transition-all duration-200 outline-none
                       ${c ? 'border-brass-400 bg-brass-50 text-ink-950' : 'border-ink-900/15 bg-white text-ink-900'}
                       focus:border-brass-500 focus:ring-4 focus:ring-brass-400/20`}
          />
        ))}
      </div>

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? <><Spinner className="w-4 h-4" /> Verifying…</> : <><Lock className="w-4 h-4" /> Unlock Dashboard</>}
      </button>

      <button type="button" onClick={() => setChars(SCHOOL.teacherPin.split(''))} className="btn-ghost w-full text-xs py-2.5">
        Fill demo PIN
      </button>

      <div className="flex gap-2.5 p-3 rounded-2xl bg-ink-50 border border-ink-900/8">
        <Info className="w-4 h-4 text-ink-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-ink-soft leading-relaxed">
          No database is connected, so this is the offline demo mode and the PIN is
          <strong className="font-mono text-ink-950"> {SCHOOL.teacherPin}</strong>.
          Once you add your Supabase credentials, this becomes a proper per-teacher
          email and password sign-in.
        </p>
      </div>

      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}`}</style>
    </form>
  );
}
