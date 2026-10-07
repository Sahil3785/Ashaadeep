-- ============================================================================
-- Row Level Security
--
-- The guiding rule: the public (anon) key ships inside the website and inside
-- the APK, so treat it as published. Anything anon can SELECT is effectively
-- public. That is why anon has NO read access to students, marks, payments or
-- enquiries — a parent checking one result must not be able to download every
-- child's name, father's name and phone number.
--
-- Result lookup instead goes through get_student_result(), a SECURITY DEFINER
-- function that returns exactly one student's marksheet and nothing else.
-- ============================================================================

alter table public.profiles     enable row level security;
alter table public.students     enable row level security;
alter table public.marks        enable row level security;
alter table public.fee_payments enable row level security;
alter table public.enquiries    enable row level security;
alter table public.notices      enable row level security;
alter table public.events       enable row level security;

-- ---------------------------------------------------------------------------
-- PROFILES — staff may see the staff list; you may edit only yourself,
-- except admins who may manage everyone.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_staff());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using  (id = auth.uid() or public.is_admin())
  with check (
    -- A teacher may edit their own name and phone but must not promote
    -- themselves to admin; only an admin may change a role.
    --
    -- my_role() is used instead of a plain subquery on purpose: a policy ON
    -- profiles that SELECTs FROM profiles re-triggers this same policy and
    -- Postgres fails with "infinite recursion detected in policy". A
    -- SECURITY DEFINER function reads the row without re-entering RLS.
    (id = auth.uid() and role = public.my_role())
    or public.is_admin()
  );

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- STUDENTS — staff only. No anon access at all.
-- ---------------------------------------------------------------------------
drop policy if exists students_staff_read on public.students;
create policy students_staff_read on public.students
  for select to authenticated using (public.is_staff());

drop policy if exists students_staff_write on public.students;
create policy students_staff_write on public.students
  for insert to authenticated with check (public.is_staff());

drop policy if exists students_staff_update on public.students;
create policy students_staff_update on public.students
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- Deleting a child's record wipes their marks too, so restrict it to admins.
drop policy if exists students_admin_delete on public.students;
create policy students_admin_delete on public.students
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- MARKS — staff only.
-- ---------------------------------------------------------------------------
drop policy if exists marks_staff_read on public.marks;
create policy marks_staff_read on public.marks
  for select to authenticated using (public.is_staff());

drop policy if exists marks_staff_write on public.marks;
create policy marks_staff_write on public.marks
  for insert to authenticated with check (public.is_staff());

drop policy if exists marks_staff_update on public.marks;
create policy marks_staff_update on public.marks
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists marks_staff_delete on public.marks;
create policy marks_staff_delete on public.marks
  for delete to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- FEE PAYMENTS
-- Staff read everything. The public fee page may INSERT a payment it just
-- made, but may never read the ledger back.
-- ---------------------------------------------------------------------------
drop policy if exists fee_staff_read on public.fee_payments;
create policy fee_staff_read on public.fee_payments
  for select to authenticated using (public.is_staff());

drop policy if exists fee_public_insert on public.fee_payments;
create policy fee_public_insert on public.fee_payments
  for insert to anon, authenticated with check (true);

drop policy if exists fee_staff_update on public.fee_payments;
create policy fee_staff_update on public.fee_payments
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- ENQUIRIES
-- Anyone may submit the admissions form; only staff may read them.
-- ---------------------------------------------------------------------------
drop policy if exists enquiries_public_insert on public.enquiries;
create policy enquiries_public_insert on public.enquiries
  for insert to anon, authenticated with check (true);

drop policy if exists enquiries_staff_read on public.enquiries;
create policy enquiries_staff_read on public.enquiries
  for select to authenticated using (public.is_staff());

drop policy if exists enquiries_staff_update on public.enquiries;
create policy enquiries_staff_update on public.enquiries
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- NOTICES & EVENTS — published rows are genuinely public content.
-- ---------------------------------------------------------------------------
drop policy if exists notices_public_read on public.notices;
create policy notices_public_read on public.notices
  for select to anon, authenticated using (is_published = true or public.is_staff());

drop policy if exists notices_staff_write on public.notices;
create policy notices_staff_write on public.notices
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events
  for select to anon, authenticated using (is_published = true or public.is_staff());

