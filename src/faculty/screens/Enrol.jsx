import React, { useState } from 'react';
import { UserPlus, Save, CheckCircle2 } from 'lucide-react';
import { CLASS_LIST } from '../../data/school';
import { useSchool } from '../../context/SchoolContext';
import { Screen, Card, Field, Btn, inputCls, selectCls } from '../components/Chrome';
import { tap } from '../native';
import { numeric, NAME_INPUT } from '../../utils/format';

/* ============================================================
   Enrol — add a student to the register.
   Only the roll number and name are required; everything else
   can be filled in later from the Students tab.
   ============================================================ */
const blank = {
  cls: '10TH', section: 'A', roll: '', name: '', father: '', mother: '',
  contact: '', dob: '', house: 'Jyoti', fee: 'PAID',
};

export default function Enrol({ onDone }) {
  const { addStudent, toast } = useSchool();
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);

  const set = (k) => (e) => {
    setF(x => ({ ...x, [k]: e.target.value }));
    setErrors(x => ({ ...x, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!String(f.roll).trim()) next.roll = 'Assign a roll number.';
    if (!f.name.trim()) next.name = "Enter the student's name.";
    if (f.contact && !/^[6-9]\d{9}$/.test(f.contact.replace(/\D/g, ''))) {
      next.contact = 'Enter a valid 10-digit mobile number, or leave it blank.';
    }

    if (Object.keys(next).length) {
      setErrors(next);
      tap('error');
      toast('Please correct the highlighted fields.', 'error', 'Check the form');
      return;
    }

    setBusy(true);
    await new Promise(r => setTimeout(r, 400));
    const ok = await addStudent({
      roll_no: String(f.roll).trim(),
      name: f.name.trim().toUpperCase(),
      class: f.cls, section: f.section,
      father_name: f.father.trim(), mother_name: f.mother.trim(),
      contact: f.contact.trim(), dob: f.dob, house: f.house,
      fee_status: f.fee,
    });
    setBusy(false);

    if (ok) {
      tap('success');
      setSaved({ name: f.name.trim().toUpperCase(), cls: f.cls, roll: f.roll });
      setF({ ...blank, cls: f.cls, section: f.section });
    } else {
      tap('error');
    }
  };

  // Success confirmation, with a clear way onward.
  if (saved) {
    return (
      <Screen icon={UserPlus} title="Student Added">
        <Card className="p-7 text-center">
          <span className="w-16 h-16 rounded-full bg-garden-100 border-2 border-garden-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-garden-600" strokeWidth={2.4} />
          </span>
          <p className="font-display text-lg font-extrabold text-ink-950">{saved.name}</p>
          <p className="text-[13px] text-ink-soft mt-1.5">
            Added to the Class {saved.cls} register as roll #{saved.roll}.
          </p>
        </Card>

        <div className="space-y-2.5 mt-4">
          <Btn onClick={() => setSaved(null)}>
            <UserPlus className="w-4.5 h-4.5" /> Add another student
          </Btn>
          <Btn variant="ghost" onClick={() => { setSaved(null); onDone?.('students'); }}>
            View the register
          </Btn>
        </div>
      </Screen>
    );
  }

  return (
    <Screen icon={UserPlus} title="Enrol Student" subtitle="Add a new name to the register">
      <form onSubmit={submit} className="space-y-4">
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Class">
              <select value={f.cls} onChange={set('cls')} className={selectCls()}>
                {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Section">
              <select value={f.section} onChange={set('section')} className={selectCls()}>
                {['A', 'B', 'C'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Roll number" required error={errors.roll}>
            <input type="text" inputMode="numeric" autoComplete="off" value={f.roll} onChange={numeric(set('roll'))}
                   placeholder="15" className={inputCls(errors.roll)} />
          </Field>

          <Field label="Full name" required error={errors.name}>
            <input value={f.name} {...NAME_INPUT}
                   onChange={e => { setF(x => ({ ...x, name: e.target.value })); setErrors(x => ({ ...x, name: undefined })); }}
                   placeholder="AARAV SHARMA"
                   className={`${inputCls(errors.name)} uppercase font-bold`} />
          </Field>
        </Card>

        <Card className="p-4 space-y-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-faint">
            Family &amp; contact — optional
          </p>
          <Field label="Father's name">
            <input value={f.father} onChange={set('father')} placeholder="Rajesh Sharma" className={inputCls()} />
          </Field>
          <Field label="Mother's name">
            <input value={f.mother} onChange={set('mother')} placeholder="Sunita Sharma" className={inputCls()} />
          </Field>
          <Field label="Contact number" error={errors.contact}
                 hint={!errors.contact ? 'Used for the call and WhatsApp buttons in the register.' : undefined}>
            <input value={f.contact} onChange={set('contact')} inputMode="tel"
                   placeholder="9812045678" className={inputCls(errors.contact)} />
          </Field>
          <Field label="Date of birth">
            <input type="date" value={f.dob} onChange={set('dob')} className={inputCls()} />
          </Field>
        </Card>

        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="House">
              <select value={f.house} onChange={set('house')} className={selectCls()}>
                {['Shakti', 'Vidya', 'Prakriti', 'Jyoti'].map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>
            <Field label="Fee status">
              <select value={f.fee} onChange={set('fee')} className={selectCls()}>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
              </select>
            </Field>
          </div>
        </Card>

        <Btn type="submit" variant="garden" disabled={busy}>
          {busy ? 'Adding…' : <><Save className="w-4.5 h-4.5" /> Add to the register</>}
        </Btn>

        <p className="text-[11px] text-ink-faint text-center leading-relaxed px-2">
          A roll number must be unique within its class and section. If it is already
          taken you will be told, and nothing is overwritten.
        </p>
      </form>
    </Screen>
  );
}
