#!/usr/bin/env node
/* ============================================================
   Database health check.

      npm run check:db

   Answers "did I set Supabase up correctly?" without you having
   to open the dashboard. It connects with the public anon key —
   exactly what the website and the APK use — and verifies that
   the tables exist, the security rules are switched on, and the
   safe result lookup works.

   It never prints your keys.
   ============================================================ */

import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const ok   = (m, d) => console.log(`  ${C.green}✓${C.reset} ${m}${d ? C.dim + '  ' + d + C.reset : ''}`);
const bad  = (m, d) => { console.log(`  ${C.red}✗${C.reset} ${m}${d ? '\n      ' + C.dim + d + C.reset : ''}`); failures++; };
const warn = (m, d) => console.log(`  ${C.yellow}!${C.reset} ${m}${d ? '\n      ' + C.dim + d + C.reset : ''}`);

let failures = 0;

// ---------- Read .env without needing a dependency ----------
function loadEnv() {
  if (!existsSync('.env')) return {};
  const out = {};
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

console.log(`\n${C.bold}Asha Deep — database check${C.reset}\n`);

// ---------- 1. Credentials ----------
console.log(`${C.cyan}1. Credentials${C.reset}`);
if (!existsSync('.env')) {
  bad('.env file not found',
      'Run:  cp .env.example .env    then fill in the two values from\n      Supabase → Project Settings → API');
  console.log(`\n${C.yellow}The apps will run in offline demo mode until this is done.${C.reset}\n`);
  process.exit(1);
}
ok('.env found');

if (!url || !url.startsWith('http')) {
  bad('VITE_SUPABASE_URL is missing or malformed', 'It should look like https://abcdefgh.supabase.co');
} else {
  ok('VITE_SUPABASE_URL set', url.replace(/https:\/\/([^.]{4}).*/, 'https://$1…supabase.co'));
}

if (!key || key.length < 30) {
  bad('VITE_SUPABASE_ANON_KEY is missing or too short');
} else if (/service_role/.test(key)) {
  bad('That looks like the SERVICE ROLE key — remove it immediately',
      'The service_role key bypasses every security rule and must never be in .env,\n      because everything in VITE_ is compiled into the public website and the APK.\n      Use the "anon" / "public" key instead, and rotate the leaked one in the dashboard.');
} else {
  ok('VITE_SUPABASE_ANON_KEY set', `${key.length} characters`);
}

if (failures) { console.log(`\n${C.red}Fix the above first.${C.reset}\n`); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false } });

// ---------- 2. Reachability ----------
console.log(`\n${C.cyan}2. Connection${C.reset}`);
try {
  const { error } = await db.from('notices').select('id').limit(1);
  if (error) throw error;
  ok('Reached the database');
} catch (e) {
  bad('Could not reach the database', String(e.message || e));
  console.log(`\n${C.red}Check the URL, and that the project is not paused.${C.reset}\n`);
  process.exit(1);
}

// ---------- 3. Tables ----------
console.log(`\n${C.cyan}3. Tables${C.reset}`);
for (const t of ['notices', 'events']) {
  const { error } = await db.from(t).select('id').limit(1);
  if (error) bad(`public.${t} is not readable`, error.message);
  else ok(`public.${t} exists and is publicly readable`);
}

for (const t of ['students', 'marks', 'profiles', 'fee_payments', 'enquiries']) {
  const { error } = await db.from(t).select('id').limit(1);
  // "relation does not exist" means migration 001 was not run.
  if (error && /does not exist|schema cache/i.test(error.message)) {
    bad(`public.${t} does not exist`, 'Run supabase/migrations/001_schema.sql in the SQL editor.');
  } else {
    ok(`public.${t} exists`);
  }
}

// ---------- 4. Security — the important part ----------
console.log(`\n${C.cyan}4. Security rules${C.reset}`);
{
  // The anon key must NOT be able to list students. If it can, every child's
  // name, parents and phone number are public.
  const { data, error } = await db.from('students').select('name, contact').limit(5);
  if (error && /row-level security|permission/i.test(error.message)) {
    ok('Students are NOT readable by the public', 'row-level security is doing its job');
  } else if (Array.isArray(data) && data.length === 0) {
    ok('Students are NOT readable by the public', 'returned no rows to the anon key');
  } else {
    bad(`STUDENT DATA IS PUBLIC — ${data?.length} rows came back to the anonymous key`,
        'Run supabase/migrations/002_security.sql. Until you do, anyone can download\n      every student\'s name, parents\' names and phone number from the website.');
  }
}
{
  const { data, error } = await db.from('marks').select('id').limit(5);
  if (error || !data?.length) ok('Marks are NOT readable by the public');
  else bad(`MARKS ARE PUBLIC — ${data.length} rows returned`, 'Run 002_security.sql.');
}

// ---------- 5. The safe result lookup ----------
console.log(`\n${C.cyan}5. Result lookup function${C.reset}`);
{
  const { data, error } = await db.rpc('get_student_result', {
    p_roll: '__none__', p_name: '__none__', p_exam: 'UT-1',
  });
  if (error && /function .* does not exist|not find/i.test(error.message)) {
    bad('get_student_result() is missing', 'Run supabase/migrations/002_security.sql.');
  } else if (error) {
    bad('get_student_result() errored', error.message);
  } else if (data?.status === 'not_found') {
    ok('get_student_result() works', 'correctly returned not_found for a fake student');
  } else {
    warn('get_student_result() returned something unexpected', JSON.stringify(data).slice(0, 120));
  }
}

// ---------- 6. Seed data ----------
console.log(`\n${C.cyan}6. Data${C.reset}`);
{
  const { count } = await db.from('notices').select('id', { count: 'exact', head: true });
  if (count > 0) ok(`${count} notices published`);
  else warn('No notices yet', 'Run 003_seed.sql for the samples, or add your own from the dashboard.');

  const { data } = await db.rpc('get_student_result', { p_roll: '1', p_name: 'AMAN', p_exam: 'UT-1' });
  if (data?.status === 'success') {
    ok('Sample student lookup works', `${data.student.name}, ${data.marks.length} subjects`);
  } else if (data?.status === 'not_found') {
    warn('No sample students', 'Expected if you loaded your own register instead of 003_seed.sql.');
  }
}

// ---------- 7. Teacher accounts ----------
console.log(`\n${C.cyan}7. Teacher accounts${C.reset}`);
{
  // A wrong password proves the auth endpoint is alive without needing real ones.
  const { error } = await db.auth.signInWithPassword({
    email: 'nobody@example.invalid', password: 'not-a-real-password',
  });
  if (error && /Invalid login credentials/i.test(error.message)) {
    ok('Email sign-in is enabled');
  } else if (error && /disabled|not enabled/i.test(error.message)) {
    bad('Email sign-in is disabled', 'Supabase → Authentication → Providers → enable Email.');
  } else {
    warn('Could not confirm the sign-in setting', error?.message || 'unexpected success');
  }
  console.log(`      ${C.dim}Create teachers at: Authentication → Users → Add user (tick Auto Confirm)${C.reset}`);
}

// ---------- Verdict ----------
console.log('');
if (failures) {
  console.log(`${C.red}${C.bold}${failures} problem${failures > 1 ? 's' : ''} found.${C.reset} See DATABASE.md.\n`);
  process.exit(1);
}
console.log(`${C.green}${C.bold}All good — the website and app are ready to use this database.${C.reset}`);
console.log(`${C.dim}Next:  npm run build  &&  npm run apk${C.reset}\n`);
