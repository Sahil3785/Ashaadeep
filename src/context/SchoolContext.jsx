import React, { createContext, useContext, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { SCHOOL } from '../data/school';
import { SEED_STUDENTS, SEED_MARKS } from '../data/academics';
import { useLocalState } from '../hooks';
import { makeStudentId, makeMarksId } from '../utils/format';
import { auth, staffApi, publicApi, sync, isConfigured } from '../lib/api';

const SchoolContext = createContext(null);

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool must be used inside <SchoolProvider>');
  return ctx;
}

/* ============================================================
   SchoolProvider

   Runs in one of two modes:

   • CONNECTED  — VITE_SUPABASE_URL is set. Staff sign in with their own
     email and password; students and marks come from Postgres and are
     shared by the website, every teacher's phone and the office.

   • LOCAL      — no credentials configured. Falls back to the original
     on-device behaviour so the project still runs before the database is
     set up, and so a missing .env never shows a blank page.

   Both modes expose exactly the same functions, which is why the pages and
   the Android screens did not have to change.
   ============================================================ */
export function SchoolProvider({ children }) {
  // ---------- Records ----------
  // In LOCAL mode these persist to localStorage, as they always did.
  // In CONNECTED mode they are a cache of what the server returned.
  const [students, setStudents] = useLocalState('ada.students.v2', isConfigured ? [] : SEED_STUDENTS);
  const [marks, setMarks] = useLocalState('ada.marks.v2', isConfigured ? [] : SEED_MARKS);
  const [payments, setPayments] = useLocalState('ada.payments.v2', []);
  const [enquiries, setEnquiries] = useLocalState('ada.enquiries.v2', []);

  // ---------- Session ----------
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(!isConfigured);
  const [loadingData, setLoadingData] = useState(false);

  // LOCAL mode keeps the old shared-PIN gate so the demo still works.
  const [localTeacher, setLocalTeacher] = useState(() => {
    try { return sessionStorage.getItem('ada.teacher') === '1'; } catch { return false; }
  });

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // ---------- Connectivity ----------
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  const [queued, setQueued] = useState(() => sync.pendingCount());

  const isTeacher = isConfigured
    ? Boolean(profile && profile.is_active)
    : localTeacher;

  const isAdmin = isConfigured ? profile?.role === 'admin' : localTeacher;

  // ---------- Toasts ----------
  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', title = null) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev.slice(-3), { id, message, type, title }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    return id;
  }, []);

  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  // ---------- Watch the connection, and drain the outbox on reconnect ----------
  useEffect(() => {
    const goOnline = async () => {
      setOnline(true);
      if (!isConfigured || !sync.pendingCount()) return;
      const res = await sync.flush();
      setQueued(sync.pendingCount());
      if (res.sent) {
        toastRef.current(
          `${res.sent} ${res.sent === 1 ? 'change' : 'changes'} saved offline have now been uploaded.`,
          'success', 'Back online'
        );
      }
      if (res.failed) {
        toastRef.current(
          `${res.failed} offline ${res.failed === 1 ? 'change' : 'changes'} could not be saved. Please re-enter them.`,
          'error', 'Some changes failed'
        );
      }
    };
    const goOffline = () => {
      setOnline(false);
      toastRef.current(
        'You are offline. Anything you save is kept on this device and uploaded when the connection returns.',
        'warning', 'No connection'
      );
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    if (navigator.onLine) goOnline();
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ---------- Restore the session on load ----------
  useEffect(() => {
    if (!isConfigured) return;
    let alive = true;

    (async () => {
      const s = await auth.getSession();
      if (!alive) return;
      setSession(s);
      if (s?.user) setProfile(await auth.getProfile(s.user.id));
      setAuthReady(true);
    })();

    return auth.onChange(async (s) => {
      if (!alive) return;
      setSession(s);
      setProfile(s?.user ? await auth.getProfile(s.user.id) : null);
      setAuthReady(true);
    });
  }, []);

  // ---------- Load the register once a teacher is signed in ----------
  const refresh = useCallback(async () => {
    if (!isConfigured || !isTeacher) return;
    setLoadingData(true);
    try {
      const [s, m] = await Promise.all([staffApi.listStudents(), staffApi.listMarks()]);
      setStudents(s);
      setMarks(m);
    } catch (err) {
      toastRef.current(err.message, 'error', 'Could not load records');
    } finally {
      setLoadingData(false);
    }
  }, [isTeacher, setStudents, setMarks]);

  useEffect(() => { if (isTeacher) refresh(); }, [isTeacher, refresh]);

  // ---------- Auth actions ----------
  const signIn = useCallback(async (email, password) => {
    if (!isConfigured) throw new Error('The app is not connected to a database yet.');
    await auth.signIn(email, password);
    setPinModalOpen(false);
    toast('Signed in. Loading the register…', 'success', 'Welcome back');
  }, [toast]);

  const signOutTeacher = useCallback(async () => {
    setPinModalOpen(false);
    if (isConfigured) {
      await auth.signOut();
      setProfile(null);
      setSession(null);
      setStudents([]);
      setMarks([]);
    } else {
      setLocalTeacher(false);
      try { sessionStorage.removeItem('ada.teacher'); } catch {}
    }
    toast('You have signed out of the faculty dashboard.', 'info', 'Session ended');
  }, [toast, setStudents, setMarks]);

  /* LOCAL mode only: the original shared PIN. */
  const verifyPin = useCallback((pin) => {
    if (isConfigured) return false;
    const ok = String(pin).trim().toUpperCase() === SCHOOL.teacherPin;
    if (ok) {
      setLocalTeacher(true);
      try { sessionStorage.setItem('ada.teacher', '1'); } catch {}
      setPinModalOpen(false);
      toast('Faculty dashboard unlocked.', 'success', 'Welcome back');
    } else {
      toast('That PIN did not match. The demo PIN is ASHA2026.', 'error', 'Access denied');
    }
    return ok;
  }, [toast]);

  // ---------- Students ----------
  const addStudent = useCallback(async (data) => {
    const clash = students.some(s =>
      String(s.roll_no) === String(data.roll_no) &&
      s.class === data.class &&
      (s.section || 'A') === (data.section || 'A')
    );
    if (clash) {
      toast(`Roll number ${data.roll_no} is already used in ${data.class}-${data.section || 'A'}.`,
            'error', 'Duplicate roll number');
      return false;
    }

    try {
      if (isConfigured) {
        const saved = await staffApi.addStudent(data);
        setStudents(prev => [saved, ...prev]);
      } else {
        setStudents(prev => [{ ...data, student_id: makeStudentId() }, ...prev]);
      }
      toast(`${data.name} has been added to the ${data.class} register.`, 'success', 'Student enrolled');
      setQueued(sync.pendingCount());
      return true;
    } catch (err) {
      toast(err.message, 'error', 'Could not enrol');
      return false;
    }
  }, [students, setStudents, toast]);

  const updateStudent = useCallback(async (studentId, patch) => {
    setStudents(prev => prev.map(s => (idOf(s) === studentId ? { ...s, ...patch } : s)));
    try {
      if (isConfigured) await staffApi.updateStudent(studentId, patch);
      toast('Student record updated.', 'success');
      setQueued(sync.pendingCount());
    } catch (err) {
      toast(err.message, 'error', 'Update failed');
      refresh();
    }
  }, [setStudents, toast, refresh]);

  const deleteStudent = useCallback(async (studentId) => {
    const victim = students.find(s => idOf(s) === studentId);
    setStudents(prev => prev.filter(s => idOf(s) !== studentId));
    setMarks(prev => prev.filter(m => m.student_id !== studentId));
    try {
      if (isConfigured) await staffApi.removeStudent(studentId);
      toast(`${victim?.name || 'The student'} was removed from the register.`, 'info', 'Record removed');
      setQueued(sync.pendingCount());
    } catch (err) {
      toast(err.message, 'error', 'Could not remove');
      refresh();
    }
  }, [students, setStudents, setMarks, toast, refresh]);

  const toggleFee = useCallback(async (studentId) => {
    const current = students.find(s => idOf(s) === studentId);
    if (!current) return;
    const next = current.fee_status === 'PAID' ? 'PENDING' : 'PAID';
    setStudents(prev => prev.map(s => (idOf(s) === studentId ? { ...s, fee_status: next } : s)));
    toast(`${current.name} is now marked ${next}.`, next === 'PAID' ? 'success' : 'warning');
    try {
      if (isConfigured) await staffApi.setFeeStatus(studentId, next);
      setQueued(sync.pendingCount());
    } catch (err) {
      toast(err.message, 'error', 'Could not update the fee status');
      refresh();
    }
  }, [students, setStudents, toast, refresh]);

  // ---------- Marks ----------
  const saveMarks = useCallback(async (row, feeOverride = null) => {
    const optimistic = { ...row, marks_id: row.marks_id || makeMarksId() };
    setMarks(prev => [
      ...prev.filter(m => !(m.student_id === row.student_id &&
                            m.exam_name === row.exam_name &&
                            m.code === row.code)),
      optimistic,
    ]);
    if (feeOverride) {
      setStudents(prev => prev.map(s => (idOf(s) === row.student_id ? { ...s, fee_status: feeOverride } : s)));
    }

    try {
      if (isConfigured) {
        const saved = await staffApi.saveMarks(row);
        setMarks(prev => prev.map(m => (m.marks_id === optimistic.marks_id ? saved : m)));
        if (feeOverride) await staffApi.setFeeStatus(row.student_id, feeOverride);
      }
      toast(`${row.subject} marks saved for ${row.exam_name}.`, 'success', 'Marks recorded');
      setQueued(sync.pendingCount());
    } catch (err) {
      toast(err.message, 'error', 'Could not save the marks');
      refresh();
    }
  }, [setMarks, setStudents, toast, refresh]);

  const deleteMarks = useCallback(async (marksId) => {
    setMarks(prev => prev.filter(m => m.marks_id !== marksId));
    try {
      if (isConfigured) await staffApi.deleteMarks(marksId);
      toast('Mark entry removed.', 'info');
      setQueued(sync.pendingCount());
    } catch (err) {
      toast(err.message, 'error', 'Could not remove the entry');
      refresh();
    }
  }, [setMarks, toast, refresh]);

  // ---------- Public actions ----------
  const recordPayment = useCallback(async (payment) => {
    setPayments(prev => [{ ...payment, at: new Date().toISOString() }, ...prev].slice(0, 100));
    try {
      if (isConfigured) await publicApi.recordPayment(payment);
    } catch (err) {
      // The receipt is already on screen; the office can reconcile from it.
      console.warn('[fee] could not record the payment:', err.message);
    }
  }, [setPayments]);

  const submitEnquiry = useCallback(async (data) => {
    setEnquiries(prev => [{ ...data, id: `ENQ-${Date.now()}`, at: new Date().toISOString() }, ...prev].slice(0, 200));
    try {
      if (isConfigured) await publicApi.submitEnquiry(data);
      toast('Our admissions counsellor will call you within one working day.', 'success', 'Enquiry received');
    } catch (err) {
      toast('Saved, but we could not reach the school server. Please also call the office.', 'warning', 'Partly sent');
    }
  }, [setEnquiries, toast]);

  const resetDemoData = useCallback(() => {
    if (isConfigured) {
      toast('Connected to the school database — demo data cannot be restored from here.', 'info', 'Not available');
      return;
    }
    setStudents(SEED_STUDENTS);
    setMarks(SEED_MARKS);
    setPayments([]);
    toast('All records restored to the original demo data.', 'info', 'Data reset');
  }, [setStudents, setMarks, setPayments, toast]);

  // ---------- Derived figures ----------
  const stats = useMemo(() => {
    const paid = students.filter(s => s.fee_status === 'PAID').length;
    const classes = new Set(students.map(s => s.class));
    return {
      totalStudents: students.length,
      paid,
      pending: students.length - paid,
      collectionRate: students.length ? Math.round((paid / students.length) * 100) : 0,
      totalMarks: marks.length,
      classCount: classes.size,
      byClass: [...classes].sort().map(c => ({
        cls: c,
        count: students.filter(s => s.class === c).length,
        pending: students.filter(s => s.class === c && s.fee_status !== 'PAID').length,
      })),
    };
  }, [students, marks]);

  // Shift+T opens the faculty sign-in from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if (e.shiftKey && (e.key === 'T' || e.key === 't') &&
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (!isTeacher) setPinModalOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isTeacher]);

  const value = useMemo(() => ({
    school: SCHOOL,
    students, marks, payments, enquiries, stats,

    // session
    isTeacher, isAdmin, profile, session, authReady, loadingData,
    pinModalOpen, setPinModalOpen,
    signIn, verifyPin, signOutTeacher, refresh,

    // connectivity
    online, queuedChanges: queued, isConfigured,

    // records
    addStudent, updateStudent, deleteStudent, toggleFee,
    saveMarks, deleteMarks, recordPayment, submitEnquiry, resetDemoData,

    // notifications
    toasts, toast, dismissToast,
  }), [
    students, marks, payments, enquiries, stats,
    isTeacher, isAdmin, profile, session, authReady, loadingData, pinModalOpen,
    signIn, verifyPin, signOutTeacher, refresh, online, queued,
    addStudent, updateStudent, deleteStudent, toggleFee,
    saveMarks, deleteMarks, recordPayment, submitEnquiry, resetDemoData,
    toasts, toast, dismissToast,
  ]);

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

/* `student_id` is the app's key in both modes: a uuid when connected to the
   database, a generated string when running locally. This keeps the two
   interchangeable so no screen has to care which mode it is in. */
const idOf = (s) => s.student_id || s.id;
export { idOf };
