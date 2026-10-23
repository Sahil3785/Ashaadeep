-- ============================================================================
-- 006 — Month-wise fee ledger
--
-- Until now a student's fees were one flag, PAID or PENDING, and a payment
-- was a free-text row with no link to what it paid for. This adds a proper
-- ledger, the way school accounts software keeps it:
--
--   fee_sessions     the academic year (April–March by default)
--   fee_heads        what is charged: tuition, transport, exam, admission…
--   fee_rates        how much, per class, per session
--   fee_adjustments  per-student: concessions, a transport route fare, opt-ins
--   fee_dues         one line per student, per month, per head  (the demand)
--   fee_payments     one row per receipt — counter, app or online (existing)
--   fee_allocations  which due lines each receipt paid, and how much
--
-- Every number on screen is derived from those, so "which months are paid"
-- is never typed in by hand and cannot drift from the receipts.
--
-- Mistakes are corrected, never erased: a wrong receipt is CANCELLED with a
-- reason (it stays on record, its months become due again), and a wrong
-- online claim is REJECTED with a reason.
--
-- Going live is safe: nothing is billed until an administrator opens
-- Dashboard → Fees → Setup, checks the rates and the month billing starts
-- from, and presses "Generate dues". Until then fee_status is untouched.
--
-- Safe to run more than once.
-- ============================================================================


-- ============================================================================
-- PART 1 — TABLES
-- ============================================================================

create table if not exists public.fee_sessions (
  id              text primary key check (id ~ '^\d{4}-\d{2}$'),   -- '2026-27'
  starts_on       date not null,                 -- first day of the first month
  months          smallint not null default 12 check (months between 1 and 12),
  due_day         smallint not null default 10 check (due_day between 1 and 28),
  billing_from    date,                          -- first month the ledger bills (go-live)
  billing_enabled boolean not null default false,
  is_current      boolean not null default false,
  created_at      timestamptz not null default now()
);

create unique index if not exists fee_sessions_one_current
  on public.fee_sessions (is_current) where is_current;

create table if not exists public.fee_heads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  -- monthly: every month of the session. annual: once, in due_month.
  -- one_time: once, in due_month, and only for students opted in (admission).
  frequency   text not null default 'monthly' check (frequency in ('monthly', 'annual', 'one_time')),
  due_month   smallint not null default 1 check (due_month between 1 and 12),   -- 1 = first month of session
  is_optional boolean not null default false,  -- only charged to students opted in (transport)
  sort        smallint not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.fee_rates (
  id        uuid primary key default gen_random_uuid(),
  session   text not null references public.fee_sessions(id) on update cascade on delete cascade,
  class     text not null,
  head_id   uuid not null references public.fee_heads(id) on delete cascade,
  amount    numeric(10,2) not null check (amount >= 0),
  unique (session, class, head_id)
);

create table if not exists public.fee_adjustments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students(id) on delete cascade,
  session         text not null references public.fee_sessions(id) on update cascade on delete cascade,
  head_id         uuid not null references public.fee_heads(id) on delete cascade,
  opted           boolean not null default true,         -- for optional / one-time heads
  amount_override numeric(10,2) check (amount_override >= 0),  -- e.g. this child's bus route fare
  concession_pct  numeric(5,2) not null default 0 check (concession_pct between 0 and 100),
  concession_flat numeric(10,2) not null default 0 check (concession_flat >= 0),
  reason          text,
  updated_by      uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_at      timestamptz not null default now(),
  unique (student_id, session, head_id)
);

create table if not exists public.fee_dues (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  session     text not null references public.fee_sessions(id) on update cascade on delete cascade,
  period      date not null check (extract(day from period) = 1),   -- the month, as its 1st
  head_id     uuid not null references public.fee_heads(id) on delete restrict,
  amount      numeric(10,2) not null check (amount >= 0),
  concession  numeric(10,2) not null default 0 check (concession >= 0 and concession <= amount),
  waived      boolean not null default false,
  is_manual   boolean not null default false,   -- added or edited by hand: the generator leaves it alone
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (student_id, session, period, head_id)
);

create index if not exists fee_dues_session_period_idx on public.fee_dues (session, period);
create index if not exists fee_dues_student_idx        on public.fee_dues (student_id, session);

-- Receipts. The table already exists; these columns turn it into a ledger.
alter table public.fee_payments add column if not exists receipt_no         text;
alter table public.fee_payments add column if not exists session            text;
alter table public.fee_payments add column if not exists mode               text not null default 'cash';
alter table public.fee_payments add column if not exists status             text not null default 'verified';
alter table public.fee_payments add column if not exists periods            date[] not null default '{}';
alter table public.fee_payments add column if not exists utr                text;
alter table public.fee_payments add column if not exists note               text;
alter table public.fee_payments add column if not exists paid_on            date not null default current_date;
alter table public.fee_payments add column if not exists claimed_student_id uuid references public.students(id) on delete set null;
alter table public.fee_payments add column if not exists verified_by        uuid references public.profiles(id) on delete set null;
alter table public.fee_payments add column if not exists verified_at        timestamptz;
alter table public.fee_payments add column if not exists cancel_reason      text;
alter table public.fee_payments add column if not exists cancelled_by       uuid references public.profiles(id) on delete set null;
alter table public.fee_payments add column if not exists cancelled_at       timestamptz;
-- Reserved for a payment gateway (Razorpay / Cashfree) confirming payments itself.
alter table public.fee_payments add column if not exists gateway            text;
alter table public.fee_payments add column if not exists gateway_payment_id text;

