-- ============================================================================
-- Asha Deep Adarsh High School — COMPLETE DATABASE SETUP (single file)
--
-- For a brand-new, empty Supabase project. This one file replaces running
-- 001_schema.sql + 002_security.sql + 004_security_hardening.sql +
-- 005_admin_and_activity.sql in order,
-- and already contains every security fix.
--
-- HOW TO RUN
--   Supabase dashboard → SQL Editor → New query → paste this whole file → Run.
--   It is safe to run again; nothing is duplicated.
--
-- Demo students are NOT included. If you want the ten sample students and
-- sample notices for testing, run 003_seed.sql afterwards.
--
-- AFTER RUNNING — see the "FIRST ADMIN" section at the very bottom.
-- ============================================================================


-- ============================================================================
-- PART 1 — TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1.1 STAFF PROFILES — one row per teacher, linked to Supabase Auth.
-- New accounts start INACTIVE: a stranger who signs up gets no access until
-- an administrator switches them on.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'teacher'
              check (role in ('teacher', 'admin')),
  phone       text,
  subject     text,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.profiles alter column is_active set default false;

comment on table public.profiles is
  'Staff accounts. role=admin may delete students and manage staff; role=teacher may enter marks and enrol. is_active=false means no access.';

-- ---------------------------------------------------------------------------
-- 1.2 STUDENTS
-- ---------------------------------------------------------------------------
create table if not exists public.students (
  id           uuid primary key default gen_random_uuid(),
  admission_no text unique,
  roll_no      text not null,
  name         text not null,
  class        text not null,
  section      text not null default 'A',
  father_name  text,
  mother_name  text,
  contact      text,
  dob          date,
  house        text,
  fee_status   text not null default 'PAID' check (fee_status in ('PAID', 'PENDING')),
  is_active    boolean not null default true,
  created_by   uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- A roll number is unique within a class and section.
  unique (class, section, roll_no)
);

create index if not exists students_class_idx on public.students (class, section);
create index if not exists students_name_idx  on public.students (name);
create index if not exists students_fee_idx   on public.students (fee_status);

-- ---------------------------------------------------------------------------
-- 1.3 MARKS
-- ---------------------------------------------------------------------------
create table if not exists public.marks (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students(id) on delete cascade,
  exam_name     text not null,
  subject       text not null,
  code          text not null,
  theory_max    numeric(6,2) not null default 0 check (theory_max    >= 0),
  theory_obt    numeric(6,2) not null default 0 check (theory_obt    >= 0),
  practical_max numeric(6,2) not null default 0 check (practical_max >= 0),
  practical_obt numeric(6,2) not null default 0 check (practical_obt >= 0),
  entered_by    uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Obtained marks can never exceed the maximum.
  constraint marks_theory_within_max    check (theory_obt    <= theory_max),
  constraint marks_practical_within_max check (practical_obt <= practical_max),

  -- One row per student + exam + subject; the app upserts on this.
  unique (student_id, exam_name, code)
);

create index if not exists marks_student_exam_idx on public.marks (student_id, exam_name);

-- ---------------------------------------------------------------------------
-- 1.4 FEE PAYMENTS
-- ---------------------------------------------------------------------------
create table if not exists public.fee_payments (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid references public.students(id) on delete set null,
  student_name  text not null,
  roll_no       text,
  class         text,
  category      text,
  amount        numeric(10,2) not null check (amount > 0 and amount <= 200000),
  txn_ref       text unique,
  contact       text,
  source        text not null default 'portal' check (source in ('portal', 'counter', 'app')),
  recorded_by   uuid references public.profiles(id) on delete set null,
  paid_at       timestamptz not null default now()
);

create index if not exists fee_payments_student_idx on public.fee_payments (student_id);
create index if not exists fee_payments_date_idx    on public.fee_payments (paid_at desc);

