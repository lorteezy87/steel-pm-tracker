# Steel PM Planner

A day planner for structural steel PMs — detailing, submittals, fabrication,
delivery and erection on one board, alongside the paperwork that gates them
(RFIs, change orders, roadblocks).

**This is a separate app.** It does not import from, extend, or depend on the
tracker at the repository root. It has its own `package.json`, its own build,
and its own deploy. The root app keeps working exactly as it did; this one can
be deployed beside it, or split into its own repository with a single
`git filter-repo`/copy, without touching it.

## Running it

```bash
cd apps/planner
npm ci        # uses the committed lockfile — see "Dependencies" below
npm run dev   # 0.0.0.0:8080
```

No `DATABASE_URL` is needed locally; the app falls back to embedded PGLite
(Postgres-in-WASM) and applies `migrations/*.sql` on startup.

## How it's put together

The defining difference from the root tracker is that **there is no permanent
navigation rail**. The planner views are what a PM reads all day, so they get
the full width:

- A floating **nav pill** is the only persistent chrome — Today · Timeline ·
  Planner · Journal · Lists, with a chevron to the second row (Smart Lists ·
  Inbox · Notes · Tags) and a search button.
- The record-level trackers live in the **command panel**, a slide-over opened
  from the button at the pill's left edge, grouped Workflow / Commercial /
  Planning / Overview.
- `/` is **Today**, not a dashboard. The KPI board moved to `/dashboard`.

`AppShell` keeps the same `{ title, subtitle, actions, children }` contract the
tracker pages were written against, so those pages render inside the new chrome
unchanged — the shell swap is a single seam rather than a rewrite of 15 pages.

## Sharing a database with the root app

Both apps point at the same `DATABASE_URL` and the same schema, so data entered
in one shows up in the other. The **repo-root `migrations/` is canonical**; the
copy in this app exists only because Vite resolves
`import.meta.glob("/migrations/*.sql")` against the app root (see
`src/lib/db.ts`), so the files have to sit inside the app.

To keep the two honest:

```bash
npm run check:migrations   # fails on drift; runs as part of `npm run build`
npm run sync:migrations    # copies the canonical files over
```

Migrations are idempotent and recorded by filename in `_migrations`, so
whichever app starts first applies them and the other no-ops.

## Dependencies

`package-lock.json` is a copy of the root app's, deliberately. A fresh
unpinned `npm install` resolves a newer `better-auth` whose client plugin
exports moved, which breaks the build — so install with `npm ci`, not
`npm install`, and bump the two apps together.

## Deploying

Vercel (TanStack Start + Nitro `vercel` preset): create a project whose **root
directory** is `apps/planner`, then set `DATABASE_URL`, `BETTER_AUTH_SECRET`
and `BETTER_AUTH_URL` (the deployed origin). Point it at the same database as
the root app to share data, or a different one to run it standalone.

## Note on writes

Every write requires a signed-in session. An unauthenticated edit is applied
optimistically and then **rolled back** when the server rejects it, which looks
like the change silently reverting — sign in first.
