-- ============================================================================
-- Admin panel and activity log. Run after 001–004 (or after setup_complete.sql
-- from before this file existed). Safe to re-run.
--
--   1. Staff email on profiles, so the admin can see who is asking for access.
--   2. activity_log — an append-only record of every change: who, what, when,
--      and the before/after values. Written by triggers, so nothing the apps do
--      can skip it or edit it. Only admins can read it.
--   3. Admin functions — list staff, approve / deactivate / change role,
--      delete a login. Guarded so the last active admin can never be removed.
--   4. Small defaults so office-recorded payments know who recorded them.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. STAFF EMAIL
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
