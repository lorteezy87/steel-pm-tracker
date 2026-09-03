# Relational data model + real auth upgrade — implementation spec

## Context
This app currently stores ALL tracker data as one JSONB blob in `pm_workspace`
(see `src/routes/api/pm/workspace.ts`, `src/lib/pm/sync.ts`, `src/lib/pm/snapshot.ts`),
synced wholesale to/from a client-side Zustand store (`src/lib/pm/store.ts`).
Auth (`src/lib/auth/*`) is Better Auth, pre-wired for a "Grok" OAuth broker plus
an email/password toggle that is currently OFF (`src/lib/auth/email-password.ts`
→ `emailAndPasswordEnabled = false`).

## Goal
1. Replace the single-blob sync with real per-record Postgres tables, one per
   tracker entity, with proper CRUD endpoints.
2. Turn on real login (email/password) so this works standalone without the
   Grok broker.
3. Add two new first-class trackers: **Work Packages** and **Roadblocks**.
4. Wire the 48h/10d lookahead views and KPI board to include the new trackers.

## IMPORTANT deviation from the repo's default multi-tenant template guidance
`migrations/0001_auth.sql`'s comment says to give per-user tables a `user_id`
column and scope every query to the authenticated user. **Do NOT do that here.**
This is a single-company internal tool (S&H Steel) — every signed-in user should
see and edit the SAME shared set of projects/records (like the current shared
`pm_workspace`). Use `created_by` / `updated_by` columns (referencing `"user"(id)`)
for audit trail only, NOT for filtering visibility. Every mutation must still
require a signed-in session via `authMiddleware` (no anonymous writes), but reads
and writes are NOT siloed per user.

## New migration: `migrations/0003_entities.sql`
Create these tables (snake_case, `id text primary key`, ids via the existing
`newId(prefix)` helper pattern generated server-side or client-side consistent
with current code, add `created_by text references "user"(id)`,
`updated_by text references "user"(id)`, `created_at timestamptz not null default now()`,
`updated_at timestamptz not null default now()` to every table, index every
`project_id` / `work_package_id` foreign key and every `status` and date-due column
used by lookahead queries):

- `projects` (id, code unique, name, client, status, start_date, target_complete, owner, notes)
- `work_packages` NEW (id, project_id fk, code, name, description, status, planned_start,
  planned_complete, tonnage numeric, owner, notes) — unique (project_id, code)
- `drawing_sets` (id, project_id fk, name, type, description, submitted date,
  required_by date, status, ball_in_court, owner, notes) — this is the submittals tracker
- `drawing_sheets` (id, set_id fk -> drawing_sets, number_rev, description, submitted date,
  required_by date, status, ball_in_court, notes)
- `fab_items` (id, project_id fk, work_package_id fk nullable -> work_packages, description,
  qty int, weight_tons numeric, drawing_ref, status, pct_complete int, shop, planned_date date, owner, notes)
- `deliveries` (id, project_id fk, work_package_id fk nullable, load_number, piece_marks,
  planned_ship date, actual_ship date, planned_arrival date, actual_arrival date, status,
  destination, owner, notes)
- `install_items` (erection) (id, project_id fk, work_package_id fk nullable, sequence_area,
  piece_marks, planned_erect date, status, pct_complete int, crew, owner, notes)
- `rfis` (id, project_id fk, rfi_number, subject, issued date, response_due date, status,
  ball_in_court, impact, linked_drawing, notes)
- `change_orders` (id, project_id fk, co_number, description, linked, cost numeric,
  schedule_days int, status, owner, notes)
- `roadblocks` NEW (id, project_id fk, title, category text, description, raised_date date,
  ball_in_court, impact text, severity text, status text default 'Open', resolved_date date,
  linked_entity_type text, linked_entity_id text, owner, notes)
- `tasks` (id, project_id fk, task, category, owner, due date, status, priority, notes)

Leave `pm_workspace` in place untouched (unused going forward, harmless).

## App-layer changes
1. **Types** (`src/lib/pm/types.ts`): add `WorkPackage` and `Roadblock` interfaces;
   add optional `workPackageId?: string` to `FabItem`, `Delivery`, `InstallItem`.
