# Steel PM Multi-Project Tracker

Multi-project tracker for structural steel fabrication & erection PMs, covering the
full chain — **detailing → submittals → fabrication → delivery → installation** —
alongside the paperwork that gates it (RFIs, change orders, roadblocks).

## The five planner views

The floating pill nav in the header carries the day-to-day surfaces. Every one of
them reads from the same tracker records — there is no separate "planner" data to
keep in step.

| View | What it answers |
| --- | --- |
| **Today** (`/daily`) | What is on the board this morning / afternoon / evening, what is past due (with one-tap push to tomorrow), and what is sitting in *our* court |
| **Timeline** (`/timeline`) | The same day on a clock, with overlapping items in side-by-side lanes and the unbooked stretches called out |
| **Planner** (`/planner`) | A year of month grids with ISO week numbers and one dot per tracker per day — where the pressure is, months out |
| **Journal** (`/journal`) | Daily erection log: crew, man-hours, tons set, weather, delays — the record a delay claim or time-impact CO gets built from |
| **Lists** (`/lists`) | Every open item, sliced by project or by smart list, grouped by tracker |

Behind the chevron sits the second row — **Smart Lists**, **Inbox**, **Notes**,
**Tags** — plus global **Search**.

| View | What it answers |
| --- | --- |
| **Smart Lists** (`/smart-lists`) | In Progress · Overdue · Due Today · This Week · Next 4 Weeks · Undated · Ball in Our Court · Waiting on Others · Revise & Resubmit. All derived — nothing to maintain |
| **Inbox** (`/inbox`) | Zero-friction field capture. No project or date required; triage later into a task or a filed note |
| **Notes** (`/notes`) | Meeting and coordination notes, pinnable |
| **Tags** (`/tags`) | Cut across trackers by what the issue *is* — "Grid C" pulls the RFI, the submittal and the field note into one view |
| **Search** (`/search`) | Every tracker at once, including tag names |

`Undated` deserves a note: `buildLookahead` only emits records that HAVE a
date, so anything with a blank date field was invisible on every view. That is
exactly the pile that rots, so `smart-lists.ts` does a second pass
(`buildUndated`) to surface it.

**Ball in Our Court / Waiting on Others** key off an explicit `ballInCourt`
field on each lookahead item, NOT the `owner` column. `owner` means different
things per tracker — a counterparty on RFIs and submittals, but our own crew on
fab, delivery, install and tasks — so keying on it would report every job Nick
is assigned as "waiting on others". Execution trackers carry an empty
`ballInCourt` and are correctly absent from both lists.

Nothing in the tracker carries a time of day — a delivery has a date, not a 7:15 AM.
Rather than make every row key in a meaningless time, each event kind gets the slot it
actually occupies in a steel PM's day (trucks out at first light, crew on steel all
morning, reviews midday, office follow-up in the afternoon). See
`src/lib/pm/day-plan.ts`.

## Trackers

Detailing (drawing sets → sheets), **Submittals**, Work Packages, Fabrication,
Delivery, Installation, RFIs, Change Orders, Roadblocks, Tasks, the **Field
Journal**, and **Notes**. Each has its own page with full CRUD under
`src/routes/`.

**Notes back three surfaces from one table** — Inbox (untriaged), journal
moments (dated) and Notes (all of them) are the same record seen from different
angles. `notes.project_id` is deliberately nullable, unlike every other entity:
a capture made on the deck often isn't attached to a job yet, and forcing a
project at capture time is the friction that stops things getting written down.

**Tags** hang on any record through a polymorphic `entity_tags` join, and are
applied from the row surfaces (Lists, Notes, Journal) rather than from the CRUD
dialogs — you tag things while reading the board, not while filling a form.

**Submittals vs. Detailing** are deliberately separate trackers: a drawing set tracks
the detailing deliverable sheet by sheet, while a submittal is the contractual
transmittal that carries a package to the GC/EOR and comes back stamped (spec section,
revision, due back, ball in court). `linkedDrawingSet` ties the two together. A
submittal returned **Revise & Resubmit** stays on the open list — it is back in our
court and still gating release to the shop.

Change orders carry `submitted` and `decisionDue` dates so they appear on the schedule
like everything else; an undecided CO past its decision date flags red.

## Data model

Tracker data lives in real per-record Postgres tables (`migrations/0003_entities.sql`) —
one table per entity (`projects`, `work_packages`, `drawing_sets`, `drawing_sheets`,
`fab_items`, `deliveries`, `install_items`, `rfis`, `change_orders`, `roadblocks`,
`tasks`, `submittals`, `journal_entries`, `notes`, `tags`, `entity_tags`).
This is a **shared, single-company tool** (S&H Steel): every signed-in user reads and
writes the SAME shared rows — there is no per-user data isolation. `created_by` /
`updated_by` columns exist for audit trail only.

The legacy `pm_workspace` JSONB blob table (`migrations/0002_pm_workspace.sql`) is left in
place but unused going forward.

## Auth

Real email/password sign-up and sign-in are enabled out of the box
(`src/lib/auth/email-password.ts` → `emailAndPasswordEnabled = true`) — no Grok OAuth
broker credentials required to use the app standalone. The OAuth broker buttons stay in
the sign-in page and are harmless no-ops when `GROK_AUTH_*` env vars aren't configured.
Every write to the shared workspace requires a signed-in session (`authMiddleware`);
reads stay open so the tracker keeps working without an account, matching prior behavior.

## Deploy

1. Deploy this app (Vercel recommended — TanStack Start + Nitro `vercel` preset).
2. Set a real Postgres `DATABASE_URL` (e.g. Neon) so data and accounts persist —
   `migrations/*.sql` apply automatically on build/startup.
3. Set `BETTER_AUTH_SECRET` (any long random string) and `BETTER_AUTH_URL` (your deployed
   origin) so sessions work correctly across restarts and requests.
4. Set `VITE_AUTH_ENABLED=true` so sign-in is enforced (this is also the default).
5. Open the **same production URL** on every shop laptop / phone; everyone signs in with
   email/password (or an OAuth broker provider, if configured) and sees the same shared
   projects, work packages, drawings, fab, RFIs, roadblocks, and calendar to-dos.

## Local

```bash
npm install
npm run dev   # 0.0.0.0:8080
```

No `DATABASE_URL` is required locally — the app falls back to an embedded PGLite
(Postgres-in-WASM) database that runs the same migrations automatically.

## Multi-device access

1. In-app: **Team Access** page → copy link, export/import JSON backup.
2. Data syncs through `/api/pm/workspace` (backed by the relational tables above),
   plus per-entity CRUD endpoints under `src/lib/pm/api/*` for new code paths.
3. **Import**: paste/upload a previously exported JSON snapshot on the Team Access page
   to bulk-load it into the relational tables (useful for migrating any locally-tested
   data — see `src/lib/pm/sync.ts`'s `importSnapshotJson`).