-- ---------------------------------------------------------------------------
-- 1.5 ADMISSION ENQUIRIES
-- ---------------------------------------------------------------------------
create table if not exists public.enquiries (
  id             uuid primary key default gen_random_uuid(),
  parent_name    text not null,
  phone          text not null,
  email          text,
  student_name   text not null,
  class_applying text,
  village        text,
  dob            date,
  transport      text,
  message        text,
  status         text not null default 'new'
                 check (status in ('new', 'contacted', 'admitted', 'closed')),
  handled_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists enquiries_status_idx on public.enquiries (status, created_at desc);

-- ---------------------------------------------------------------------------
-- 1.6 NOTICES & EVENTS — public content the website shows
-- ---------------------------------------------------------------------------
create table if not exists public.notices (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null default '',
  tag          text not null default 'General',
  is_urgent    boolean not null default false,
  is_published boolean not null default true,
  publish_date date not null default current_date,
  created_by   uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);

create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  event_type   text not null default 'Academic',
  description  text default '',
  event_date   date not null,
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists notices_pub_idx on public.notices (is_published, publish_date desc);
create index if not exists events_date_idx on public.events (is_published, event_date);


-- ============================================================================
-- PART 2 — HELPER FUNCTIONS AND TRIGGERS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2.1 Create a profile automatically for every new login.
-- The role is ALWAYS 'teacher' and the account starts inactive — the role is
-- never taken from sign-up metadata, which the caller controls.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2.2 Role checks used by every security policy. SECURITY DEFINER so they can
-- read profiles without the profiles policy recursing into itself.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
  );
$$;

create or replace function public.my_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2.3 Only an administrator may change anyone's role or active status —
-- including their own. Changes from the SQL editor (no signed-in user) are
-- allowed, so the principal can always manage staff from the dashboard.
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
-- 2.4 Keep updated_at honest.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists students_touch on public.students;
create trigger students_touch before update on public.students
  for each row execute function public.touch_updated_at();

drop trigger if exists marks_touch on public.marks;
create trigger marks_touch before update on public.marks
  for each row execute function public.touch_updated_at();

-- Trigger functions are never called directly by the app.
revoke all on function public.handle_new_user()      from public, anon, authenticated;
revoke all on function public.guard_profile_update() from public, anon, authenticated;


-- ============================================================================
-- PART 3 — TABLE PERMISSIONS
--
-- Least privilege first, then Row Level Security on top. The public (anon) key
-- ships inside the website and the APK, so treat anything it can read as
-- published. It can read only notices and events, and insert only fee
-- payments and admission enquiries.
-- ============================================================================
grant usage on schema public to anon, authenticated;

revoke all on public.profiles, public.students, public.marks, public.fee_payments,
              public.enquiries, public.notices, public.events
  from anon, authenticated;

grant select, insert, update, delete
  on public.profiles, public.students, public.marks, public.fee_payments,
     public.enquiries, public.notices, public.events
  to authenticated;

grant select on public.notices, public.events      to anon;
grant insert on public.fee_payments, public.enquiries to anon;


-- ============================================================================
-- PART 4 — ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles     enable row level security;
alter table public.students     enable row level security;
alter table public.marks        enable row level security;
alter table public.fee_payments enable row level security;
alter table public.enquiries    enable row level security;
alter table public.notices      enable row level security;
alter table public.events       enable row level security;

-- ---------------------------------------------------------------------------
-- PROFILES — staff see the staff list; you edit only yourself (name, phone,
-- subject); admins manage everyone. Role/active changes: see 2.3.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using  (id = auth.uid() or public.is_admin())
  with check (
    (id = auth.uid() and role = public.my_role())
    or public.is_admin()
  );

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- STUDENTS — active staff only. No public access at all.
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

-- Deleting a child's record wipes their marks too, so admins only.
drop policy if exists students_admin_delete on public.students;
create policy students_admin_delete on public.students
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- MARKS — active staff only.
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
-- FEE PAYMENTS — the public fee page may record a payment but never read the
-- ledger, and may not fill in staff-only columns. Staff read and edit.
-- ---------------------------------------------------------------------------
drop policy if exists fee_staff_read on public.fee_payments;
create policy fee_staff_read on public.fee_payments
  for select to authenticated using (public.is_staff());

