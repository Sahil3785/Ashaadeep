# How to run everything

Quick reference. Full details are in [README.md](README.md),
[DATABASE.md](DATABASE.md) and [ANDROID.md](ANDROID.md).

---

## Every day — working on the website

```bash
cd ~/Desktop/ashaadeep
npm run dev
```

Opens on **http://localhost:3000** and reloads as you edit.

## Working on the Android app's screens

```bash
npm run dev:app
```

Opens on **http://localhost:3100**. This is the app running in a desktop
browser — far faster than rebuilding the APK. Use Chrome's device toolbar
(⌘⇧M) to see it at phone size.

---

## Checking the database is healthy

```bash
npm run check:db
```

Verifies the credentials, the tables, the security rules and the result
lookup. Run it whenever something looks wrong — it tells you which
migration is missing rather than leaving you guessing.

---

## Building for release

```bash
npm run build      # website  → dist/
npm run apk        # Android  → android/app/build/outputs/apk/debug/app-debug.apk
```

The APK build needs the Android toolchain on your PATH first:

```bash
source ./android-env.sh
npm run apk
```

### Publishing a new APK on the website

```bash
source ./android-env.sh
npm run apk
cp android/app/build/outputs/apk/debug/app-debug.apk public/downloads/AshaDeepFaculty.apk
npm run build
```

Then edit `public/downloads/app-info.json` to bump the version and date, so
the download page shows the right numbers.

---

## Putting the website online

The build output in `dist/` is a plain static site — any host will serve it.

**Netlify or Cloudflare Pages** (the `_redirects` file is already set up):

```
Build command:     npm run build
Publish directory: dist
```

**Vercel** (`vercel.json` is already set up):

```
Build command:     npm run build
Output directory:  dist
```

**Important:** add the two environment variables in your host's dashboard as
well, or the deployed site will fall back to demo mode:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Your local `.env` is never uploaded — it is gitignored on purpose.

---

## Creating teacher accounts

In the Supabase dashboard: **Authentication → Users → Add user**. Enter the
email and a starting password, and **tick Auto Confirm User**.

To make someone an administrator:

```sql
update public.profiles
   set role = 'admin', full_name = 'Satbir Singh Malik'
 where id = (select id from auth.users where email = 'principal@ashadeepadarsh.in');
```

When a teacher leaves, deactivate rather than delete, so the record of who
entered which marks survives:

```sql
update public.profiles set is_active = false
 where id = (select id from auth.users where email = 'leaver@ashadeepadarsh.in');
```

---

## Testing on an Android emulator

```bash
source ./android-env.sh
emulator -avd ada_test -no-snapshot -no-audio &
adb wait-for-device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n in.ashadeepadarsh.faculty/.MainActivity
```

---

## Every script, in one place

| Command | What it does |
|---|---|
| `npm run dev` | Website dev server, port 3000 |
| `npm run dev:app` | Faculty app in a browser, port 3100 |
| `npm run build` | Build the website into `dist/` |
| `npm run build:app` | Build the app bundle into `dist-app/` |
| `npm run preview` | Serve the built website locally |
| `npm run sync:app` | Build the app and copy it into the Android project |
| `npm run apk` | Build the Android APK |
| `npm run check:db` | Check the Supabase setup |

---

## If something breaks

| Symptom | Cause |
|---|---|
| Site shows demo data instead of your database | `.env` missing, or you did not rebuild after adding it. Run `npm run check:db`. |
| "Could not reach the school database" | Project paused (free plan pauses after 7 quiet days) — open the Supabase dashboard to wake it. |
| "That email and password do not match" | The account does not exist, or Auto Confirm was not ticked when creating it. |
| `./gradlew: command not found` | Run `source ./android-env.sh` first. |
| APK installs but shows demo mode | It was built before `.env` existed. Rebuild with `npm run apk`. |
