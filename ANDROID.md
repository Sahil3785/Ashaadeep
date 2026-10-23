# Asha Deep Faculty — Android app

A separate Android app for teaching staff. It contains **only** the faculty
tools: PIN sign-in, the dashboard, marks entry, enrolment and the student
register. None of the public website — no admissions pages, no fee QR, no
gallery — is bundled into the APK.

The web app and the Android app share the same React source for data, grading
and validation, so the rules behave identically in both.

---

## 1. What a teacher can do in the app

| Screen | What it does |
|---|---|
| **Sign in** | Keypad PIN entry. The session survives a refresh and ends when the app is closed. |
| **Home** | Students on roll, fee-collection rate, mark-entry count, class-wise strength, and a list of students with fees outstanding — each with a one-tap call button. |
| **Marks** | Pick class → student → term → subject, enter theory and internal marks, save. Shows a live percentage preview and everything already recorded for that student and term, with per-subject delete. |
| **Students** | Searchable register, filterable by class and fee status. Tap a student for a detail sheet: toggle fee status, call or WhatsApp the guardian, edit details, or remove them. |
| **Enrol** | Add a new student. Roll number and name are required; the rest can follow later. Duplicate roll numbers within a class and section are rejected. |
| **More** | Session info, data counts, CSV export via Android's share sheet, restore demo data, school contact details, app version. |

Android specifics that are wired up: the hardware **back button** (closes an
open sheet, then returns to Home, then minimises the app rather than killing
it), **haptic feedback** on save and error, a **status bar** coloured to match
the app, and the **bottom navigation hiding while the keyboard is open** so it
never covers the field being typed into.

---

## 2. Building the APK

### One-time setup

The toolchain is already installed under your home folder — no admin rights
were needed and your system Java is untouched:

- **JDK 21 (Temurin)** → `~/Library/Java/JavaVirtualMachines/jdk-21*`
- **Android SDK** → `~/Library/Android/sdk` (platform 34, build-tools 34.0.0)

`android-env.sh` in the project root points at both.

### Every build

The APK needs the school database keys **before** you build: create `.env` in
the project root from `.env.example` (same values as the website). The keys are
baked in at build time, and the build stops with an error if they are missing —
otherwise the APK would fall back to the shared demo PIN instead of each
teacher's own email and password.

```bash
cd ~/Desktop/ashaadeep
source ./android-env.sh      # sets JAVA_HOME, ANDROID_HOME and PATH
npm run apk                  # build web → sync → assemble debug APK
```

The APK lands at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

### The individual steps

```bash
npm run build:app   # build only the faculty web bundle into dist-app/
npm run sync:app    # build + copy it into the Android project
npm run dev:app     # preview the app in a desktop browser on :3100
```

Use `npm run dev:app` for day-to-day UI work — it is far faster than
rebuilding the APK, and the whole app runs in the browser because every
native call degrades gracefully when Capacitor is absent.

---

## 3. Testing on an emulator

An emulator is already set up (`ada_test`, Pixel 6, Android 14 arm64):

```bash
source ./android-env.sh
emulator -avd ada_test -no-snapshot -no-audio &
adb wait-for-device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n in.ashadeepadarsh.faculty/.MainActivity
```

Useful while testing:

```bash
adb logcat -s Capacitor:D chromium:E   # app and web-view logs
adb shell input keyevent KEYCODE_BACK  # press the back button
adb shell screencap -p /sdcard/s.png && adb pull /sdcard/s.png
```

For day-to-day UI work `npm run dev:app` in a desktop browser is much faster;
use the emulator to check the native behaviour (back button, keyboard, status
bar, haptics).

---

## 4. Installing it on a phone

### Over USB

```bash
source ./android-env.sh
adb devices                 # enable USB debugging on the phone first
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### By hand

Copy `app-debug.apk` to the phone (WhatsApp, Drive, a cable — anything) and
open it. Android will ask permission to install from an unknown source,
because the APK is not from the Play Store. That prompt is expected.

---

## 5. Before giving this to staff

The debug APK is fine for trying out, but three things must change before real
use. These are not polish items — each one is a correctness or security issue.

### a. The PIN is checked inside the app

`verifyPin` in `src/context/SchoolContext.jsx` compares against
`SCHOOL.teacherPin`, which ships inside the APK. Anyone who unpacks the file
can read it, and the login screen currently prints it on purpose. Move the
check to a server before this protects anything real.

### b. Data lives only on each phone

Records are stored in the web view's `localStorage`. That means:

- marks entered in the app **do not appear on the school website**;
- two teachers' phones hold **separate, diverging** registers;
- uninstalling the app **erases everything** on that device.

For shared data you need a backend. Supabase or Firebase would suit this
well — one database, the app and website both reading from it, and a real
login per teacher instead of one shared PIN. That is a larger piece of work
and should be scoped deliberately.

Until then the app shows this limitation plainly on the More screen, and the
CSV export exists so a register can be rescued before a reinstall.

### c. A debug APK is not a release APK

Debug builds are signed with a throwaway key, are not optimised, and have web
view debugging switched on. For a build you hand out:

1. Create an upload key and keep it safe — losing it means you can never
   update the app:
   ```bash
   source ./android-env.sh
   keytool -genkey -v -keystore ashadeep.keystore \
     -alias ashadeep -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Reference it from `android/app/build.gradle` in a `signingConfigs` block.
