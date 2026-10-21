import { supabase, isConfigured, friendlyError, isNetworkError } from './supabase';
import * as outbox from './outbox';

/* ============================================================
   Every database call the apps make lives here.

   Each function returns plain JavaScript objects shaped exactly
   like the old local records, so the pages and screens did not
   need rewriting when the database arrived.
   ============================================================ */

const CACHE = {
  students: 'ada.cache.students',
  marks: 'ada.cache.marks',
  notices: 'ada.cache.notices',
  events: 'ada.cache.events',
};

const readCache = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : fallback;
    return Array.isArray(v) ? v : fallback;
  } catch { return fallback; }
};

const writeCache = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* full */ }
};

/* The register and marks are cached for offline use. They hold children's
   names, parents' names and phone numbers, so they must not outlive the
   session on a shared computer. */
export const clearStaffCache = () => {
  try {
    localStorage.removeItem(CACHE.students);
    localStorage.removeItem(CACHE.marks);
  } catch { /* storage blocked */ }
};

/* Rows come back from Postgres with database column names; the UI was written
   against the original local shape. These two keep that contract. */
const fromStudentRow = (r) => ({
  id: r.id,
  // The app keys students by `student_id` everywhere, and marks.student_id is
  // the uuid foreign key — so this must be the uuid, not the admission number,
  // or marks would never match their student.
  student_id: r.id,
  admission_no: r.admission_no || null,
  roll_no: String(r.roll_no),
  name: r.name,
  class: r.class,
  section: r.section || 'A',
  father_name: r.father_name || '',
  mother_name: r.mother_name || '',
  contact: r.contact || '',
  dob: r.dob || '',
  house: r.house || '',
  fee_status: r.fee_status || 'PAID',
});

const fromMarkRow = (r) => ({
  marks_id: r.id,
  student_id: r.student_id,
  exam_name: r.exam_name,
  subject: r.subject,
  code: r.code,
  theory_max: Number(r.theory_max),
  theory_obt: Number(r.theory_obt),
  practical_max: Number(r.practical_max),
  practical_obt: Number(r.practical_obt),
});

/* ============================================================
   AUTH
   ============================================================ */
