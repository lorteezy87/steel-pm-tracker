import { createFileRoute } from "@tanstack/react-router";
import { ensureDbReady, getSql } from "@/lib/db";
import { isPmSnapshot, type PmSnapshot, type WorkspaceResponse } from "@/lib/pm/snapshot";

const WORKSPACE_ID = "default";

async function ensureWorkspaceTable() {
  const sql = await getSql();
  await sql.query(`
    CREATE TABLE IF NOT EXISTS pm_workspace (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await sql.query(
    `INSERT INTO pm_workspace (id, payload, version)
     VALUES ($1, '{}'::jsonb, 0)
     ON CONFLICT (id) DO NOTHING`,
    [WORKSPACE_ID],
  );
}

async function readWorkspace(): Promise<WorkspaceResponse> {
  await ensureDbReady();
  await ensureWorkspaceTable();
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    payload: unknown;
    version: number;
    updated_at: string | Date | null;
  }>("SELECT id, payload, version, updated_at FROM pm_workspace WHERE id = $1", [
    WORKSPACE_ID,
  ]);

  const row = rows[0];
  if (!row) {
    return {
      id: WORKSPACE_ID,
      version: 0,
      updatedAt: null,
      data: null,
      source: "empty",
    };
  }

  let payload = row.payload;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }

  const data =
    payload && typeof payload === "object" && Object.keys(payload as object).length > 0
      ? isPmSnapshot(payload)
        ? payload
        : null
      : null;

  return {
    id: row.id,
    version: Number(row.version) || 0,
    updatedAt:
      row.updated_at == null
        ? null
        : typeof row.updated_at === "string"
          ? row.updated_at
          : row.updated_at.toISOString(),
    data,
    source: data ? "server" : "empty",
  };
}

export const Route = createFileRoute("/api/pm/workspace")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const body = await readWorkspace();
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
          const body = (await request.json()) as {
            data?: unknown;
            expectedVersion?: number;
          };

          if (!isPmSnapshot(body.data)) {
            return Response.json(
              { error: "Invalid workspace payload" },
              { status: 400 },
            );
          }

          const data = body.data as PmSnapshot;
          await ensureDbReady();
          await ensureWorkspaceTable();
          const sql = await getSql();

          const current = await readWorkspace();
          if (
            typeof body.expectedVersion === "number" &&
            current.version > 0 &&
            body.expectedVersion !== current.version
          ) {
            return Response.json(
              {
                error: "Version conflict",
                version: current.version,
                data: current.data,
                updatedAt: current.updatedAt,
              },
              { status: 409 },
            );
          }

          const nextVersion = (current.version || 0) + 1;
          const payloadJson = JSON.stringify(data);

          await sql.query(
            `INSERT INTO pm_workspace (id, payload, version, updated_at)
             VALUES ($1, $2::jsonb, $3, now())
             ON CONFLICT (id) DO UPDATE SET
               payload = EXCLUDED.payload,
               version = EXCLUDED.version,
               updated_at = now()`,
            [WORKSPACE_ID, payloadJson, nextVersion],
          );

          const saved = await readWorkspace();
          return Response.json(saved);
        } catch (err) {
          console.error("[pm/workspace] PUT failed", err);
          return Response.json(
            {
              error: "Failed to save workspace",
              detail: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
