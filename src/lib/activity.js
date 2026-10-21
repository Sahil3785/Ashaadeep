/* ============================================================
   Activity log labels — shared by the website admin panel and the app.
   ============================================================ */
export const ENTITY_LABEL = {
  students: 'Student', marks: 'Marks', fee_payments: 'Fee payment', enquiries: 'Enquiry',
  notices: 'Notice', events: 'Event', profiles: 'Staff account', session: 'Sign-in',
};

export const ACTION_META = {
  created:          ['Added', 'garden'],
  updated:          ['Edited', 'brass'],
  deleted:          ['Deleted', 'rose'],
  removed:          ['Removed from register', 'rose'],
  fee_status:       ['Fee status changed', 'brass'],
  approved:         ['Approved', 'garden'],
  deactivated:      ['Deactivated', 'rose'],
  role_changed:     ['Role changed', 'brass'],
  requested_access: ['Requested access', 'ink'],
  signed_in:        ['Signed in', 'ink'],
};

const FIELD_LABEL = {
  name: 'Name', roll_no: 'Roll', class: 'Class', section: 'Section', father_name: 'Father',
  mother_name: 'Mother', contact: 'Contact', dob: 'DOB', house: 'House', fee_status: 'Fee',
  is_active: 'Active', exam_name: 'Exam', subject: 'Subject', code: 'Code',
  theory_max: 'Theory max', theory_obt: 'Theory', practical_max: 'Internal max', practical_obt: 'Internal',
  student_name: 'Student', amount: 'Amount', txn_ref: 'Reference', source: 'Source', category: 'For',
  parent_name: 'Parent', phone: 'Phone', status: 'Status', title: 'Title', body: 'Text', tag: 'Tag',
  is_urgent: 'Urgent', is_published: 'Published', publish_date: 'Date', event_date: 'Date',
  event_type: 'Type', description: 'Description', full_name: 'Name', role: 'Role', email: 'Email',
  admission_no: 'Admission no.',
};

// Internal columns that mean nothing to a reader.
const HIDDEN_FIELDS = new Set(['id', 'student_id', 'created_by', 'entered_by', 'recorded_by', 'handled_by']);

const show = (v) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v));

// Actions whose `changes` hold [before, after] pairs rather than a full record.
const DIFF_ACTIONS = new Set(['updated', 'fee_status', 'approved', 'deactivated', 'role_changed', 'removed']);

/* The before/after details of one log entry, as readable lines. */
export function changeLines(entry) {
  const c = entry.changes;
  if (!c || typeof c !== 'object') return [];
  const diff = DIFF_ACTIONS.has(entry.action);
  return Object.entries(c)
    .filter(([k, v]) => !HIDDEN_FIELDS.has(k) && (diff || (v !== null && v !== '')))
    .map(([k, v]) => {
      const label = FIELD_LABEL[k] || k.replace(/_/g, ' ');
      return diff && Array.isArray(v) && v.length === 2
        ? { label, before: show(v[0]), after: show(v[1]) }
        : { label, value: show(v) };
    });
}