do $$ begin
  alter table public.fee_payments add constraint fee_payments_mode_chk
    check (mode in ('cash', 'upi', 'cheque', 'bank', 'card', 'online', 'other'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.fee_payments add constraint fee_payments_status_chk
    check (status in ('pending', 'verified', 'rejected', 'cancelled'));
exception when duplicate_object then null; end $$;

create unique index if not exists fee_payments_receipt_uq on public.fee_payments (receipt_no) where receipt_no is not null;
-- The same UPI reference cannot be claimed twice (a rejected claim may be resubmitted).
create unique index if not exists fee_payments_utr_uq on public.fee_payments (upper(utr))
  where utr is not null and status <> 'rejected';
create index if not exists fee_payments_status_idx on public.fee_payments (status, paid_at desc);
create index if not exists fee_payments_paid_on_idx on public.fee_payments (paid_on desc);

-- Rows written before the ledger: unmatched website payments still need checking.
update public.fee_payments
   set status = 'pending'
 where student_id is null and status = 'verified' and receipt_no is null and source = 'portal';
update public.fee_payments set mode = 'upi' where source = 'portal' and mode = 'cash';

create table if not exists public.fee_allocations (
  id          uuid primary key default gen_random_uuid(),
  payment_id  uuid not null references public.fee_payments(id) on delete cascade,
  due_id      uuid not null references public.fee_dues(id) on delete cascade,
  amount      numeric(10,2) not null check (amount > 0),
  unique (payment_id, due_id)
);

create index if not exists fee_allocations_due_idx on public.fee_allocations (due_id);

create table if not exists public.fee_receipt_counters (
  session text primary key,
  last_no integer not null default 0
);

-- A fee status the office set by hand (to release a marksheet despite dues,
-- say) is kept until the next payment for that student.
alter table public.students add column if not exists fee_status_manual boolean not null default false;

drop trigger if exists fee_dues_touch on public.fee_dues;
create trigger fee_dues_touch before update on public.fee_dues
  for each row execute function public.touch_updated_at();


-- ============================================================================
-- PART 2 — THE LEDGER VIEW
-- One row per due line with what has been paid against it and what is left.
-- security_invoker: whoever reads it is held to their own row-level security.
-- ============================================================================
create or replace view public.fee_due_lines with (security_invoker = true) as
select d.id, d.student_id, d.session, d.period, d.head_id,
       h.name  as head_name,
       h.sort  as head_sort,
       d.amount, d.concession, d.waived, d.is_manual, d.note,
       (d.amount - d.concession)                                   as net,
       coalesce(a.paid, 0)                                         as paid,
       case when d.waived then 0
            else greatest(d.amount - d.concession - coalesce(a.paid, 0), 0) end as balance,
       (d.period + (s.due_day - 1))                                as due_date
  from public.fee_dues d
  join public.fee_heads h    on h.id = d.head_id
  join public.fee_sessions s on s.id = d.session
  left join lateral (
       select sum(al.amount) as paid
         from public.fee_allocations al
         join public.fee_payments p on p.id = al.payment_id
        where al.due_id = d.id and p.status = 'verified'
  ) a on true;


-- ============================================================================
-- PART 3 — ENGINE
-- ============================================================================

create or replace function public.fee_current_session()
returns text language sql stable security definer set search_path = public as $$
  select id from public.fee_sessions where is_current limit 1;
$$;

-- Recompute PAID / PENDING from the ledger: PENDING while any line whose due
-- date has passed still has a balance. Students without ledger lines, and
-- statuses the office set by hand, are left alone.
create or replace function public._fee_refresh_status(p_student uuid default null)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_session text := public.fee_current_session();
  v_count   integer;
begin
  if v_session is null then return 0; end if;
  perform set_config('ada.fee_refresh', 'on', true);

  with calc as (
    select st.id,
           case when exists (
                  select 1 from public.fee_due_lines l
                   where l.student_id = st.id and l.session = v_session
                     and l.due_date <= current_date and l.balance > 0)
                then 'PENDING' else 'PAID' end as next_status
      from public.students st
     where st.is_active
       and not st.fee_status_manual
       and (p_student is null or st.id = p_student)
       and exists (select 1 from public.fee_dues d where d.student_id = st.id and d.session = v_session)
  )
  update public.students st
     set fee_status = calc.next_status
    from calc
   where st.id = calc.id and st.fee_status is distinct from calc.next_status;

  get diagnostics v_count = row_count;
  perform set_config('ada.fee_refresh', 'off', true);
  return v_count;
end;
$$;

-- A fee status changed by anything other than the ledger is a manual decision.
create or replace function public.guard_fee_status_manual()
returns trigger language plpgsql as $$
begin
  if new.fee_status is distinct from old.fee_status
     and coalesce(current_setting('ada.fee_refresh', true), 'off') <> 'on' then
    new.fee_status_manual := true;
  end if;
  return new;
end;
$$;

drop trigger if exists students_fee_manual on public.students;
create trigger students_fee_manual before update of fee_status on public.students
  for each row execute function public.guard_fee_status_manual();

-- Build (or bring up to date) the due lines for a session. Set-based, so a
-- whole school regenerates in one statement.
--   • adds lines that should exist and do not;
--   • re-prices lines nobody has paid or edited by hand (rate or class changed);
--   • removes such lines that should no longer exist (opted out of transport).
create or replace function public._fee_generate(p_session text, p_student uuid default null)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  s        public.fee_sessions%rowtype;
  v_from   date;
  v_added  integer;
  v_gone   integer;
begin
  select * into s from public.fee_sessions where id = p_session;
  if not found then raise exception 'Unknown fee session %', p_session; end if;
  v_from := coalesce(s.billing_from, s.starts_on);

  create temporary table if not exists _fee_want (
    student_id uuid, period date, head_id uuid, amount numeric(10,2), concession numeric(10,2)
  ) on commit drop;
  truncate _fee_want;

  insert into _fee_want
  select st.id, m.period, h.id,
         coalesce(adj.amount_override, r.amount),
         least(coalesce(adj.amount_override, r.amount),
               round(coalesce(adj.amount_override, r.amount) * coalesce(adj.concession_pct, 0) / 100, 2)
               + coalesce(adj.concession_flat, 0))
    from public.students st
    join public.fee_heads h on h.is_active
    cross join lateral (
         select (s.starts_on + make_interval(months => g))::date as period, g + 1 as idx
           from generate_series(0, s.months - 1) g
    ) m
    left join public.fee_rates r
           on r.session = s.id and r.class = st.class and r.head_id = h.id
    left join public.fee_adjustments adj
           on adj.student_id = st.id and adj.session = s.id and adj.head_id = h.id
   where st.is_active
     and (p_student is null or st.id = p_student)
     and m.period >= date_trunc('month', v_from)::date
     and (h.frequency = 'monthly' or m.idx = h.due_month)
     and ((not h.is_optional and h.frequency <> 'one_time') or coalesce(adj.opted, false))
     and coalesce(adj.amount_override, r.amount, 0) > 0;

  -- Lines that should exist: add them, or re-price the untouched ones.
  insert into public.fee_dues as d (student_id, session, period, head_id, amount, concession)
  select w.student_id, s.id, w.period, w.head_id, w.amount, w.concession from _fee_want w
  on conflict (student_id, session, period, head_id) do update
     set amount = excluded.amount, concession = excluded.concession
   where not d.is_manual
     and (d.amount, d.concession) is distinct from (excluded.amount, excluded.concession)
     and not exists (select 1 from public.fee_allocations a where a.due_id = d.id);
  get diagnostics v_added = row_count;

  -- Lines that should not exist any more, if nobody has paid or edited them.
  delete from public.fee_dues d
   where d.session = s.id
     and (p_student is null or d.student_id = p_student)
     and not d.is_manual
     and not exists (select 1 from public.fee_allocations a where a.due_id = d.id)
     and not exists (select 1 from _fee_want w
                      where w.student_id = d.student_id and w.period = d.period and w.head_id = d.head_id);
  get diagnostics v_gone = row_count;

  perform public._fee_refresh_status(p_student);
  return v_added + v_gone;
end;
$$;

-- New students, class changes and re-admissions pick up their dues by
-- themselves once billing is switched on for the current session.
create or replace function public.fee_student_changed()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_session text;
begin
  select id into v_session from public.fee_sessions where is_current and billing_enabled;
  if v_session is not null and new.is_active then
    perform public._fee_generate(v_session, new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists students_fee_dues on public.students;
create trigger students_fee_dues after insert or update of class, is_active on public.students
  for each row execute function public.fee_student_changed();

create or replace function public.fee_adjustment_changed()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record := coalesce(new, old);
begin
  if exists (select 1 from public.fee_sessions where id = r.session and billing_enabled) then
    perform public._fee_generate(r.session, r.student_id);
  end if;
  return null;
end;
$$;

drop trigger if exists fee_adjustments_regen on public.fee_adjustments;
create trigger fee_adjustments_regen after insert or update or delete on public.fee_adjustments
  for each row execute function public.fee_adjustment_changed();

-- Adding, switching off or re-timing a fee head re-bills the current session.
create or replace function public.fee_heads_changed()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_session text;
begin
  select id into v_session from public.fee_sessions where is_current and billing_enabled;
  if v_session is not null then perform public._fee_generate(v_session, null); end if;
  return null;
end;
$$;

drop trigger if exists fee_heads_regen on public.fee_heads;
create trigger fee_heads_regen after insert or update on public.fee_heads
  for each statement execute function public.fee_heads_changed();

create or replace function public._fee_next_receipt(p_session text)
returns text language plpgsql security definer set search_path = public as $$
declare v_no integer;
begin
  insert into public.fee_receipt_counters (session, last_no) values (coalesce(p_session, 'GEN'), 1)
  on conflict (session) do update set last_no = public.fee_receipt_counters.last_no + 1
  returning last_no into v_no;
  return coalesce(p_session, 'GEN') || '/' || lpad(v_no::text, 5, '0');
end;
$$;

-- Checks [{due_id, amount}] against one student's open balances and writes
-- the allocations. Shared by counter collection and online verification.
create or replace function public._fee_allocate(p_payment uuid, p_student uuid, p_lines jsonb)
returns numeric
language plpgsql security definer set search_path = public
as $$
declare
  v_line  jsonb;
  v_due   public.fee_due_lines%rowtype;
  v_amt   numeric(10,2);
  v_total numeric(10,2) := 0;
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Choose at least one month to pay.';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_amt := round((v_line->>'amount')::numeric, 2);
    -- Lock the line so two counters cannot both take the same month.
    perform 1 from public.fee_dues where id = (v_line->>'due_id')::uuid for update;
    select * into v_due from public.fee_due_lines where id = (v_line->>'due_id')::uuid;
    if not found or v_due.student_id <> p_student then
      raise exception 'A selected month does not belong to this student.';
    end if;
    if v_amt is null or v_amt <= 0 then
      raise exception 'Each amount must be more than zero.';
    end if;
    if v_amt > v_due.balance then
      raise exception '% for % is only ₹% outstanding.', v_due.head_name, to_char(v_due.period, 'Mon YYYY'), v_due.balance;
    end if;
    insert into public.fee_allocations (payment_id, due_id, amount) values (p_payment, v_due.id, v_amt);
    v_total := v_total + v_amt;
  end loop;

  return v_total;
end;
$$;


-- ============================================================================
-- PART 4 — STAFF ACTIONS (each checks who is calling)
-- ============================================================================

-- Fees taken at the counter or on the app: one receipt, the months it covers.
create or replace function public.collect_fee(
  p_student uuid, p_lines jsonb, p_mode text default 'cash',
  p_reference text default null, p_paid_on date default current_date,
  p_note text default null, p_source text default 'counter'
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  st        public.students%rowtype;
  v_session text := public.fee_current_session();
  v_pay     uuid := gen_random_uuid();
  v_receipt text;
  v_total   numeric(10,2);
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  select * into st from public.students where id = p_student and is_active;
  if not found then raise exception 'Student not found on the register.'; end if;
  if p_paid_on > current_date then raise exception 'The payment date cannot be in the future.'; end if;

  v_receipt := public._fee_next_receipt(v_session);

  -- Insert with a placeholder amount, allocate, then set the true total.
  insert into public.fee_payments (id, student_id, student_name, roll_no, class, category, amount,
                                   txn_ref, receipt_no, session, mode, status, utr, note, paid_on,
                                   contact, source, recorded_by, verified_by, verified_at)
  values (v_pay, st.id, st.name, st.roll_no, st.class, 'Fee ledger', 1,
          v_receipt, v_receipt, v_session, coalesce(p_mode, 'cash'), 'verified',
          nullif(trim(p_reference), ''), nullif(trim(p_note), ''), coalesce(p_paid_on, current_date),
          st.contact, coalesce(p_source, 'counter'), auth.uid(), auth.uid(), now());

  v_total := public._fee_allocate(v_pay, st.id, p_lines);

  update public.fee_payments p
     set amount  = v_total,
         periods = (select array_agg(distinct d.period order by d.period)
                      from public.fee_allocations a join public.fee_dues d on d.id = a.due_id
                     where a.payment_id = v_pay),
         category = (select string_agg(distinct h.name, ', ')
                       from public.fee_allocations a join public.fee_dues d on d.id = a.due_id
                       join public.fee_heads h on h.id = d.head_id where a.payment_id = v_pay)
   where p.id = v_pay;

  update public.students set fee_status_manual = false where id = st.id;
  perform public._fee_refresh_status(st.id);

  return jsonb_build_object('ok', true, 'payment_id', v_pay, 'receipt_no', v_receipt, 'amount', v_total);
end;
$$;

-- An online payment a parent reported, checked against the bank statement.
create or replace function public.verify_fee_payment(p_payment uuid, p_student uuid, p_lines jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  p       public.fee_payments%rowtype;
  st      public.students%rowtype;
  v_total numeric(10,2);
  v_receipt text;
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  select * into p from public.fee_payments where id = p_payment for update;
  if not found then raise exception 'Payment not found.'; end if;
  if p.status <> 'pending' then raise exception 'This payment has already been dealt with.'; end if;
  select * into st from public.students where id = p_student and is_active;
  if not found then raise exception 'Student not found on the register.'; end if;

  v_total := public._fee_allocate(p.id, st.id, p_lines);
  if abs(v_total - p.amount) > 0.009 then
    raise exception 'The months chosen add up to ₹%, but the payment was ₹%.', v_total, p.amount;
  end if;

  v_receipt := coalesce(p.receipt_no, public._fee_next_receipt(public.fee_current_session()));

  update public.fee_payments
     set status = 'verified', student_id = st.id, student_name = st.name,
         roll_no = st.roll_no, class = st.class, receipt_no = v_receipt,
         session = coalesce(session, public.fee_current_session()),
         periods = (select array_agg(distinct d.period order by d.period)
                      from public.fee_allocations a join public.fee_dues d on d.id = a.due_id
                     where a.payment_id = p.id),
         verified_by = auth.uid(), verified_at = now()
   where id = p.id;

  update public.students set fee_status_manual = false where id = st.id;
  perform public._fee_refresh_status(st.id);
  return jsonb_build_object('ok', true, 'receipt_no', v_receipt, 'amount', v_total);
end;
$$;

create or replace function public.reject_fee_payment(p_payment uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Give a reason for rejecting it.'; end if;
  update public.fee_payments
     set status = 'rejected', cancel_reason = trim(p_reason), cancelled_by = auth.uid(), cancelled_at = now()
   where id = p_payment and status = 'pending';
  if not found then raise exception 'Only a payment waiting for verification can be rejected.'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Cancel a receipt entered by mistake. It stays on record, marked cancelled,
-- and the months it paid become due again. Staff may cancel their own receipt
-- within 24 hours; after that, or someone else's, only the principal can.
create or replace function public.cancel_fee_receipt(p_payment uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare p public.fee_payments%rowtype;
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Give a reason for cancelling it.'; end if;
  select * into p from public.fee_payments where id = p_payment for update;
  if not found or p.status <> 'verified' then raise exception 'Only an active receipt can be cancelled.'; end if;
  if not public.is_admin()
     and not (p.recorded_by = auth.uid() and coalesce(p.verified_at, p.paid_at) > now() - interval '24 hours') then
    raise exception 'Only the principal can cancel this receipt.';
  end if;

  update public.fee_payments
     set status = 'cancelled', cancel_reason = trim(p_reason), cancelled_by = auth.uid(), cancelled_at = now()
   where id = p.id;

  if p.student_id is not null then
    update public.students set fee_status_manual = false where id = p.student_id;
    perform public._fee_refresh_status(p.student_id);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Edit one month: change the amount or concession, waive it, or add a note.
-- Principal only: this changes what a family owes.
create or replace function public.update_fee_due(
  p_due uuid, p_amount numeric default null, p_concession numeric default null,
  p_waived boolean default null, p_note text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare d public.fee_due_lines%rowtype;
begin
  if not public.is_admin() then raise exception 'Only the principal can change what is owed.'; end if;
  select * into d from public.fee_due_lines where id = p_due;
  if not found then raise exception 'That month was not found.'; end if;
  if coalesce(p_amount, d.amount) - coalesce(p_concession, d.concession) < d.paid then
    raise exception '₹% has already been paid for this month; the amount cannot go below that.', d.paid;
  end if;

  update public.fee_dues
     set amount     = coalesce(p_amount, amount),
         concession = coalesce(p_concession, concession),
         waived     = coalesce(p_waived, waived),
         note       = coalesce(nullif(trim(p_note), ''), note),
         is_manual  = true
   where id = p_due;

  perform public.write_activity(
    case when p_waived then 'waived' else 'updated' end, 'fee_dues', p_due::text,
    concat((select name from public.students where id = d.student_id), ' · ', d.head_name, ' · ', to_char(d.period, 'Mon YYYY')),
    jsonb_build_object('amount', jsonb_build_array(d.amount, coalesce(p_amount, d.amount)),
                       'concession', jsonb_build_array(d.concession, coalesce(p_concession, d.concession)),
                       'waived', jsonb_build_array(d.waived, coalesce(p_waived, d.waived)),
                       'note', p_note));
  perform public._fee_refresh_status(d.student_id);
  return jsonb_build_object('ok', true);
end;
$$;

-- An extra charge for one student: a late fine, a lost library book, arrears
-- carried over from before the ledger existed.
create or replace function public.add_fee_due(
  p_student uuid, p_period date, p_head uuid, p_amount numeric, p_note text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_session text := public.fee_current_session();
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'Only the principal can add a charge.'; end if;
  if v_session is null then raise exception 'Set up the fee session first.'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'Enter an amount.'; end if;

  insert into public.fee_dues as d (student_id, session, period, head_id, amount, is_manual, note)
  values (p_student, v_session, date_trunc('month', p_period)::date, p_head, round(p_amount, 2), true, nullif(trim(p_note), ''))
  on conflict (student_id, session, period, head_id) do update
     set amount = d.amount + excluded.amount, is_manual = true,
         note = concat_ws(' · ', d.note, excluded.note)
  returning id into v_id;

  perform public.write_activity('created', 'fee_dues', v_id::text,
    concat((select name from public.students where id = p_student), ' · extra charge ₹', p_amount, ' · ', to_char(p_period, 'Mon YYYY')),
    jsonb_build_object('amount', p_amount, 'note', p_note));
  perform public._fee_refresh_status(p_student);
  return jsonb_build_object('ok', true, 'due_id', v_id);
end;
$$;

-- Concession, route fare or opt-in for one student and one head.
create or replace function public.set_fee_adjustment(
  p_student uuid, p_head uuid, p_opted boolean, p_amount_override numeric,
  p_concession_pct numeric, p_concession_flat numeric, p_reason text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_session text := public.fee_current_session();
begin
  if not public.is_admin() then raise exception 'Only the principal can change concessions.'; end if;
  if v_session is null then raise exception 'Set up the fee session first.'; end if;

  insert into public.fee_adjustments as a (student_id, session, head_id, opted, amount_override,
                                           concession_pct, concession_flat, reason, updated_by, updated_at)
  values (p_student, v_session, p_head, coalesce(p_opted, true), p_amount_override,
          coalesce(p_concession_pct, 0), coalesce(p_concession_flat, 0), nullif(trim(p_reason), ''), auth.uid(), now())
  on conflict (student_id, session, head_id) do update
     set opted = excluded.opted, amount_override = excluded.amount_override,
         concession_pct = excluded.concession_pct, concession_flat = excluded.concession_flat,
         reason = excluded.reason, updated_by = excluded.updated_by, updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

-- Session settings and the class-wise rate card, saved together, then the
-- ledger brought up to date in one pass.
--   p_rates: [{class, head_id, amount}]
create or replace function public.save_fee_setup(
  p_session text, p_starts_on date, p_due_day integer, p_billing_from date,
  p_rates jsonb, p_generate boolean default false
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_changed integer := 0;
begin
  if not public.is_admin() then raise exception 'Only the principal can change the fee setup.'; end if;
  if p_session !~ '^\d{4}-\d{2}$' then raise exception 'Session must look like 2026-27.'; end if;

  update public.fee_sessions set is_current = false where is_current and id <> p_session;
  insert into public.fee_sessions as s (id, starts_on, due_day, billing_from, is_current)
  values (p_session, date_trunc('month', p_starts_on)::date, coalesce(p_due_day, 10),
          date_trunc('month', coalesce(p_billing_from, p_starts_on))::date, true)
  on conflict (id) do update
     set starts_on = excluded.starts_on, due_day = excluded.due_day,
         billing_from = excluded.billing_from, is_current = true;

  if p_rates is not null and jsonb_typeof(p_rates) = 'array' then
    insert into public.fee_rates as r (session, class, head_id, amount)
    select p_session, x->>'class', (x->>'head_id')::uuid, greatest(coalesce((x->>'amount')::numeric, 0), 0)
      from jsonb_array_elements(p_rates) x
    on conflict (session, class, head_id) do update set amount = excluded.amount
     where r.amount is distinct from excluded.amount;
  end if;

  if p_generate or (select billing_enabled from public.fee_sessions where id = p_session) then
    update public.fee_sessions set billing_enabled = true where id = p_session;
    v_changed := public._fee_generate(p_session, null);
  end if;

  perform public.write_activity('updated', 'fee_sessions', p_session,
    concat('Fee setup ', p_session, case when p_generate then ' · dues generated' else '' end),
    jsonb_build_object('due_day', p_due_day, 'billing_from', p_billing_from, 'lines_changed', v_changed));
  return jsonb_build_object('ok', true, 'lines_changed', v_changed);
end;
$$;

-- Daily refresh: a month whose due date passed overnight turns a student
-- PENDING. Called when the Fees screen opens; schedule it with pg_cron too.
create or replace function public.refresh_fee_status()
returns integer language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  return public._fee_refresh_status(null);
end;
$$;


-- ============================================================================
-- PART 5 — REPORTS
-- ============================================================================

-- Per class: who is billed, what has come in, what is overdue.
create or replace function public.fee_class_summary(p_upto date default current_date)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare v_session text := public.fee_current_session();
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'class', t.class, 'students', t.students, 'billed', t.billed,
             'collected', t.collected, 'overdue', t.overdue, 'defaulters', t.defaulters,
             'upcoming', t.upcoming) order by t.class)
      from (
        select st.class,
               count(distinct st.id)                                                          as students,
               coalesce(sum(l.net) filter (where not l.waived and l.due_date <= p_upto), 0)  as billed,
               coalesce(sum(l.paid), 0)                                                       as collected,
               coalesce(sum(l.balance) filter (where l.due_date <= p_upto), 0)               as overdue,
               coalesce(sum(l.balance) filter (where l.due_date > p_upto), 0)                as upcoming,
               count(distinct st.id) filter (where l.balance > 0 and l.due_date <= p_upto)   as defaulters
          from public.students st
          left join public.fee_due_lines l on l.student_id = st.id and l.session = v_session
         where st.is_active
         group by st.class
      ) t), '[]'::jsonb);
end;
$$;

-- Students with overdue months, for reminders.
create or replace function public.fee_defaulters(p_class text default null, p_upto date default current_date)
returns table (student_id uuid, name text, class text, section text, roll_no text,
               father_name text, contact text, months date[], amount numeric)
language plpgsql stable security definer set search_path = public
as $$
declare v_session text := public.fee_current_session();
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  return query
    select st.id, st.name, st.class, st.section, st.roll_no, st.father_name, st.contact,
           array_agg(distinct l.period order by l.period), sum(l.balance)
      from public.students st
      join public.fee_due_lines l on l.student_id = st.id and l.session = v_session
     where st.is_active and l.balance > 0 and l.due_date <= p_upto
       and (p_class is null or st.class = p_class)
     group by st.id
     order by sum(l.balance) desc, st.class, st.roll_no;
end;
$$;

-- Money received in a date range, by mode and by day (the day book).
create or replace function public.fee_collection_summary(p_from date, p_to date)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  return jsonb_build_object(
    'total',    (select coalesce(sum(amount), 0) from public.fee_payments
                  where status = 'verified' and paid_on between p_from and p_to),
    'receipts', (select count(*) from public.fee_payments
                  where status = 'verified' and paid_on between p_from and p_to),
    'by_mode',  (select coalesce(jsonb_object_agg(mode, total), '{}'::jsonb) from (
                   select mode, sum(amount) total from public.fee_payments
                    where status = 'verified' and paid_on between p_from and p_to group by mode) m),
    'by_day',   (select coalesce(jsonb_agg(jsonb_build_object('day', paid_on, 'total', total, 'count', n) order by paid_on), '[]'::jsonb) from (
                   select paid_on, sum(amount) total, count(*) n from public.fee_payments
                    where status = 'verified' and paid_on between p_from and p_to group by paid_on) d),
    'pending',  (select count(*) from public.fee_payments where status = 'pending')
  );
end;
$$;

-- The dashboard's headline figure counts only money actually confirmed.
create or replace function public.dashboard_stats()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'not authorised'; end if;
  return (
    select jsonb_build_object(
      'total_students', (select count(*) from public.students where is_active),
      'paid',           (select count(*) from public.students where is_active and fee_status = 'PAID'),
      'pending',        (select count(*) from public.students where is_active and fee_status = 'PENDING'),
      'total_marks',    (select count(*) from public.marks),
      'new_enquiries',  (select count(*) from public.enquiries where status = 'new'),
      'collected',      (select coalesce(sum(amount), 0) from public.fee_payments where status = 'verified'),
      'to_verify',      (select count(*) from public.fee_payments where status = 'pending'),
      'by_class',       (select coalesce(jsonb_agg(c order by c->>'cls'), '[]'::jsonb) from (
                           select jsonb_build_object('cls', class, 'count', count(*),
                                    'pending', count(*) filter (where fee_status = 'PENDING')) as c
                             from public.students where is_active group by class) t)
    )
  );
end;
$$;


-- ============================================================================
-- PART 6 — PUBLIC (parents, no login)
-- Same identity rule as the result lookup: roll number, class and the
-- student's full first name. Returns this one child's months and nothing else.
-- ============================================================================
create or replace function public._fee_find_student(p_roll text, p_class text, p_name text)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare
  v_name text := upper(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'));
  v_id   uuid;
begin
  if coalesce(trim(p_roll), '') = '' or length(v_name) < 2 then return null; end if;
  select id into v_id from public.students
   where is_active and roll_no = trim(p_roll) and upper(class) = upper(trim(p_class))
     and split_part(upper(name), ' ', 1) = split_part(v_name, ' ', 1)
     and upper(name) like v_name || '%'
   limit 1;
  return v_id;
end;
$$;

create or replace function public.get_fee_statement(p_roll text, p_class text, p_name text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_id      uuid := public._fee_find_student(p_roll, p_class, p_name);
  v_session text := public.fee_current_session();
  st        public.students%rowtype;
begin
  if v_id is null then return jsonb_build_object('status', 'not_found'); end if;
  select * into st from public.students where id = v_id;

  if v_session is null or not exists (select 1 from public.fee_dues where student_id = v_id and session = v_session) then
    return jsonb_build_object('status', 'no_ledger',
      'student', jsonb_build_object('name', st.name, 'class', st.class, 'section', st.section, 'roll_no', st.roll_no));
  end if;

  return jsonb_build_object(
    'status', 'success',
    'session', v_session,
    'student', jsonb_build_object('name', st.name, 'class', st.class, 'section', st.section, 'roll_no', st.roll_no),
    'months', (
      select jsonb_agg(jsonb_build_object(
               'period', m.period, 'due_date', m.due_date, 'net', m.net, 'paid', m.paid,
               'balance', m.balance, 'waived', m.all_waived,
               'heads', m.heads,
               'awaiting', exists (select 1 from public.fee_payments p
                                    where p.status = 'pending' and p.claimed_student_id = v_id
                                      and m.period = any (p.periods)))
             order by m.period)
        from (
          select l.period, min(l.due_date) due_date, sum(l.net) net, sum(l.paid) paid,
                 sum(l.balance) balance, bool_and(l.waived) all_waived,
                 jsonb_agg(jsonb_build_object('head', l.head_name, 'net', l.net, 'balance', l.balance)
                           order by l.head_sort) heads
            from public.fee_due_lines l
           where l.student_id = v_id and l.session = v_session
           group by l.period
        ) m)
  );
end;
$$;

-- A parent reports a UPI payment. It waits, status 'pending', until the
-- office matches it to the bank statement — the parent's word clears nothing.
create or replace function public.submit_fee_payment(
  p_roll text, p_class text, p_name text, p_periods date[], p_amount numeric,
  p_utr text, p_phone text default null, p_category text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_id  uuid := public._fee_find_student(p_roll, p_class, p_name);
  v_utr text := upper(regexp_replace(coalesce(p_utr, ''), '\s', '', 'g'));
  v_ref text := 'WEB-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6));
begin
  if coalesce(p_amount, 0) < 1 or p_amount > 200000 then raise exception 'Enter an amount between ₹1 and ₹2,00,000.'; end if;
  if v_utr !~ '^[A-Z0-9]{6,30}$' then raise exception 'Enter the UPI reference (UTR) number shown in your payment app.'; end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_roll), '') = '' then raise exception 'Enter the student''s name and roll number.'; end if;
  if exists (select 1 from public.fee_payments where upper(utr) = v_utr and status <> 'rejected') then
    raise exception 'This UPI reference has already been submitted. The office will verify it shortly.';
  end if;
  -- A light brake on junk: one student cannot have more than five claims waiting.
  if (select count(*) from public.fee_payments
       where status = 'pending' and roll_no = trim(p_roll) and upper(class) = upper(trim(p_class))) >= 5 then
    raise exception 'Several payments for this student are already waiting. Please contact the office.';
  end if;

  insert into public.fee_payments (student_name, roll_no, class, category, amount, txn_ref, utr,
                                   contact, source, mode, status, periods, claimed_student_id, session, recorded_by)
  values (upper(trim(p_name)), trim(p_roll), upper(trim(p_class)), coalesce(nullif(trim(p_category), ''), 'School fee'),
          round(p_amount, 2), v_ref, v_utr, nullif(trim(p_phone), ''), 'portal', 'upi', 'pending',
          coalesce(p_periods, '{}'), v_id, public.fee_current_session(), null);

  return jsonb_build_object('ok', true, 'reference', v_ref, 'matched', v_id is not null);
end;
$$;


-- ============================================================================
-- PART 7 — SECURITY
-- ============================================================================
alter table public.fee_sessions         enable row level security;
alter table public.fee_heads            enable row level security;
alter table public.fee_rates            enable row level security;
alter table public.fee_adjustments      enable row level security;
alter table public.fee_dues             enable row level security;
alter table public.fee_allocations      enable row level security;
alter table public.fee_receipt_counters enable row level security;

revoke all on public.fee_sessions, public.fee_heads, public.fee_rates, public.fee_adjustments,
              public.fee_dues, public.fee_allocations, public.fee_receipt_counters, public.fee_due_lines
  from anon, authenticated;

-- Staff read the ledger; every change goes through the functions above.
grant select on public.fee_sessions, public.fee_heads, public.fee_rates, public.fee_adjustments,
                public.fee_dues, public.fee_allocations, public.fee_due_lines to authenticated;
-- Fee heads are a short list the principal edits directly.
grant insert, update, delete on public.fee_heads to authenticated;

do $$
declare t text;
begin
  foreach t in array array['fee_sessions', 'fee_heads', 'fee_rates', 'fee_adjustments', 'fee_dues', 'fee_allocations'] loop
    execute format('drop policy if exists %I on public.%I', t || '_staff_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_staff())', t || '_staff_read', t);
  end loop;
end $$;

drop policy if exists fee_heads_admin_write on public.fee_heads;
create policy fee_heads_admin_write on public.fee_heads
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Website payments now go through submit_fee_payment(), which validates them.
-- Nobody writes to fee_payments directly any more.
drop policy if exists fee_public_insert on public.fee_payments;
drop policy if exists fee_staff_update on public.fee_payments;
revoke insert, update, delete on public.fee_payments from anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'fee_current_session()',
    '_fee_refresh_status(uuid)', '_fee_generate(text, uuid)', '_fee_next_receipt(text)',
    '_fee_allocate(uuid, uuid, jsonb)', '_fee_find_student(text, text, text)',
    'fee_student_changed()', 'fee_adjustment_changed()', 'fee_heads_changed()', 'guard_fee_status_manual()',
    'collect_fee(uuid, jsonb, text, text, date, text, text)',
    'verify_fee_payment(uuid, uuid, jsonb)', 'reject_fee_payment(uuid, text)',
    'cancel_fee_receipt(uuid, text)',
    'update_fee_due(uuid, numeric, numeric, boolean, text)',
    'add_fee_due(uuid, date, uuid, numeric, text)',
    'set_fee_adjustment(uuid, uuid, boolean, numeric, numeric, numeric, text)',
    'save_fee_setup(text, date, integer, date, jsonb, boolean)',
    'refresh_fee_status()', 'fee_class_summary(date)', 'fee_defaulters(text, date)',
    'fee_collection_summary(date, date)', 'dashboard_stats()',
    'get_fee_statement(text, text, text)',
    'submit_fee_payment(text, text, text, date[], numeric, text, text, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

grant execute on function public.fee_current_session() to authenticated;
grant execute on function public.collect_fee(uuid, jsonb, text, text, date, text, text) to authenticated;
grant execute on function public.verify_fee_payment(uuid, uuid, jsonb) to authenticated;
grant execute on function public.reject_fee_payment(uuid, text) to authenticated;
grant execute on function public.cancel_fee_receipt(uuid, text) to authenticated;
grant execute on function public.update_fee_due(uuid, numeric, numeric, boolean, text) to authenticated;
grant execute on function public.add_fee_due(uuid, date, uuid, numeric, text) to authenticated;
grant execute on function public.set_fee_adjustment(uuid, uuid, boolean, numeric, numeric, numeric, text) to authenticated;
grant execute on function public.save_fee_setup(text, date, integer, date, jsonb, boolean) to authenticated;
grant execute on function public.refresh_fee_status() to authenticated;
grant execute on function public.fee_class_summary(date) to authenticated;
grant execute on function public.fee_defaulters(text, date) to authenticated;
grant execute on function public.fee_collection_summary(date, date) to authenticated;
grant execute on function public.dashboard_stats() to authenticated;
grant execute on function public.get_fee_statement(text, text, text) to anon, authenticated;
grant execute on function public.submit_fee_payment(text, text, text, date[], numeric, text, text, text) to anon, authenticated;

-- Changes to the fee setup and concessions appear in the activity log.
do $$
declare t text;
begin
  foreach t in array array['fee_heads', 'fee_rates', 'fee_adjustments'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_activity', t);
    execute format('create trigger %I after insert or update or delete on public.%I
                    for each row execute function public.log_activity()', t || '_activity', t);
  end loop;
end $$;


-- ============================================================================
-- PART 8 — STARTING DATA
-- The published fee card for 2026-27. Edit it in Dashboard → Fees → Setup.
-- Nothing is billed until "Generate dues" is pressed there.
-- ============================================================================
insert into public.fee_sessions (id, starts_on, due_day, billing_from, is_current)
select '2026-27', date '2026-04-01', 10, date '2026-04-01', true
 where not exists (select 1 from public.fee_sessions);

insert into public.fee_heads (name, frequency, due_month, is_optional, sort) values
  ('Tuition fee',      'monthly',  1, false, 1),
  ('Transport fee',    'monthly',  1, true,  2),
  ('Examination fee',  'annual',   1, false, 3),
  ('Admission fee',    'one_time', 1, false, 4),
  ('Late fine',        'one_time', 1, true,  9)
on conflict (name) do nothing;

insert into public.fee_rates (session, class, head_id, amount)
select '2026-27', c.class, h.id, c.amount
  from (values
    ('PP1', 'Tuition fee', 900),  ('PP2', 'Tuition fee', 900),
    ('1ST', 'Tuition fee', 1100), ('2ND', 'Tuition fee', 1100), ('3RD', 'Tuition fee', 1100),
    ('4TH', 'Tuition fee', 1100), ('5TH', 'Tuition fee', 1100),
    ('6TH', 'Tuition fee', 1400), ('7TH', 'Tuition fee', 1400), ('8TH', 'Tuition fee', 1400),
    ('9TH', 'Tuition fee', 1800), ('10TH', 'Tuition fee', 1800),
    ('PP1', 'Examination fee', 400), ('PP2', 'Examination fee', 400),
    ('1ST', 'Examination fee', 500), ('2ND', 'Examination fee', 500), ('3RD', 'Examination fee', 500),
    ('4TH', 'Examination fee', 500), ('5TH', 'Examination fee', 500),
    ('6TH', 'Examination fee', 600), ('7TH', 'Examination fee', 600), ('8TH', 'Examination fee', 600),
    ('9TH', 'Examination fee', 800), ('10TH', 'Examination fee', 800),
    ('PP1', 'Admission fee', 2000), ('PP2', 'Admission fee', 2000),
    ('1ST', 'Admission fee', 2500), ('2ND', 'Admission fee', 2500), ('3RD', 'Admission fee', 2500),
    ('4TH', 'Admission fee', 2500), ('5TH', 'Admission fee', 2500),
    ('6TH', 'Admission fee', 3000), ('7TH', 'Admission fee', 3000), ('8TH', 'Admission fee', 3000),
    ('9TH', 'Admission fee', 3500), ('10TH', 'Admission fee', 3500)
  ) as c(class, head, amount)
  join public.fee_heads h on h.name = c.head
  join public.fee_sessions s on s.id = '2026-27'
on conflict (session, class, head_id) do nothing;

-- Optional: refresh PAID / PENDING every morning (Database → Extensions → pg_cron):
--   select cron.schedule('fee-status', '15 0 * * *', $$select public._fee_refresh_status(null)$$);