3. Set `"webContentsDebuggingEnabled": false` in `capacitor.config.json`.
4. Build with `./gradlew assembleRelease`.

Keep the keystore and its passwords out of version control.

---

## 6. Project layout

```
appshell/index.html            HTML entry for the app build only
vite.config.app.js             Builds src/faculty/** into dist-app/
capacitor.config.json          App id, name, plugin settings
android/                       Generated Android project (Capacitor)
android-env.sh                 JDK + SDK environment

src/faculty/
├── main.jsx                   Entry point
├── App.jsx                    Splash → PIN gate → shell, back-button wiring
├── Login.jsx                  Keypad PIN screen
├── faculty.css                App-only styles (no website CSS is loaded)
├── native.js                  Capacitor plugins, each optional
├── dismissStack.js            Lets the back button close sheets
├── version.js                 APP_VERSION — bump this per build
├── components/
│   ├── Chrome.jsx             Screen, Card, Field, Btn, Pill, Sheet, StatBox
│   └── BottomNav.jsx          Bottom tab bar
└── screens/
    ├── Overview.jsx
    ├── Marks.jsx
    ├── Students.jsx
    ├── Enrol.jsx
    └── Settings.jsx
```

Shared with the website (single source of truth, so the two never disagree):
`src/context/SchoolContext.jsx`, `src/data/*`, `src/utils/format.js`,
`src/hooks/index.js`, `src/components/Toasts.jsx`, `src/components/ErrorBoundary.jsx`.

---

## 7. The app icon

The icon is generated from one file, `scripts/assets/app-icon.svg`:

```bash
npm install --no-save sharp     # only needed when regenerating
node scripts/gen-icons.mjs
```

That writes every density Android needs. Android actually wants **two**
separate icons and they are easy to get wrong:

- **Legacy** (`mipmap-<density>/ic_launcher.png`) — a plain square, used on
  Android 7.1 and older.
- **Adaptive** (`mipmap-anydpi-v26/ic_launcher.xml`) — a transparent
  foreground over a background colour, which the launcher masks into a
  circle, squircle or whatever shape the phone uses. Only the middle 72 of
  108 dp is guaranteed visible, so the artwork is scaled to 58% and centred.

**The trap:** Capacitor scaffolds its own `drawable-v24/ic_launcher_foreground.xml`.
Android prefers `drawable-v24` over `drawable` on API 24 and above, so that
file silently wins and your icon never appears on any modern phone. It has
been deleted here — if you ever re-run `npx cap add android`, delete it again.

After changing the icon, rebuild and check it on a real launcher rather than
trusting the file:

```bash
npm run apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 8. Changing things

| To change | Edit |
|---|---|
| The faculty PIN | `teacherPin` in `src/data/school.js` |
| School name, phone, address | `SCHOOL` in `src/data/school.js` |
| Class list, subjects, exam terms | `src/data/school.js` |
| Grading bands | `calculateGrade` in `src/data/syllabus.js` |
| App name on the home screen | `android/app/src/main/res/values/strings.xml` |
| App icon | `scripts/assets/app-icon.svg`, then run `node scripts/gen-icons.mjs` |
| Version shown in More | `src/faculty/version.js` and `versionName` in `android/app/build.gradle` |

After any change: `npm run apk`.

## Trying it in the emulator

```bash
./scripts/run-android.sh                 # boots AshaDeep_Phone, installs the APK, opens it
./scripts/run-android.sh some-other.apk
```

The virtual phone (Pixel 6, Android 14, arm64) was created with:

```bash
sdkmanager "emulator" "system-images;android-34;google_apis;arm64-v8a"
avdmanager create avd -n AshaDeep_Phone -k "system-images;android-34;google_apis;arm64-v8a" -d pixel_6
```
