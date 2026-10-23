# Asha Deep Adarsh High School — Web Portal

The public website and internal faculty dashboard for Asha Deep Adarsh High School,
Karhans (Panipat), Haryana.

Built with React 18, Vite 5, React Router 6 and Tailwind CSS 3.

---

## 1. Two apps, one codebase

| | Who it is for | Entry point |
|---|---|---|
| **Website** | Parents and the public — results, fees, admissions, syllabus | `index.html` → `src/App.jsx` |
| **Android app** | Teaching staff only — marks, enrolment, the register | `appshell/index.html` → `src/faculty/` |

They share the data, grading, validation and state layer, so the rules can
never drift apart. The APK contains only the faculty screens — none of the
public pages are bundled into it.

**Guides**
- [RUN.md](RUN.md) — every command, and what each one does
- [DATABASE.md](DATABASE.md) — Supabase setup, security model, teacher accounts
- [ANDROID.md](ANDROID.md) — building, testing and distributing the APK
- [DEPLOY.md](DEPLOY.md) — going live, and what is knowingly left for later

**Two run modes.** With `.env` configured the apps share one Supabase database;
without it they fall back to on-device demo data, so the project always runs.

---

## 2. Running it

```bash
npm install      # once
npm run dev      # development server on http://localhost:3000
npm run build    # production build into dist/
npm run preview  # serve the production build locally

npm run dev:app  # faculty app in a browser (port 3100)
npm run apk      # build the Android APK — see ANDROID.md
```

**Demo credentials** — the faculty PIN is `ASHA2026`. It is published openly because
this is a demonstration build; see section 8 before deploying for real.

---

## 3. What the site contains

| Route | Page | Purpose |
|---|---|---|
| `/` | Home | Hero, statistics, facilities, principal's note, gallery preview, events, houses, testimonials |
| `/results` | Results | Search a marksheet by roll number + name, print or export to PDF |
| `/fees` | Fee payment | Parent sees the child's month-wise dues → ticks months → UPI QR → enters UTR → acknowledgement (office verifies) |
| `/about` | About | Mission, timeline of milestones, houses, infrastructure |
| `/academics` | Academics | The four teaching stages, support systems, daily timetable |
| `/syllabus` | Syllabus | Chapter-wise NCERT blueprint, searchable, per class |
| `/faculty` | Faculty | Leadership and department heads |
| `/gallery` | Gallery | Filterable photo grid with a keyboard-navigable lightbox |
| `/notices` | Notices & events | Searchable circulars plus the session calendar |
| `/achievements` | Achievements | Board result breakdown and year-by-year recognitions |
| `/admissions` | Admissions | Four-step process, document list, age criteria, enquiry form |
| `/contact` | Contact | Contact cards, message form, timings, bus routes, directions |
| `/faq` | FAQ | Ten common questions in a searchable accordion |
| `/faculty-dashboard` | Faculty dashboard | **Sign-in required.** Overview, marks entry, enrolment, student register, and the fee desk (collect month-wise, verify online payments, day book, defaulters, rate setup) |
| `/app` | Staff app | Download the Android APK, install steps, staff FAQ |
| `*` | 404 | Shows the attempted path and offers the pages people actually want |

Legacy aliases `/result`, `/fee`, `/campus` and `/teacher` redirect to their
current equivalents so older links keep working.

---

## 4. Folder layout

```
src/
├── main.jsx                 Entry point — mounts ErrorBoundary > BrowserRouter > App
├── App.jsx                  Route table, lazy page loading, boot splash, shell layout
├── index.css                Design tokens, background layers, component classes, skeletons
│
├── data/
│   ├── school.js            School identity, staff, gallery, notices, events, fees, FAQ
│   ├── academics.js         Seed student records and marks
│   └── syllabus.js          Chapter blueprints + grading maths (calculateGrade, summarise)
│
├── context/
│   └── SchoolContext.jsx    All application state and the actions that change it
│
├── hooks/
│   └── index.js             useLocalState, useReveal, useCountUp, useDelay, useScrollLock,
│                            useEscape, useFocusTrap, useScrollProgress, useMediaQuery, useCopy
│
├── utils/
│   ├── format.js            Currency, dates, UPI links, ID generation, validation
│   └── pdf.js               Lazy-loaded PDF export and confetti
│
├── components/
│   ├── Background.jsx       The four fixed decorative layers + constellation canvas
│   ├── Header.jsx           Credential ribbon, nav bar, "More" dropdown, mobile drawer
│   ├── Footer.jsx           Identity, link columns, contact details
│   ├── NoticeTicker.jsx     Pausable scrolling notice strip
│   ├── UI.jsx               Reveal, SectionHeader, PageHeader, StatTile, Modal, Accordion,
│   │                        Badge, ProgressBar, Tabs
│   ├── Loaders.jsx          Skeletons, Spinner, SplashScreen, RouteLoader, EmptyState
│   ├── Toasts.jsx           Bottom-right notification stack
│   ├── PinModal.jsx         Eight-box faculty PIN entry
│   ├── ProtectedRoute.jsx   Guards the faculty dashboard
│   ├── ScrollToTop.jsx      Route scroll reset + floating back-to-top button
│   └── ErrorBoundary.jsx    Catches render crashes, offers retry / reload / clear data
│
└── pages/                   One file per route (see the table above)
```

