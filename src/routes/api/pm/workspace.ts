import { createFileRoute } from "@tanstack/react-router";
import { ensureDbReady } from "@/lib/db";
import { requireUserId } from "@/lib/auth/verify.server";
import { assertSameSiteRequest } from "@/lib/auth/isolation.server";
import { isPmSnapshot, type PmSnapshot, type WorkspaceResponse } from "@/lib/pm/snapshot";
import { importSnapshotGaps, readFullSnapshot } from "@/lib/pm/api/import";

/**
 * Shared workspace endpoint, backed by the per-record relational tables from
 * migrations/0003_entities.sql (`pm_workspace`, the old JSONB blob, is left
 * in place, unused).
 *
 * - **GET**: read-only convenience "load everything on startup" — assembles
 *   a `PmSnapshot` by listing every table. This is what `src/lib/pm/sync.ts`
 *   calls on page load and its periodic freshness poll. Every actual
 *   TRACKER EDIT (add/update/delete on any entity) goes straight to that
 *   entity's own `src/lib/pm/api/<entity>.ts` `createServerFn` the moment the
 *   user makes it (see `src/lib/pm/store.ts`) \u2014 NOT through this route. GET
 *   is intentionally left open (no session required) so browsing works
 *   before sign-in, matching prior behavior.
 * - **PUT**: a ONE-TIME, ADDITIVE import endpoint only \u2014 never a steady-state
 *   save path. It inserts any row from the client's snapshot whose id isn't
 *   already present server-side and never updates or deletes an existing
 *   row (see `src/lib/pm/api/import.ts`). Used for (a) first-run bootstrap
 *   from a browser's locally-persisted pre-upgrade data, and (b) the Team
 *   Access "Import JSON" backup feature. Because it never touches existing
 *   rows, two people importing/editing concurrently can't clobber each
 *   other here \u2014 unlike the old version of this endpoint, which did a
 *   `delete from <table>` + full reinsert of every table on every save.
 *   Requires a signed-in session, same as every other mutation.
 *
 * IMPORTANT: shared single-company tool, NOT per-user-isolated \u2014 see the
 * "IMPORTANT deviation" note in migrations/0003_entities.sql. Every
 * signed-in user reads/writes the SAME shared rows; `created_by`/`updated_by`
 * are audit trail only, never a visibility filter.
 */

export const Route = createFileRoute("/api/pm/workspace")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await ensureDbReady();
          const data = await readFullSnapshot();
          const total = Object.values(data).reduce(
            (sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0),
            0,
          );
          const body: WorkspaceResponse = {
            id: "default",
            // No single incrementing version column now that data lives across
            // many tables \u2014 total row count is a cheap "did anything change"
            // signal, informational only (nothing branches on it being exact).
            version: total,
            updatedAt: new Date().toISOString(),
            data: total > 0 ? data : null,
            source: total > 0 ? "server" : "empty",
          };
          return Response.json(body, {
            headers: { "Cache-Control": "no-store" },
          });
        } catch (err) {
          console.error("[pm/workspace] GET failed", err);
          return Response.json(
            {
              error: "Failed to load workspace",
              detail: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          );
        }
      },

      PUT: async ({ request }) => {
        try {
          // Every write requires a signed-in session (no anonymous writes) —
          // reads stay open (see the module docstring), writes do not.
          assertSameSiteRequest();
          const userId = await requireUserId();

          const body = (await request.json()) as { data?: unknown };
          if (!isPmSnapshot(body.data)) {
            return Response.json({ error: "Invalid workspace payload" }, { status: 400 });
          }
          const data = body.data as PmSnapshot;
          await ensureDbReady();
          // Insert-only gap fill — never deletes or overwrites an existing row.
          await importSnapshotGaps(data, userId);

          const saved = await readFullSnapshot();
          const total = Object.values(saved).reduce(
            (sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0),
            0,
          );
          const responseBody: WorkspaceResponse = {
            id: "default",
            version: total,
            updatedAt: new Date().toISOString(),
            data: saved,
            source: "server",
          };
          return Response.json(responseBody);
        } catch (err) {
          if (err instanceof Error && err.name === "UnauthorizedError") {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }
          console.error("[pm/workspace] PUT (import) failed", err);
          return Response.json(
            {
              error: "Failed to import workspace",
              detail: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