drop policy if exists fee_public_insert on public.fee_payments;
create policy fee_public_insert on public.fee_payments
  for insert to anon, authenticated
  with check (
    public.is_staff()
    or (source = 'portal' and student_id is null and recorded_by is null)
  );

drop policy if exists fee_staff_update on public.fee_payments;
create policy fee_staff_update on public.fee_payments
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- ENQUIRIES — anyone may submit the admissions form; only staff read them.
-- ---------------------------------------------------------------------------
drop policy if exists enquiries_public_insert on public.enquiries;
create policy enquiries_public_insert on public.enquiries
  for insert to anon, authenticated
  with check (
    public.is_staff()
    or (status = 'new' and handled_by is null)
  );

drop policy if exists enquiries_staff_read on public.enquiries;
create policy enquiries_staff_read on public.enquiries
  for select to authenticated using (public.is_staff());

drop policy if exists enquiries_staff_update on public.enquiries;
create policy enquiries_staff_update on public.enquiries
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- NOTICES & EVENTS — published rows are public; staff manage them.
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
-- PART 5 — SAFE FUNCTIONS THE APPS CALL
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 5.1 PUBLIC RESULT LOOKUP — the only way a visitor touches student data.
-- Needs the roll number AND the student's full first name, returns one
-- marksheet for one exam, and never the contact number.
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
-- 5.2 CLEAR DUES AFTER A VERIFIED PAYMENT — staff only.
-- An online payment is only recorded; staff check it against the bank
-- statement and then mark the student PAID.
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
-- 5.3 DASHBOARD COUNTS — totals for the faculty dashboard, staff only.
-- ---------------------------------------------------------------------------
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

revoke all on function public.dashboard_stats() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;


-- ============================================================================
-- PART 6 — ADMIN PANEL AND ACTIVITY LOG
-- (same as migrations/005_admin_and_activity.sql)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 6.1 STAFF EMAIL
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists email text;

update public.profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id and p.email is distinct from u.email;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, is_active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    'teacher',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. ACTIVITY LOG
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  -- No foreign key on purpose: the history must survive a deleted account.
  actor_id     uuid,
  actor_name   text,
  actor_email  text,
  actor_role   text,
  action       text not null,
  entity       text not null,
  entity_id    text,
  summary      text,
  changes      jsonb
);

create index if not exists activity_log_at_idx     on public.activity_log (at desc);
create index if not exists activity_log_actor_idx  on public.activity_log (actor_id, at desc);
create index if not exists activity_log_entity_idx on public.activity_log (entity, at desc);

alter table public.activity_log enable row level security;

drop policy if exists activity_admin_read on public.activity_log;
create policy activity_admin_read on public.activity_log
  for select to authenticated using (public.is_admin());

-- Append-only: nobody writes to it except the SECURITY DEFINER functions below.
revoke all on public.activity_log from anon, authenticated;
grant select on public.activity_log to authenticated;

