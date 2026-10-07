-- ============================================================================
-- Asha Deep Adarsh High School — database schema
-- Run this in YOUR Supabase project:  SQL Editor → New query → paste → Run
--
-- Safe to re-run: every object is created with IF NOT EXISTS or replaced.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. STAFF PROFILES
-- One row per teacher, linked to Supabase Auth. `role` drives what they may do.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'teacher'
              check (role in ('teacher', 'admin')),
  phone       text,
  subject     text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Staff accounts. role=admin may delete students and manage staff; role=teacher may enter marks and enrol.';

-- Create the profile row automatically whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'teacher')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by the policies below. SECURITY DEFINER so it can read profiles
-- without the policy on profiles recursing into itself.
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
  );
$$;

-- The caller's own role, read without going through RLS. Used by the profiles
-- update policy, which cannot query profiles directly without recursing.
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
-- 2. STUDENTS
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
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- A roll number is unique within a class and section, which is the rule the
  -- app enforces in its UI; enforcing it here too means it cannot be bypassed.
  unique (class, section, roll_no)
);

create index if not exists students_class_idx on public.students (class, section);
create index if not exists students_name_idx  on public.students (name);
create index if not exists students_fee_idx   on public.students (fee_status);

-- ---------------------------------------------------------------------------
-- 3. MARKS
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
  entered_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Obtained marks can never exceed the maximum. The app checks this too, but
  -- a constraint means a bad API call cannot write a nonsense marksheet.
  constraint marks_theory_within_max    check (theory_obt    <= theory_max),
  constraint marks_practical_within_max check (practical_obt <= practical_max),

  -- One row per student + exam + subject. Saving the same subject again
  -- updates it instead of creating a duplicate (see the upsert in the app).
  unique (student_id, exam_name, code)
);

create index if not exists marks_student_exam_idx on public.marks (student_id, exam_name);

-- ---------------------------------------------------------------------------
-- 4. FEE PAYMENTS
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
-- 5. ADMISSION ENQUIRIES
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
-- 6. NOTICES & EVENTS (public content the website shows)
-- ---------------------------------------------------------------------------
create table if not exists public.notices (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null default '',
  tag          text not null default 'General',
  is_urgent    boolean not null default false,
  is_published boolean not null default true,
  publish_date date not null default current_date,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  event_type  text not null default 'Academic',
  description text default '',
  event_date  date not null,
  is_published boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists notices_pub_idx on public.notices (is_published, publish_date desc);
create index if not exists events_date_idx on public.events (is_published, event_date);

-- ---------------------------------------------------------------------------
-- 7. KEEP updated_at HONEST
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
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