drop policy if exists events_staff_write on public.events;
create policy events_staff_write on public.events
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ============================================================================
-- PUBLIC RESULT LOOKUP
--
-- The only way an anonymous visitor touches student data. It requires BOTH the
-- roll number and the start of the name, returns a single student's marks for
-- one exam, and reveals nothing about anyone else. Father's and mother's names
-- are included because they are printed on the marksheet; the contact number
-- deliberately is not.
-- ============================================================================
create or replace function public.get_student_result(
  p_roll  text,
  p_name  text,
  p_exam  text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_student public.students%rowtype;
  v_marks   jsonb;
begin
  -- Reject empty input rather than matching everyone.
  if coalesce(trim(p_roll), '') = '' or coalesce(trim(p_name), '') = '' then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_student
  from public.students
  where is_active = true
    and roll_no = trim(p_roll)
    and upper(name) like upper(trim(p_name)) || '%'
  limit 1;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Fees pending: say so, and return only what the message needs.
  if v_student.fee_status = 'PENDING' then
    return jsonb_build_object(
      'status', 'pending_fee',
      'student', jsonb_build_object(
        'name', v_student.name,
        'roll_no', v_student.roll_no,
        'class', v_student.class,
        'section', v_student.section
      )
    );
  end if;

  select jsonb_agg(
           jsonb_build_object(
             'subject', m.subject, 'code', m.code,
             'theory_max', m.theory_max, 'theory_obt', m.theory_obt,
             'practical_max', m.practical_max, 'practical_obt', m.practical_obt
           ) order by m.code
         )
    into v_marks
  from public.marks m
  where m.student_id = v_student.id
    and upper(m.exam_name) = upper(trim(p_exam));

  if v_marks is null then
    return jsonb_build_object(
      'status', 'no_marks',
      'student', jsonb_build_object(
        'name', v_student.name, 'roll_no', v_student.roll_no,
        'class', v_student.class, 'section', v_student.section
      ),
      'exam', p_exam
    );
  end if;

  return jsonb_build_object(
    'status', 'success',
    'exam', p_exam,
    'student', jsonb_build_object(
      'name', v_student.name,
      'roll_no', v_student.roll_no,
      'class', v_student.class,
      'section', v_student.section,
      'father_name', v_student.father_name,
      'mother_name', v_student.mother_name,
      'house', v_student.house,
      'admission_no', v_student.admission_no
    ),
    'marks', v_marks
  );
end;
$$;

-- Lock the function down: nobody gets it by default, then grant it explicitly.
revoke all on function public.get_student_result(text, text, text) from public;
grant execute on function public.get_student_result(text, text, text) to anon, authenticated;

-- ============================================================================
-- FEE STATUS AFTER AN ONLINE PAYMENT
--
-- The public fee page cannot UPDATE students (it has no such right), so this
-- function clears the dues for the matching student and nothing else.
-- ============================================================================
create or replace function public.settle_fee(
  p_roll   text,
  p_class  text,
  p_txn    text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Only act if a payment with this reference actually exists, so the function
  -- cannot be called on its own to clear someone's dues for free.
  if not exists (select 1 from public.fee_payments where txn_ref = p_txn) then
    return jsonb_build_object('ok', false, 'reason', 'unknown_transaction');
  end if;

  update public.students
     set fee_status = 'PAID'
   where roll_no = trim(p_roll)
     and upper(class) = upper(trim(p_class))
     and is_active = true
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'reason', 'student_not_found');
  end if;

  update public.fee_payments set student_id = v_id where txn_ref = p_txn;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.settle_fee(text, text, text) from public;
grant execute on function public.settle_fee(text, text, text) to anon, authenticated;

-- ============================================================================
-- DASHBOARD COUNTS
-- Lets the faculty dashboard show totals without downloading every row.
-- ============================================================================
create or replace function public.dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'not authorised';
  end if;

  return (
    select jsonb_build_object(
      'total_students', (select count(*) from public.students where is_active),
      'paid',           (select count(*) from public.students where is_active and fee_status = 'PAID'),
      'pending',        (select count(*) from public.students where is_active and fee_status = 'PENDING'),
      'total_marks',    (select count(*) from public.marks),
      'new_enquiries',  (select count(*) from public.enquiries where status = 'new'),
      'collected',      (select coalesce(sum(amount), 0) from public.fee_payments),
      'by_class',       (select coalesce(jsonb_agg(c order by c->>'cls'), '[]'::jsonb) from (
                           select jsonb_build_object(
                             'cls', class,
                             'count', count(*),
                             'pending', count(*) filter (where fee_status = 'PENDING')
                           ) as c
                           from public.students where is_active group by class
                         ) t)
    )
  );
end;
$$;

revoke all on function public.dashboard_stats() from public;
grant execute on function public.dashboard_stats() to authenticated;
