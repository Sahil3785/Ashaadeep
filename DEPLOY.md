# Going live

Everything is built and tested. This is the deployment itself.

---

## 1. Put the code on GitHub

Use **your own** GitHub account.

```bash
cd ~/Desktop/ashaadeep
git init
git add .
git commit -m "Asha Deep Adarsh school portal"
```

Create an empty repository on GitHub (no README, no .gitignore — you already
have one), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/ashaadeep.git
git branch -M main
git push -u origin main
```

**Check before pushing** that your keys are not going up:

```bash
git status --short | grep -i env     # should print nothing except .env.example
```

`.env` is gitignored. If it ever appears in `git status`, stop and fix the
ignore file before committing.

---

## 2. Deploy the website

### Netlify (simplest)

1. [netlify.com](https://netlify.com) → **Add new site → Import an existing project**
2. Pick your GitHub repository
3. Settings (it usually detects these):
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Site configuration → Environment variables**, add both:
   ```
   VITE_SUPABASE_URL        https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_ANON_KEY   (your anon key)
   ```
5. **Deploy**

Without step 4 the live site falls back to demo data — the build has no access
to your local `.env`.

### Vercel

Same flow at [vercel.com](https://vercel.com). Framework preset **Vite**, and
add the same two environment variables under **Settings → Environment Variables**.

`vercel.json` and `public/_headers` already configure the routing, the caching
and the APK's content type, so there is nothing else to set.

---

## 3. Point your domain at it

In Netlify: **Domain management → Add a domain you already own**. It will give
you either a CNAME or two A records to set at your registrar (GoDaddy, Hostinger,
BigRock, wherever the domain was bought). DNS usually propagates within an hour.

HTTPS is issued automatically and free. Do not skip it — the site carries student
data and a login.

---

## 4. Add your Supabase project's live URL

Once the site has a real address, tell Supabase about it so authentication
redirects are accepted:

**Supabase → Authentication → URL Configuration**

- Site URL: `https://yourdomain.com`
- Redirect URLs: add `https://yourdomain.com/**`

---

## 5. Create the teacher accounts

Nothing can be done in the dashboard until at least one exists.

**Supabase → Authentication → Users → Add user.** Enter the email and a starting
password and **tick Auto Confirm User**.

Make the principal an administrator:

```sql
update public.profiles
   set role = 'admin', full_name = 'Principal name'
 where id = (select id from auth.users where email = 'principal@yourschool.in');
```

---

## 6. Check it from a phone

- Open the site on mobile data, not school wifi
- Check a result
- Download the app from `/app` and install it
- Sign in with a teacher account and save one mark
- Confirm that mark appears on the website

---

## 7. After launch

| When | What |
|---|---|
| Weekly at first | Supabase → Database → check size and any errors |
| Each term | Take a backup — Database → Backups, or export the register as CSV |
| When the app changes | `npm run apk`, copy into `public/downloads/`, bump `app-info.json`, redeploy |

---

## Known, and deliberately left for later

These are recorded so nobody discovers them by surprise:

1. **Online fee payment is not verified by a bank.** The "I have completed the
   payment" button marks the fee as paid on the payer's word, which also
   unlocks that student's marksheet. Anyone who knows a roll number and class
   can do this without paying. This closes when Razorpay or Cashfree is wired
   in — see README section 9.
2. **The content is still placeholder.** Phone number, email, UPI ID, school
   code, affiliation number, the eight staff names and the nine campus photos
   are all stand-ins. They live in `src/data/school.js`.
3. **The demo students are still in the live database** (AMAN VERMA and the
   rest). Clear them with:
   ```sql
   delete from public.students where admission_no like 'STU-10%';
   ```
   then import the real register — DATABASE.md section 9.
4. **No privacy policy page.** Worth adding before the app goes to the Play
   Store, and good practice now, since the site handles children's data.
