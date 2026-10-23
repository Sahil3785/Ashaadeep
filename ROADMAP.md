# Roadmap — from one school's portal to a school SaaS

What exists today is a solid single-school system: public website, staff
dashboard, Android staff app, one Supabase database with row-level security,
an activity log, and (as of `006_fee_ledger.sql`) a month-wise fee ledger.

To sell it to many schools, work through the list below roughly in order.
Each item says *why* it matters, so priorities can be argued with.

---

## 1. Foundations for SaaS (do these before the second school)

| # | Item | Why |
|---|---|---|
| 1.1 | **Multi-tenancy**: a `schools` table and `school_id` on every row, every policy filtered by the caller's school, school chosen by sub-domain (`ashadeep.yourapp.in`) | Today the database *is* one school. Every query, policy and report needs a tenant boundary, and it is far cheaper to add before there is a second school's data. |
| 1.2 | **School settings in the database**, not `src/data/school.js`: name, logo, address, UPI ID, session, classes, subjects, houses, receipt prefix | Each school must be configured from an admin screen, without a rebuild. |
| 1.3 | **Roles beyond teacher/admin**: owner, principal, accountant, class teacher, subject teacher, front office; per-class permissions | An accountant should collect fees without editing marks; a subject teacher should only enter their subject. |
| 1.4 | **Automated tests + CI**: SQL tests for every policy and fee function (the PGlite approach used to verify 006 works well), component tests, a GitHub Action that builds the site and the APK | Money and marksheets — regressions must be caught before a school sees them. |
| 1.5 | **Backups and restore drills**: Supabase Pro (daily backups + PITR), plus a weekly export to the school's own Google Drive | The free plan has no backups. |
| 1.6 | **Error and uptime monitoring**: Sentry for the site and the app, an uptime ping, a status page | Find out before the principal phones. |
| 1.7 | **Billing for the SaaS itself**: plans by student count, trial, invoices, suspension | How the product earns. |
| 1.8 | **Legal**: privacy policy, terms, data-processing agreement, India's DPDP Act 2023 (children's data needs verifiable parental consent) | Required to sign schools. |

## 2. Money (finish the fee module)

| # | Item |
|---|---|
| 2.1 | **Payment gateway** (Razorpay / Cashfree): order created server-side in an Edge Function, webhook verifies the signature and calls the existing verification path; parents get an instant receipt. The `gateway` / `gateway_payment_id` columns already exist. |
| 2.2 | **Automatic late fine** after the due day, with a grace period and a cap, as generated due lines. |
| 2.3 | **Sibling linking** so one payment can cover two children, and the sibling concession is applied automatically. |
| 2.4 | **Advance / credit balance** when a parent pays more than is due, and refunds. |
| 2.5 | **Quarterly / instalment plans** in addition to monthly. |
| 2.6 | **Session rollover**: copy the rate card to the next year, carry unpaid balances forward as arrears. |
| 2.7 | **Accounts exports**: Tally-compatible export, GST where applicable, expense entry, cash-book closing per day. |
| 2.8 | **Automatic reminders**: SMS / WhatsApp Business API on the due day and after, instead of one-by-one WhatsApp links. |

## 3. Academic and daily-use modules

| # | Item |
|---|---|
| 3.1 | **Attendance** — daily, per class, from the app in one screen; absence SMS to parents; monthly register PDF. |
| 3.2 | **Parent app / parent login** — attendance, fees, results, homework, notices for their own children only. |
| 3.3 | **Report cards** — CBSE/HBSE formats, co-scholastic grades, remarks, rank, bulk PDF for a class. |
| 3.4 | **Promotion** — move a whole class to the next one at session end, with roll re-numbering. |
| 3.5 | **Certificates** — TC, bonafide, character certificate with serial numbers. |
| 3.6 | **Timetable and substitutions**. |
| 3.7 | **Homework / diary** with attachments. |
| 3.8 | **Admissions pipeline** — enquiry → application → test → admitted → enrolled, with the admission fee charged on enrolment. |
| 3.9 | **Staff** — staff attendance, leave, payroll. |
| 3.10 | **Transport** — routes, stops, vehicle and driver, route fare feeding the fee ledger. |
| 3.11 | **Bulk import** — the register from Excel with validation and a preview, not the Supabase table editor. |

## 4. Scale and quality

| # | Item |
|---|---|
| 4.1 | **Paginate and filter on the server**. The register and marks are loaded whole into each browser; fine for hundreds of students, not for 5,000. Search, class filters and reports should query the database. |
| 4.2 | **Realtime**: Supabase Realtime subscriptions so a payment taken at the counter appears on every open dashboard at once. |
| 4.3 | **Conflict handling in the offline outbox**: today the last write wins; show the teacher when their offline change was overwritten. |
| 4.4 | **Hindi interface** (and other regional languages) — many parents and some staff will prefer it. |
| 4.5 | **Accessibility and performance budgets** checked in CI (Lighthouse). |
| 4.6 | **Play Store release** of the staff app with signed builds and in-app update prompts, instead of a sideloaded APK. |

---

## Done in this round

- Typing fixes on Android: name fields no longer rewrite every keystroke
  (Backspace works again), number fields are text inputs with a numeric
  keypad (they can be cleared, and no longer change on mouse-wheel scroll).
- Enrolment no longer reports success when the roll number was a duplicate.
- Month-wise fee ledger end to end: setup, generated dues, counter
  collection with part payments, sequential receipts (print / PDF /
  WhatsApp), cancellation with reasons, online UPI reporting by parents with
  office verification, day book, defaulters with reminders, class-wise
  collection summary — on the website dashboard, the public fees page and
  the Android app, in both connected and demo mode.