export const auth = {
  async signIn(email, password) {
    if (!isConfigured) throw new Error('The app is not connected to a database yet.');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(friendlyError(error));

    // A correct password is not enough: new accounts start inactive and a
    // departed teacher is deactivated, so refuse those here with a clear reason
    // instead of leaving them on a dashboard the database will not fill.
    const profile = await auth.getProfile(data.user?.id);
    if (!profile?.is_active) {
      await supabase.auth.signOut();
      throw new Error('Your account is not active yet. Ask the principal to activate it.');
    }
    return data;
  },

  async signOut() {
    clearStaffCache();
    if (!isConfigured) return;
    await supabase.auth.signOut();
  },

  async getSession() {
    if (!isConfigured) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /* The signed-in teacher's profile row: name and role. */
  async getProfile(userId) {
    if (!isConfigured || !userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, phone, subject, is_active')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  },

  onChange(callback) {
    if (!isConfigured) return () => {};
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
    return () => data.subscription.unsubscribe();
  },

  async sendPasswordReset(email) {
    if (!isConfigured) throw new Error('The app is not connected to a database yet.');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) throw new Error(friendlyError(error));
  },
};

/* ============================================================
   PUBLIC — anything the website needs without a login
   ============================================================ */
export const publicApi = {
  /* Result lookup. Goes through a database function so a visitor can see one
     marksheet without the students table ever being readable to them. */
  async getResult(roll, name, exam) {
    if (!isConfigured) return { status: 'not_configured' };
    const { data, error } = await supabase.rpc('get_student_result', {
      p_roll: String(roll).trim(),
      p_name: String(name).trim(),
      p_exam: String(exam).trim(),
    });
    if (error) throw new Error(friendlyError(error));
    return data;
  },

  async recordPayment(payment) {
    if (!isConfigured) return { ok: false, reason: 'not_configured' };
    const { error } = await supabase.from('fee_payments').insert({
      student_name: payment.name,
      roll_no: payment.roll,
      class: payment.cls,
      category: payment.category,
      amount: Number(payment.amount),
      txn_ref: payment.txn,
      contact: payment.phone || null,
      source: 'portal',
    });
    if (error) throw new Error(friendlyError(error));

    // Dues are not cleared here: with no gateway confirming the payment, the
    // office verifies it against the bank statement and marks the student PAID.
    return { ok: true };
  },

  async submitEnquiry(e) {
    if (!isConfigured) return { ok: false, reason: 'not_configured' };
    const { error } = await supabase.from('enquiries').insert({
      parent_name: e.parent,
      phone: e.phone,
      email: e.email || null,
      student_name: e.student,
      class_applying: e.cls,
      village: e.village,
      dob: e.dob || null,
      transport: e.transport,
      message: e.message || null,
    });
    if (error) throw new Error(friendlyError(error));
    return { ok: true };
  },

  async getNotices() {
    if (!isConfigured) return null;
    const { data, error } = await supabase
      .from('notices')
      .select('id, title, body, tag, is_urgent, publish_date')
      .eq('is_published', true)
      .order('publish_date', { ascending: false })
      .limit(50);
    if (error) throw new Error(friendlyError(error));
    const mapped = data.map(n => ({
      id: n.id, title: n.title, body: n.body, tag: n.tag,
      urgent: n.is_urgent, date: n.publish_date,
    }));
    writeCache(CACHE.notices, mapped);
    return mapped;
  },

  async getEvents() {
    if (!isConfigured) return null;
    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_type, description, event_date')
      .eq('is_published', true)
      .order('event_date', { ascending: true })
      .limit(50);
    if (error) throw new Error(friendlyError(error));
    const mapped = data.map(e => ({
      id: e.id, title: e.title, type: e.event_type,
      desc: e.description, date: e.event_date,
    }));
    writeCache(CACHE.events, mapped);
    return mapped;
  },

  cachedNotices: () => readCache(CACHE.notices),
  cachedEvents: () => readCache(CACHE.events),
};

/* ============================================================
   STAFF — requires a signed-in teacher
   ============================================================ */
export const staffApi = {
  async listStudents() {
    if (!isConfigured) return readCache(CACHE.students);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('is_active', true)
      .order('class')
      .order('roll_no');
    if (error) {
      if (isNetworkError(error)) return readCache(CACHE.students);
      throw new Error(friendlyError(error));
    }
    const mapped = data.map(fromStudentRow);
    writeCache(CACHE.students, mapped);
    return mapped;
  },

  async listMarks() {
    if (!isConfigured) return readCache(CACHE.marks);
    const { data, error } = await supabase.from('marks').select('*').limit(5000);
    if (error) {
      if (isNetworkError(error)) return readCache(CACHE.marks);
      throw new Error(friendlyError(error));
    }
    const mapped = data.map(fromMarkRow);
    writeCache(CACHE.marks, mapped);
    return mapped;
  },

  async addStudent(s) {
    const row = {
      roll_no: String(s.roll_no).trim(),
      name: s.name.trim().toUpperCase(),
      class: s.class,
      section: s.section || 'A',
      father_name: s.father_name || null,
      mother_name: s.mother_name || null,
      contact: s.contact || null,
      dob: s.dob || null,
      house: s.house || null,
      fee_status: s.fee_status || 'PAID',
    };
    if (!isConfigured) return { ...fromStudentRow({ ...row, id: crypto.randomUUID() }) };

    const { data, error } = await supabase.from('students').insert(row).select().single();
    if (error) {
      if (isNetworkError(error)) {
        outbox.enqueue('addStudent', row);
        return fromStudentRow({ ...row, id: `local-${Date.now()}` });
      }
      throw new Error(friendlyError(error));
    }
    return fromStudentRow(data);
  },

  async updateStudent(id, patch) {
    const row = {};
    if (patch.roll_no != null) row.roll_no = String(patch.roll_no).trim();
    if (patch.name != null) row.name = patch.name.toUpperCase();
    if (patch.class != null) row.class = patch.class;
    if (patch.section != null) row.section = patch.section;
    if (patch.father_name != null) row.father_name = patch.father_name;
    if (patch.mother_name != null) row.mother_name = patch.mother_name;
    if (patch.contact != null) row.contact = patch.contact;
    if (patch.house != null) row.house = patch.house;
    if (patch.fee_status != null) row.fee_status = patch.fee_status;

    if (!isConfigured) return;
    const { error } = await supabase.from('students').update(row).eq('id', id);
    if (error) {
      if (isNetworkError(error)) return outbox.enqueue('updateStudent', { id, row });
      throw new Error(friendlyError(error));
    }
  },

  /* Soft delete: the row stays for the audit trail but leaves the register. */
  async removeStudent(id) {
    if (!isConfigured) return;
    const { error } = await supabase.from('students').update({ is_active: false }).eq('id', id);
    if (error) {
      if (isNetworkError(error)) return outbox.enqueue('removeStudent', { id });
      throw new Error(friendlyError(error));
    }
  },

  async saveMarks(m) {
    const row = {
      student_id: m.student_id,
      exam_name: m.exam_name,
      subject: m.subject,
      code: m.code,
      theory_max: Number(m.theory_max),
      theory_obt: Number(m.theory_obt),
      practical_max: Number(m.practical_max),
      practical_obt: Number(m.practical_obt),
    };
    if (!isConfigured) return { ...fromMarkRow({ ...row, id: crypto.randomUUID() }) };

    // Upsert on (student, exam, subject) so re-entering a subject corrects it
    // instead of creating a second row.
    const { data, error } = await supabase
      .from('marks')
      .upsert(row, { onConflict: 'student_id,exam_name,code' })
      .select()
      .single();
    if (error) {
      if (isNetworkError(error)) {
        outbox.enqueue('saveMarks', row);
        return fromMarkRow({ ...row, id: `local-${Date.now()}` });
      }
      throw new Error(friendlyError(error));
    }
    return fromMarkRow(data);
  },

  async deleteMarks(id) {
    if (!isConfigured) return;
    const { error } = await supabase.from('marks').delete().eq('id', id);
    if (error) {
      if (isNetworkError(error)) return outbox.enqueue('deleteMarks', { id });
      throw new Error(friendlyError(error));
    }
  },

  async setFeeStatus(id, status) {
    if (!isConfigured) return;
    const { error } = await supabase.from('students').update({ fee_status: status }).eq('id', id);
    if (error) {
      if (isNetworkError(error)) return outbox.enqueue('setFeeStatus', { id, status });
      throw new Error(friendlyError(error));
    }
  },

  async stats() {
    if (!isConfigured) return null;
    const { data, error } = await supabase.rpc('dashboard_stats');
    if (error) {
      if (isNetworkError(error)) return null;
      throw new Error(friendlyError(error));
    }
    return data;
  },

  async listEnquiries() {
    if (!isConfigured) return [];
    const { data, error } = await supabase
      .from('enquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      if (isNetworkError(error)) return [];
      throw new Error(friendlyError(error));
    }
    return data;
  },

  async setEnquiryStatus(id, status) {
    if (!isConfigured) return;
    const { error } = await supabase.from('enquiries').update({ status }).eq('id', id);
    if (error && !isNetworkError(error)) throw new Error(friendlyError(error));
  },

  async listPayments() {
    if (!isConfigured) return [];
    const { data, error } = await supabase
      .from('fee_payments')
      .select('*')
      .order('paid_at', { ascending: false })
      .limit(200);
    if (error) {
      if (isNetworkError(error)) return [];
      throw new Error(friendlyError(error));
    }
    return data;
  },
};

/* ============================================================
   SYNC — replay anything written while offline
   ============================================================ */
export const sync = {
  pendingCount: outbox.pendingCount,

  async flush() {
    if (!isConfigured) return { sent: 0, failed: 0, remaining: 0 };
    return outbox.flush({
      addStudent: (row) => supabase.from('students').insert(row).throwOnError(),
      updateStudent: ({ id, row }) => supabase.from('students').update(row).eq('id', id).throwOnError(),
      removeStudent: ({ id }) => supabase.from('students').update({ is_active: false }).eq('id', id).throwOnError(),
      saveMarks: (row) => supabase.from('marks').upsert(row, { onConflict: 'student_id,exam_name,code' }).throwOnError(),
      deleteMarks: ({ id }) => supabase.from('marks').delete().eq('id', id).throwOnError(),
      setFeeStatus: ({ id, status }) => supabase.from('students').update({ fee_status: status }).eq('id', id).throwOnError(),
    }, { isNetworkError });
  },
};

export { isConfigured };