---

## 5. The design system

Everything is driven by three colour families defined in `tailwind.config.js`:

- **`ink`** — deep academic navy, used for text, the header crest and dark panels
- **`brass`** — the warm gold of the school crest, used for emphasis and primary actions
- **`garden`** — a green used for success states, paid fees and confirmations
- **`parchment`** — the warm off-white paper ground

Reusable classes live in `src/index.css` under `@layer components`:

| Class | Use |
|---|---|
| `.card` / `.card-lift` | Standard surface; `-lift` adds hover elevation |
| `.panel` / `.panel-brass` | Larger surfaces; `-brass` adds the gold sheen |
| `.field` / `.field-label` / `.field-error` | Form inputs |
| `.btn-primary` / `.btn-ink` / `.btn-garden` / `.btn-ghost` / `.btn-danger` | Buttons |
| `.chip-brass` / `.chip-garden` / `.chip-ink` / `.chip-rose` | Small status pills |
| `.eyebrow` / `.h-section` / `.h-page` / `.lead` | Section typography |
| `.skeleton` | Shimmering loading placeholder |
| `.reveal` + `.is-visible` | Scroll-triggered entry animation |
| `.document` | White paper surface for marksheets and receipts |

---

## 6. How the background is built

Four fixed layers in `Background.jsx`, all `pointer-events: none` so they can never
swallow a click:

1. **`.bg-wash`** — radial colour washes (brass top-left, blue top-right, green bottom)
2. **`.bg-grid`** — a faint engineering grid, edge-masked so it reads as texture
3. **`.bg-blob`** ×3 — slowly drifting blurred colour orbs
4. **`Constellation`** — a canvas of drifting dots joined by faint lines
   (desktop only, skipped under reduced motion, paused when the tab is hidden)
5. **`.bg-grain`** — subtle paper noise over the top

---

## 7. Loading and animation

- **Splash screen** — shown once per browser session while fonts settle. Minimum
  1.1s so it never flashes, hard cap 2.6s so a slow font request cannot stall the site.
- **Route transitions** — a brass progress bar across the top, plus a fade-up on the
  page wrapper keyed to the pathname.
- **Code splitting** — only Home loads eagerly. Every other page is a lazy chunk with
  `RouteLoader` as the Suspense fallback. jsPDF and html2canvas (≈560 KB together)
  are imported dynamically and only download when somebody exports a PDF.
- **Skeletons** — each page uses `useDelay` to simulate the round-trip a real backend
  would add, so the skeleton shapes genuinely cover a wait rather than decorating one.
- **Scroll reveal** — `useReveal` adds `.is-visible` via IntersectionObserver, once
  per element.
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` disables decorative
  animation, the constellation canvas and the count-up counters.

---

## 8. Where the data lives

There is no backend. All records persist in `localStorage` under these keys:

Once Supabase is configured (see [DATABASE.md](DATABASE.md)) the register,
marks, fees and enquiries live in Postgres and are shared by the website and
every teacher's phone. The keys below are then only a local cache plus the
offline queue.

| Key | Contents |
|---|---|
| `ada.students.v2` | The student register (cache) |
| `ada.marks.v2` | All mark entries (cache) |
| `ada.outbox.v1` | Changes saved while offline, waiting to upload |
| `ada.auth` | The signed-in teacher's session |
| `ada.payments.v2` | Fee payments logged this browser |
| `ada.enquiries.v2` | Admission enquiries submitted |
| `ada.booted` | *(sessionStorage)* whether the splash has already played |
| `ada.teacher` | *(sessionStorage)* faculty session — survives a refresh, ends when the browser closes |

Reads are wrapped in `try/catch` in `useLocalState`, so corrupt or blocked storage
falls back to the seed data instead of blanking the app. The faculty dashboard has a
**Reset data** button that restores the original demo records.

---

## 9. Before deploying for real

Once [DATABASE.md](DATABASE.md) is followed, the first two items below are
already solved. What remains:

1. **Replace the placeholder content.** The Unsplash photographs in
   `src/data/school.js`, the sample staff names, and the affiliation and
   school-code numbers are all stand-ins. Swap them for the real ones.
2. **Point the UPI payment at a real gateway.** Online payments are
   reported by the parent (with the UTR) and verified by the office against
   the bank statement. A gateway (Razorpay or Cashfree) would let the bank
   confirm them automatically; the ledger already has the columns and the
   verification function for it. See [ROADMAP.md](ROADMAP.md).
3. **Online payment reports are open to the public** by design, so parents
   need no login. They go through `submit_fee_payment()`, which validates the
   amount and UTR, refuses a repeated UTR and caps waiting claims per student;
   none of them clears dues until staff verify it.
4. **Take backups.** The free plan has none automatically — see DATABASE.md
   section 8.

---

## 10. Accessibility notes

- Skip-to-content link as the first focusable element
- Visible focus rings on every interactive element (`:focus-visible`)
- Modals trap focus, close on Escape, and lock background scroll
- The notice ticker can be paused
- The gallery lightbox is navigable with arrow keys
- Form errors are announced next to their field and focus moves to the first problem
- Toast region is `aria-live="polite"`
- All decorative layers are `aria-hidden`