-- Writes one row, stamped with whoever is signed in right now.
create or replace function public.write_activity(
  p_action text, p_entity text, p_entity_id text, p_summary text, p_changes jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_prof public.profiles%rowtype;
begin
  if v_uid is not null then
    select * into v_prof from public.profiles where id = v_uid;
  end if;

  insert into public.activity_log
    (actor_id, actor_name, actor_email, actor_role, action, entity, entity_id, summary, changes)
  values (
    v_uid,
    case when v_uid is null then 'Public website / system' else coalesce(v_prof.full_name, 'Unknown') end,
    v_prof.email,
    v_prof.role,
    p_action, p_entity, p_entity_id, p_summary, p_changes
  );
end;
$$;

revoke all on function public.write_activity(text, text, text, text, jsonb) from public, anon, authenticated;

-- One trigger function for every audited table.
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_row     jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old     jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_action  text  := case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end;
  v_changes jsonb;
  v_summary text;
  v_key     text;
begin
  -- What changed: for an update only the columns that differ, as [before, after].
  if tg_op = 'UPDATE' then
    v_changes := '{}'::jsonb;
    for v_key in select jsonb_object_keys(v_row) loop
      if v_key not in ('updated_at', 'created_at')
         and (v_row -> v_key) is distinct from (v_old -> v_key) then
        v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_array(v_old -> v_key, v_row -> v_key));
      end if;
    end loop;
    -- Nothing really changed, or only a "who entered it" link was cleared
    -- because that staff account was deleted — not something anyone did.
    if v_changes - 'entered_by' - 'created_by' - 'recorded_by' - 'handled_by' = '{}'::jsonb then
      return null;
    end if;
  else
    v_changes := v_row - 'created_at' - 'updated_at';
  end if;

  -- A readable one-line description of the record.
  v_summary := case tg_table_name
    when 'students' then
      concat(v_row->>'name', ' (', v_row->>'class', '-', coalesce(v_row->>'section', 'A'), ', roll ', v_row->>'roll_no', ')')
    when 'marks' then
      concat(v_row->>'subject', ' · ', v_row->>'exam_name', ' · ',
             (select s.name from public.students s where s.id = (v_row->>'student_id')::uuid),
             ' · ', (v_row->>'theory_obt'), '+', (v_row->>'practical_obt'),
             ' / ', (v_row->>'theory_max'), '+', (v_row->>'practical_max'))
    when 'fee_payments' then
      concat(v_row->>'student_name', ' · ₹', v_row->>'amount', ' · ', v_row->>'source', ' · ', v_row->>'txn_ref')
    when 'enquiries' then
      concat(v_row->>'student_name', ' · parent ', v_row->>'parent_name', ' · ', v_row->>'phone')
    when 'notices' then v_row->>'title'
    when 'events'  then concat(v_row->>'title', ' · ', v_row->>'event_date')
    when 'profiles' then concat(v_row->>'full_name', ' <', v_row->>'email', '>')
    else null
  end;

  -- Name the actions the office actually talks about.
  if tg_op = 'INSERT' and tg_table_name = 'profiles' then
    v_action := 'requested_access';
  elsif tg_op = 'UPDATE' then
    if tg_table_name = 'profiles' and v_changes ? 'is_active' then
      v_action := case when (v_row->>'is_active')::boolean then 'approved' else 'deactivated' end;
    elsif tg_table_name = 'profiles' and v_changes ? 'role' then
      v_action := 'role_changed';
    elsif tg_table_name = 'students' and v_changes ? 'is_active' and not (v_row->>'is_active')::boolean then
      v_action := 'removed';
    elsif tg_table_name = 'students' and v_changes ? 'fee_status' and (select count(*) from jsonb_object_keys(v_changes)) = 1 then
      v_action := 'fee_status';
    end if;
  end if;

  perform public.write_activity(v_action, tg_table_name, v_row->>'id', v_summary, v_changes);
  return null;
end;
$$;

