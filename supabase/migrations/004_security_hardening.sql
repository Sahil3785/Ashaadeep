-- ============================================================================
-- Security hardening. Run after 001–003. Safe to re-run.
--
-- Fixes, in order:
--   1. A public sign-up could make itself staff, or even admin.
--   2. A deactivated teacher could switch their own account back on.
--   3. Anyone could clear any student's fees, releasing a withheld marksheet,
--      by inserting a made-up payment and calling settle_fee().
--   4. Public inserts could fill in staff-only columns.
--   5. The result lookup accepted a one-letter name, so the whole register
--      (names, parents' names, admission numbers) could be listed by guessing.
--   6. Who-entered-what columns were never filled in.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. NEW ACCOUNTS START AS INACTIVE TEACHERS
--
-- The anon key is public, so anyone can call auth.signUp() unless sign-ups are
-- switched off in the dashboard — and the old trigger copied `role` straight
-- from the metadata the caller sent. Now the role is always 'teacher' and the
-- account has no access until the principal activates it (see DATABASE.md §5).
-- Existing accounts are not touched.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'teacher',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

alter table public.profiles alter column is_active set default false;

-- ---------------------------------------------------------------------------
-- 2. ONLY AN ADMIN MAY CHANGE ROLE OR ACTIVE STATUS
--
-- The update policy stopped a teacher promoting themselves, but not flipping
-- is_active back to true after being removed. A trigger covers every column
-- that matters, whatever the policy says. Changes made from the SQL editor
-- (no signed-in user) are allowed, so the principal can still manage staff.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.id        is distinct from old.id
    or new.role      is distinct from old.role
    or new.is_active is distinct from old.is_active then
      raise exception 'not authorised: only an administrator may change role or active status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------------
-- 3. ONLINE PAYMENTS NO LONGER CLEAR DUES ON THEIR OWN
--
-- There is no payment gateway confirming anything, so a payment row written by
-- the public page proves nothing — the caller wrote it themselves a moment
-- earlier. The payment is still recorded in the ledger; staff verify it against
-- the bank statement and mark the student PAID from the dashboard or the app.
-- settle_fee() stays available to staff only.
-- ---------------------------------------------------------------------------
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
  if not public.is_staff() then
    raise exception 'not authorised';
  end if;

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

revoke all on function public.settle_fee(text, text, text) from public, anon;
grant execute on function public.settle_fee(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. PUBLIC INSERTS MAY NOT FILL IN STAFF COLUMNS
-- ---------------------------------------------------------------------------
drop policy if exists fee_public_insert on public.fee_payments;
create policy fee_public_insert on public.fee_payments
  for insert to anon, authenticated
  with check (
    public.is_staff()
    or (source = 'portal' and student_id is null and recorded_by is null)
  );

drop policy if exists enquiries_public_insert on public.enquiries;
create policy enquiries_public_insert on public.enquiries
  for insert to anon, authenticated
  with check (
    public.is_staff()
    or (status = 'new' and handled_by is null)
  );

-- ---------------------------------------------------------------------------
-- 5. RESULT LOOKUP NEEDS THE WHOLE FIRST NAME
--
-- "Roll 1 + A" used to match, so looping over roll numbers and 26 letters
-- listed every child. The first name must now match in full (the Results page
-- already asks for "the student's first name"); extra words typed after it
-- must still match the start of the rest of the name.
-- ---------------------------------------------------------------------------
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
  v_name    text := upper(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'));
begin
  if coalesce(trim(p_roll), '') = '' or length(v_name) < 2 then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_student
  from public.students
  where is_active = true
    and roll_no = trim(p_roll)
    and split_part(upper(name), ' ', 1) = split_part(v_name, ' ', 1)
    and upper(name) like v_name || '%'
  limit 1;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

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

revoke all on function public.get_student_result(text, text, text) from public;
grant execute on function public.get_student_result(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. RECORD WHO ENTERED WHAT
-- ---------------------------------------------------------------------------
alter table public.students     alter column created_by  set default auth.uid();
alter table public.marks        alter column entered_by  set default auth.uid();
alter table public.notices      alter column created_by  set default auth.uid();
