# Database setup — Supabase

The website and the Android app both read and write one shared database, so a
mark entered on a teacher's phone appears on the website immediately.

**Nothing here touches any account but your own.** You create the project, you
hold the keys, and you paste them into a local `.env` file that is never
committed.

---

## 1. Why Supabase

| | Supabase | Firebase | Neon / PlanetScale |
|---|---|---|---|
| Database | PostgreSQL (relational) | Firestore (document) | PostgreSQL |
| Teacher logins | Built in | Built in | You build it yourself |
| Row-level security | Built into Postgres | Separate rules language | You build it yourself |
| Free tier | 500 MB, 50k monthly users | Generous, but metered reads | DB only |
| Fits school data | Yes — students → marks → fees are relational | Workable, but joins are awkward | Yes, minus auth |

School data is deeply relational: a student has many marks, marks belong to an
exam, fees belong to a student. That is what Postgres is for, and Supabase adds
the login system and the security rules on top. Firebase would work but you
would be fighting its document model every time you wanted a class-wise report.

**Free tier limits worth knowing:**

- 500 MB database — this school's register would use a few MB, so you will not
  come close. 50,000 students would still fit.
- 50,000 monthly active users — only *signed-in* teachers count, not website
  visitors. You will use about 45.
- **Projects pause after 7 days with no activity.** A live school site gets hit
  daily, so this will not trigger. If the school closes for a long holiday,
  open the dashboard once to wake it, or set up a free uptime ping.
- 2 active projects per organisation.

---

## 2. Create your project