revoke all on function public.log_activity() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['students', 'marks', 'fee_payments', 'enquiries', 'notices', 'events', 'profiles'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_activity', t);
    execute format('create trigger %I after insert or update or delete on public.%I
                    for each row execute function public.log_activity()', t || '_activity', t);
  end loop;
end;
$$;

-- Sign-ins are recorded by the apps right after a successful login.
create or replace function public.log_sign_in()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  perform public.write_activity('signed_in', 'session', auth.uid()::text, null, null);
end;
$$;

revoke all on function public.log_sign_in() from public, anon;
grant execute on function public.log_sign_in() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. ADMIN FUNCTIONS
-- ---------------------------------------------------------------------------

-- Every staff account with its last sign-in (which lives in auth.users).
create or replace function public.admin_list_staff()
returns table (
  id uuid, full_name text, email text, role text, is_active boolean,
  phone text, subject text, created_at timestamptz, last_sign_in_at timestamptz,
  email_confirmed boolean
)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;

  return query
    select p.id, p.full_name, coalesce(p.email, u.email)::text, p.role, p.is_active,
           p.phone, p.subject, p.created_at, u.last_sign_in_at,
           (u.email_confirmed_at is not null)
      from public.profiles p
      join auth.users u on u.id = p.id
     order by p.is_active, p.created_at desc;
end;
$$;

revoke all on function public.admin_list_staff() from public, anon;
grant execute on function public.admin_list_staff() to authenticated;

-- Approve / deactivate / promote / rename one account.
create or replace function public.admin_set_staff(
  p_id        uuid,
  p_is_active boolean default null,
  p_role      text    default null,
  p_full_name text    default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_target public.profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;

  select * into v_target from public.profiles where id = p_id;
  if not found then
    raise exception 'That account no longer exists.';
  end if;

  if p_role is not null and p_role not in ('teacher', 'admin') then
    raise exception 'Unknown role %', p_role;
  end if;

  -- Never lock the school out of its own admin panel.
  if p_id = auth.uid() and (p_is_active = false or p_role = 'teacher') then
    raise exception 'You cannot deactivate or demote your own account.';
  end if;

  if v_target.role = 'admin' and v_target.is_active
     and (p_is_active = false or p_role = 'teacher')
     and (select count(*) from public.profiles where role = 'admin' and is_active) <= 1 then
    raise exception 'At least one active admin must remain.';
  end if;

  update public.profiles
     set is_active = coalesce(p_is_active, is_active),
         role      = coalesce(p_role, role),
         full_name = coalesce(nullif(trim(p_full_name), ''), full_name)
   where id = p_id;
end;
$$;

revoke all on function public.admin_set_staff(uuid, boolean, text, text) from public, anon;
grant execute on function public.admin_set_staff(uuid, boolean, text, text) to authenticated;

-- Delete a login completely. Records they entered stay; only the account goes.
create or replace function public.admin_delete_user(p_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_target public.profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;

  if p_id = auth.uid() then
    raise exception 'You cannot delete your own account.';
  end if;

  select * into v_target from public.profiles where id = p_id;

  if v_target.role = 'admin' and v_target.is_active
     and (select count(*) from public.profiles where role = 'admin' and is_active) <= 1 then
    raise exception 'At least one active admin must remain.';
  end if;

  -- The profile row cascades away with the login; its trigger logs the deletion.
  delete from auth.users where id = p_id;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. DEFAULTS
-- ---------------------------------------------------------------------------
alter table public.fee_payments alter column recorded_by set default auth.uid();

-- Public payments must still leave recorded_by empty: the policy checks it,
-- and the default would otherwise fill it with null for anon anyway.


-- ============================================================================
-- FIRST ADMIN — do this once, after running everything above
--
-- 1. Authentication → Sign In / Providers → Email: keep "Allow new users to
--    sign up" ON. New staff use "Request access" and stay locked until an
--    admin approves them in Dashboard → Staff.
--
-- 2. Authentication → Users → Add user → enter the principal's email and a
--    password → tick "Auto Confirm User" → Create.
--
-- 3. Come back to the SQL editor, change the email and name below, and run
--    ONLY these lines (select them, then Run):
--
--      update public.profiles
--         set is_active = true, role = 'admin', full_name = 'Principal Name'
--       where id = (select id from auth.users where email = 'principal@example.com');
--
-- 4. For EACH teacher: Add user (step 2), then run:
--
--      update public.profiles
--         set is_active = true, full_name = 'Teacher Name'
--       where id = (select id from auth.users where email = 'teacher@example.com');
--
-- When a teacher leaves, do not delete the account — switch it off instead:
--
--      update public.profiles set is_active = false
--       where id = (select id from auth.users where email = 'leaver@example.com');
-- ============================================================================