2. **Constants** (`src/lib/pm/constants.ts`): add `WORK_PACKAGE_STATUSES`,
   `ROADBLOCK_CATEGORIES` (Drawings/Fabrication/Delivery/Installation/RFI/ChangeOrder/
   Procurement/Safety/Other), `ROADBLOCK_IMPACTS` (Schedule/Cost/Safety/Quality/Other),
   `ROADBLOCK_STATUSES` (Open/Resolved). Add nav items for `/work-packages` and
   `/roadblocks` to `NAV_ITEMS`.
3. **Server layer**: build real CRUD endpoints per entity (list/create/update/delete),
   protected by `authMiddleware` (see `src/lib/auth/middleware.ts`), reading/writing the
   new tables via `getSql()` (see `src/lib/db.ts` — works against both Neon/Postgres and
   the local PGLite fallback automatically, no code branching needed). Prefer
   `createServerFn` (TanStack Start), one file per entity under e.g. `src/lib/pm/api/`.
   Stamp `created_by`/`updated_by` from `context.userId` on writes.
4. **Client data layer**: replace the single blob push/pull (`sync.ts`,
   `routes/api/pm/workspace.ts`) as the source of truth. Each tracker's add/update/delete
   in `store.ts` should call its entity's server function directly and update local
   Zustand state from the real server response (optimistic UI is fine, but the source of
   truth after any mutation must be the per-record table, not a blob). Load each entity
   list on app/router load.
5. **One-time import**: keep (or add if missing) a JSON import path so Nick can paste in
   any existing localStorage-persisted snapshot (current export/import JSON backup
   feature mentioned in README's Team Access page) and have it inserted into the new
   per-entity tables on first use, so no locally-tested data is lost.
6. **New routes**: `/work-packages` and `/roadblocks`, following the exact UI pattern of
   `src/routes/rfis.tsx` (AppShell, ProjectFilter, CrudDialog + FormFieldDef, DataTable,
   StatusBadge, CompleteCheck/ShowCompletedToggle, RowActions/AddButton). Roadblocks should
   support optionally linking to an existing RFI/CO/drawing set via a simple text or
   select-by-id field (`linked_entity_type` + `linked_entity_id`); keep it simple (free
   text linked-record identifier is fine, no need for a full relational picker).
7. **Lookahead + KPI**: update whatever currently computes `LookaheadItem[]` /
   `KpiSnapshot` (see `types.ts` `LookaheadEntityType`, `TrackerName`, `KpiSnapshot`, and
   wherever `lookahead-48h.tsx` / `lookahead-10d.tsx` / `kpi-board.tsx` source their rows)
   to also include: open roadblocks (due = `resolved_date` target if set, else flag as
   "no target date"; still surface as needing attention) and work packages with
   `planned_start`/`planned_complete` inside the window. Add `openRoadblocks` /
   `overdueRoadblocks` to `KpiSnapshot`.
8. **Auth**: flip `emailAndPasswordEnabled = true` in `src/lib/auth/email-password.ts`.
   Check `src/routes/login.tsx` — add/confirm working email/password sign-up + sign-in
   forms using `authClient.signUp.email` / `authClient.signIn.email` from
   `src/lib/auth/client.ts` (per the comment in `email-password.ts`), so login works
   without any Grok broker credentials configured. Leave the existing OAuth broker
   buttons in place (harmless no-ops when `GROK_AUTH_*` env vars aren't set).
9. **README**: update deploy instructions — real Postgres via `DATABASE_URL`,
   `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `VITE_AUTH_ENABLED=true`; email/password login
   works out of the box once `emailAndPasswordEnabled = true`.

## Validation before opening the PR
Run `npm install`, `npm run typecheck`, `npm run lint`, and `npm run build` (build runs
against the PGLite fallback when `DATABASE_URL` is unset — fine for this check). Fix any
errors. Optionally smoke-test `npm run dev` and hit a couple of the new/changed routes.

## Git workflow
Work in this cloned copy of `lorteezy87/steel-pm-tracker`. Create a new branch off
`main` (e.g. `feature/relational-data-and-roadblocks`), commit with clear messages,
push the branch, and open a PR against `main` via `gh pr create` with a summary of the
schema + feature changes. Do NOT merge — Nick reviews and merges himself.