1. Sign up at [supabase.com](https://supabase.com) with **your own** account.
2. **New project** → name it `ashadeep-school`.
3. Choose region **Mumbai (ap-south-1)** — closest to Panipat, so the site feels
   faster for parents on Indian connections.
4. Set a strong database password and save it somewhere safe.
5. Wait about two minutes for it to finish provisioning.

---

## 3. Create the tables

**New project — the easy way:** open **SQL Editor → New query**, paste the whole of
`supabase/setup_complete.sql`, and press Run. That one file creates every table,
security rule and function, with all the security fixes included. Then follow the
"FIRST ADMIN" steps written at the bottom of that file.

Optionally run `supabase/migrations/003_seed.sql` afterwards for ten demo students.

**Upgrading an older project instead:** run these files **in order**. Paste each
one, press Run, confirm it says Success, then move to the next.

| Order | File | What it does |
|---|---|---|
| 1 | `supabase/migrations/001_schema.sql` | Tables, indexes, constraints, triggers |
| 2 | `supabase/migrations/002_security.sql` | Row-level security and the safe lookup functions |
| 3 | `supabase/migrations/003_seed.sql` | The ten demo students — **skip this** if you are loading the real register |
| 4 | `supabase/migrations/004_security_hardening.sql` | Closes self-sign-up, self-reactivation, free fee clearing and result guessing |
| 5 | `supabase/migrations/005_admin_and_activity.sql` | Admin panel functions and the activity log |

All of them are safe to run more than once.

---

## 4. Connect the apps to it

In the dashboard: **Project Settings → API**. Copy the two values.

```bash
cp .env.example .env
```

Then edit `.env`:

```
VITE_SUPABASE_URL=https://yourprojectref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
```

Rebuild so the values are compiled in:

```bash
npm run build        # website
npm run apk          # Android app
```

> **The `anon` key is meant to be public** — it ships inside the website bundle
> and inside the APK, and anyone can read it. That is fine *because* row-level
> security controls what it can actually do. The **`service_role` key is the
> opposite**: it bypasses every rule. Never put it in `.env`, never paste it
> into the app, never commit it anywhere.

Until `.env` exists the project runs in **offline demo mode** with the bundled
sample records, exactly as it did before. Nothing breaks while you are setting
up.

---

## 5. Create the teacher accounts

Each teacher gets their own login. In the dashboard: **Authentication → Users →
Add user**.

- Enter the teacher's email and a starting password.
- Tick **Auto Confirm User**, otherwise they must click a confirmation email.

A `profiles` row is created automatically with the role `teacher`, but it is
**switched off** until you activate it — so a stranger who signs up on their own
gets no access. Activate each teacher you create:

```sql
update public.profiles set is_active = true
 where id = (select id from auth.users where email = 'pooja@ashadeepadarsh.in');
```

**Easier, once one admin exists:** keep **Authentication → Sign In / Providers →
Email → "Allow new users to sign up"** switched **on**. New teachers then tap
*Request access* on the sign-in screen (website or app), and the principal approves
them in **Dashboard → Staff** (or **More → Admin** in the app). A request can see
nothing until it is approved, so leaving sign-ups on is safe. The same screen
deactivates, promotes, or deletes accounts, and **Dashboard → Activity log** shows
who changed what and when.

To make
someone an administrator (who may also delete student records), run this in the
SQL editor:

```sql
update public.profiles
   set role = 'admin', full_name = 'Satbir Singh Malik'
 where id = (select id from auth.users where email = 'principal@ashadeepadarsh.in');
```

To set a teacher's display name:

```sql
update public.profiles
   set full_name = 'Pooja Chauhan'
 where id = (select id from auth.users where email = 'pooja@ashadeepadarsh.in');
```

**When a teacher leaves**, do not delete the account — that would orphan the
record of who entered which marks. Deactivate it instead:

```sql
update public.profiles set is_active = false
 where id = (select id from auth.users where email = 'leaver@ashadeepadarsh.in');
```

---

## 6. How the security works

The guiding rule: **anything the public key can read is effectively published.**
So the public key can read almost nothing.

| Who | Can do |
|---|---|
| Anyone (not signed in) | Read published notices and events. Submit an admission enquiry. Record a fee payment. Look up **one** result via a function. |
| Signed-in teacher | Read and write the whole register, marks, enquiries and the fee ledger. |
| Administrator | All of the above, plus delete student records and manage staff. |

The important detail is the result lookup. A parent checking their child's
marks must not be able to download every child's name, father's name and phone
number. So the public has **no read access to the `students` table at all**.
Instead, `get_student_result(roll, name, exam)` runs inside the database, needs
both the roll number *and* the student's full first name, and returns exactly one
marksheet. There is no way to list or enumerate students through it.

Two more safeguards worth knowing:

- An online payment is **recorded** in the ledger but does not clear the
  student's dues by itself — there is no bank callback proving it happened.
  Staff check the payment against the bank statement and mark the student PAID
  from the dashboard or the app. `settle_fee()` is staff-only.
- Only an administrator can change anyone's role or active status, including
  their own.
- Obtained marks can never exceed the maximum — enforced by a database
  constraint, not just the form, so a malformed request cannot write a
  nonsense marksheet.

---

## 7. Working offline

Teachers in Karhans will not always have a signal, so the app never blocks on
the network:

1. A save updates the screen immediately.
2. If the server is unreachable, the change goes into a local queue.
3. When the connection returns, the queue is replayed in order and the teacher
   is told how many changes went up.

A bar at the top of the app shows when something is still waiting. If two
teachers edit the same student and one was offline, **the change that reaches
the server last wins** — the alternative would be refusing to save, which is
worse in a classroom.

---

## 8. Backups

The free plan does not include automatic backups, so take your own. Once a
term is plenty for a school this size:

- **Dashboard → Database → Backups** for a manual snapshot, or
- **Table Editor → students → Export as CSV** for something you can open in
  Excel, or
- the **Export register as CSV** button inside the faculty app.

Before any bulk change — importing a new year's admissions, promoting a whole
class — take a snapshot first.

---

## 9. Loading your real students

Once you are ready to replace the demo data:

```sql
-- Clear the samples (this also removes their marks).
delete from public.students where admission_no like 'STU-10%';
```

Then **Table Editor → students → Insert → Import data from CSV** with these
column headings:

```
roll_no, name, class, section, father_name, mother_name, contact, dob, house, fee_status
```

`class` must match the app's list exactly (`PP1`, `1ST` … `10TH`), `fee_status`
must be `PAID` or `PENDING`, and `dob` must be `YYYY-MM-DD`.

---

## 10. Troubleshooting

| What you see | What it means |
|---|---|
| "The app is not connected to a database yet" | `.env` is missing or empty, and you have not rebuilt since adding it. |
| "That email and password do not match" | Wrong credentials, or the user was never confirmed — tick Auto Confirm User. |
| "Your account is not allowed to do that" | The `profiles` row is missing, `is_active` is false, or the action needs `role = 'admin'`. |
| Dashboard loads but the register is empty | The account signed in has no profile row. Check `select * from public.profiles`. |
| "No connection to the school database" | Genuinely offline. Work is queued and will upload by itself. |
| Project paused | A week of no traffic on the free plan. Open the dashboard to resume it. |
