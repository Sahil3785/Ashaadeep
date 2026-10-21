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
      throw new Error('Your account is waiting for the principal to approve it.');
    }

    // Recorded in the activity log. A failure here must never block a login.
    supabase.rpc('log_sign_in').then(() => {}, () => {});
    return data;
  },

  /* A new member of staff asks for an account. It is created inactive; the
     principal approves it from the admin panel before it can see anything. */
  async requestAccess({ fullName, email, password }) {
    if (!isConfigured) throw new Error('The app is not connected to a database yet.');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) throw new Error(friendlyError(error));
    // If the project auto-confirms emails, sign-up also signs in. The account
    // is not approved yet, so do not leave that session lying around.
    if (data.session) await supabase.auth.signOut();
    return { needsEmailConfirmation: !data.session };
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
/* ============================================================
   OFFICE — fees, enquiries, notices (any signed-in staff)
   ============================================================ */
export const officeApi = {
  /* Clear a student's dues once a payment has been checked against the bank. */
  async settleFee(payment) {
    const { data, error } = await supabase.rpc('settle_fee', {
      p_roll: String(payment.roll_no || '').trim(),
      p_class: String(payment.class || '').trim(),
      p_txn: payment.txn_ref,
    });
    if (error) throw new Error(friendlyError(error));
    return data;
  },

  /* Cash or cheque taken at the office counter. */
  async recordCounterPayment(p) {
    const txn = `OFF-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from('fee_payments').insert({
      student_name: p.name.trim(),
      roll_no: String(p.roll).trim(),
      class: p.cls,
      category: p.category || 'Tuition fee',
      amount: Number(p.amount),
      txn_ref: txn,
      contact: p.phone || null,
      source: 'counter',
    });
    if (error) throw new Error(friendlyError(error));
    return officeApi.settleFee({ roll_no: p.roll, class: p.cls, txn_ref: txn });
  },

  async listNotices() {
    const { data, error } = await supabase
      .from('notices').select('*').order('publish_date', { ascending: false }).limit(200);
    if (error) throw new Error(friendlyError(error));
    return data;
  },

  async saveNotice(n) {
    const row = {
      title: n.title.trim(), body: (n.body || '').trim(), tag: n.tag || 'General',
      is_urgent: Boolean(n.is_urgent), is_published: n.is_published !== false,
      publish_date: n.publish_date || new Date().toISOString().slice(0, 10),
    };
    const q = n.id ? supabase.from('notices').update(row).eq('id', n.id) : supabase.from('notices').insert(row);
    const { error } = await q;
    if (error) throw new Error(friendlyError(error));
  },

  async deleteNotice(id) {
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) throw new Error(friendlyError(error));
  },

  async listEvents() {
    const { data, error } = await supabase
      .from('events').select('*').order('event_date', { ascending: true }).limit(200);
    if (error) throw new Error(friendlyError(error));
    return data;
  },

  async saveEvent(e) {
    const row = {
      title: e.title.trim(), description: (e.description || '').trim(),
      event_type: e.event_type || 'Academic', event_date: e.event_date,
      is_published: e.is_published !== false,
    };
    const q = e.id ? supabase.from('events').update(row).eq('id', e.id) : supabase.from('events').insert(row);
    const { error } = await q;
    if (error) throw new Error(friendlyError(error));
  },

  async deleteEvent(id) {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw new Error(friendlyError(error));
  },
};

/* ============================================================
   ADMIN — principal only. The database refuses every one of
   these for anyone else, whatever the screen shows.
   ============================================================ */
export const adminApi = {
  async listStaff() {
    const { data, error } = await supabase.rpc('admin_list_staff');
    if (error) throw new Error(friendlyError(error));
    return data || [];
  },

  /* patch: { is_active?, role?, full_name? } */
  async setStaff(id, patch) {
    const { error } = await supabase.rpc('admin_set_staff', {
      p_id: id,
      p_is_active: patch.is_active ?? null,
      p_role: patch.role ?? null,
      p_full_name: patch.full_name ?? null,
    });
    if (error) throw new Error(friendlyError(error));
  },

  async deleteUser(id) {
    const { error } = await supabase.rpc('admin_delete_user', { p_id: id });
    if (error) throw new Error(friendlyError(error));
  },

  /* Removes a student and every mark linked to them. Teachers can only take a
     student off the register; this is the permanent version. */
  async purgeStudent(id) {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw new Error(friendlyError(error));
  },

  /* Newest first, PAGE rows at a time. Pass the last row's id as `before`
     to fetch the next page — this stays fast however long the log grows. */
  async listActivity({ before, actorId, entity, action, from, to, search, limit = 50 } = {}) {
    let q = supabase.from('activity_log').select('*').order('id', { ascending: false }).limit(limit);
    if (before) q = q.lt('id', before);
    if (actorId) q = actorId === 'public' ? q.is('actor_id', null) : q.eq('actor_id', actorId);
    if (entity) q = q.eq('entity', entity);
    if (action) q = q.eq('action', action);
    if (from) q = q.gte('at', `${from}T00:00:00`);
    if (to) q = q.lte('at', `${to}T23:59:59.999`);
    if (search) q = q.ilike('summary', `%${search.replace(/[%_]/g, '')}%`);
    const { data, error } = await q;
    if (error) throw new Error(friendlyError(error));
    return data;
  },
};

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
