# Steel PM Multi-Project Tracker

Lightweight multi-project tracker for structural steel fabrication & erection PMs.

## Data model

Tracker data lives in real per-record Postgres tables (`migrations/0003_entities.sql`) —
one table per entity (`projects`, `work_packages`, `drawing_sets`, `drawing_sheets`,
`fab_items`, `deliveries`, `install_items`, `rfis`, `change_orders`, `roadblocks`, `tasks`).
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
