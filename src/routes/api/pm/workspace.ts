import { createFileRoute } from "@tanstack/react-router";
import { ensureDbReady, getSql } from "@/lib/db";
import { requireUserId } from "@/lib/auth/verify.server";
import { assertSameSiteRequest } from "@/lib/auth/isolation.server";
import { isPmSnapshot, type PmSnapshot, type WorkspaceResponse } from "@/lib/pm/snapshot";
import { listEntities, type EntityTable } from "@/lib/pm/api/entity-crud";
import type {
  ChangeOrder,
  Delivery,
  DrawingSet,
  DrawingSheet,
  FabItem,
  InstallItem,
  Project,
  Rfi,
  Roadblock,
  Task,
  WorkPackage,
} from "@/lib/pm/types";

/**
 * Shared workspace endpoint, now backed by the per-record relational tables
 * from migrations/0003_entities.sql instead of the single `pm_workspace`
 * JSONB blob (`pm_workspace` itself is left in place, unused, per the spec).
 *
 * GET assembles a `PmSnapshot` by listing every table. PUT replaces the full
 * contents of every table with the client's snapshot (a per-row upsert +
 * delete-of-removed-rows), stamping `created_by`/`updated_by` from the
 * caller's verified session. This keeps the existing multi-device polling
 * sync in `src/lib/pm/sync.ts` working unchanged while the actual source of
 * truth becomes the relational tables — the per-entity CRUD endpoints in
 * `src/lib/pm/api/*` are the preferred path for new code and are what the
 * tracker pages call directly; this endpoint remains for whole-workspace
 * bootstrap/import and legacy multi-device sync compatibility.
 *
 * IMPORTANT: shared single-company tool, NOT per-user-isolated — see the
 * "IMPORTANT deviation" note in migrations/0003_entities.sql. Every
 * signed-in user reads/writes the SAME shared rows; `created_by`/`updated_by`
 * are audit trail only, never a visibility filter. GET is intentionally left
 * open (matches the previous `pm_workspace` behavior — the tracker needs to
 * be readable before sign-in to preserve current no-login usability), but PUT
 * requires a session, same as every other mutation.
 */

const PROJECTS: EntityTable<Project> = {
  table: "projects",
  columns: {
    id: "id",
    code: "code",
    name: "name",
    client: "client",
    status: "status",
    startDate: "start_date",
    targetComplete: "target_complete",
    owner: "owner",
    notes: "notes",
  },
};
const WORK_PACKAGES: EntityTable<WorkPackage> = {
  table: "work_packages",
  columns: {
    id: "id",
    projectId: "project_id",
    code: "code",
    name: "name",
    description: "description",
    status: "status",
    plannedStart: "planned_start",
    plannedComplete: "planned_complete",
    tonnage: "tonnage",
    owner: "owner",
    notes: "notes",
  },
  numericKeys: ["tonnage"],
};
const DRAWING_SETS: EntityTable<DrawingSet> = {
  table: "drawing_sets",
  columns: {
    id: "id",
    projectId: "project_id",
    name: "name",
    type: "type",
    description: "description",
    submitted: "submitted",
    requiredBy: "required_by",
    status: "status",
    ballInCourt: "ball_in_court",
    owner: "owner",
    notes: "notes",
  },
};
const DRAWING_SHEETS: EntityTable<DrawingSheet> = {
  table: "drawing_sheets",
  columns: {
    id: "id",
    setId: "set_id",
    numberRev: "number_rev",
    description: "description",
    submitted: "submitted",
    requiredBy: "required_by",
    status: "status",
    ballInCourt: "ball_in_court",
    notes: "notes",
  },
};
const FAB_ITEMS: EntityTable<FabItem> = {
  table: "fab_items",
  columns: {
    id: "id",
    projectId: "project_id",
    workPackageId: "work_package_id",
    workPackage: "work_package_label",
    description: "description",
    qty: "qty",
    weightTons: "weight_tons",
    drawingRef: "drawing_ref",
    status: "status",
    pctComplete: "pct_complete",
    shop: "shop",
    plannedDate: "planned_date",
    owner: "owner",
    notes: "notes",
  },
  numericKeys: ["qty", "weightTons", "pctComplete"],
};
const DELIVERIES: EntityTable<Delivery> = {
  table: "deliveries",
  columns: {
    id: "id",
    projectId: "project_id",
    workPackageId: "work_package_id",
    loadNumber: "load_number",
    pieceMarks: "piece_marks",
    plannedShip: "planned_ship",
    actualShip: "actual_ship",
    plannedArrival: "planned_arrival",
    actualArrival: "actual_arrival",
    status: "status",
    destination: "destination",
    owner: "owner",
    notes: "notes",
  },
};
const INSTALL_ITEMS: EntityTable<InstallItem> = {
  table: "install_items",
  columns: {
    id: "id",
    projectId: "project_id",
    workPackageId: "work_package_id",
    sequenceArea: "sequence_area",
    pieceMarks: "piece_marks",
    plannedErect: "planned_erect",
    status: "status",
    pctComplete: "pct_complete",
    crew: "crew",
    owner: "owner",
    notes: "notes",
  },
  numericKeys: ["pctComplete"],
};
const RFIS: EntityTable<Rfi> = {
  table: "rfis",
  columns: {
    id: "id",
    projectId: "project_id",
    rfiNumber: "rfi_number",
    subject: "subject",
    issued: "issued",
    responseDue: "response_due",
    status: "status",
    ballInCourt: "ball_in_court",
    impact: "impact",
    linkedDrawing: "linked_drawing",
    notes: "notes",
  },
};
const CHANGE_ORDERS: EntityTable<ChangeOrder> = {
  table: "change_orders",
  columns: {
    id: "id",
    projectId: "project_id",
    coNumber: "co_number",
    description: "description",
    linked: "linked",
    cost: "cost",
    scheduleDays: "schedule_days",
    status: "status",
    owner: "owner",
    notes: "notes",
  },
  numericKeys: ["cost", "scheduleDays"],
};
const ROADBLOCKS: EntityTable<Roadblock> = {
  table: "roadblocks",
  columns: {
    id: "id",
    projectId: "project_id",
    title: "title",
    category: "category",
    description: "description",
    raisedDate: "raised_date",
    ballInCourt: "ball_in_court",
    impact: "impact",
    severity: "severity",
    status: "status",
    resolvedDate: "resolved_date",
    linkedEntityType: "linked_entity_type",
    linkedEntityId: "linked_entity_id",
    owner: "owner",
    notes: "notes",
  },
};
const TASKS: EntityTable<Task> = {
  table: "tasks",
  columns: {
    id: "id",
    projectId: "project_id",
    task: "task",
    category: "category",
    owner: "owner",
    due: "due",
    status: "status",
    priority: "priority",
    notes: "notes",
  },
};

const ALL_TABLES = [
  PROJECTS,
  WORK_PACKAGES,
  DRAWING_SETS,
  DRAWING_SHEETS,
  FAB_ITEMS,
  DELIVERIES,
  INSTALL_ITEMS,
  RFIS,
  CHANGE_ORDERS,
  ROADBLOCKS,
  TASKS,
] as const;

async function readSnapshot(): Promise<PmSnapshot> {
  const [
    projects,
    workPackages,
    drawingSets,
    drawingSheets,
    fab,
    deliveries,
    install,
    rfis,
    cos,
    roadblocks,
    tasks,
  ] = await Promise.all([
    listEntities(PROJECTS, "code asc"),
    listEntities(WORK_PACKAGES, "code asc"),
    listEntities(DRAWING_SETS),
    listEntities(DRAWING_SHEETS),
    listEntities(FAB_ITEMS),
    listEntities(DELIVERIES),
    listEntities(INSTALL_ITEMS),
    listEntities(RFIS),
    listEntities(CHANGE_ORDERS),
    listEntities(ROADBLOCKS),
    listEntities(TASKS),
  ]);
  return {
    projects,
    workPackages,
    drawingSets,
    drawingSheets,
    fab,
    deliveries,
    install,
    rfis,
    cos,
    roadblocks,
    tasks,
  };
}

/** Replace the full contents of one table with `rows`, stamping the audit columns. */
async function replaceTable<T extends { id: string }>(
  def: EntityTable<T>,
  rows: T[],
  userId: string,
): Promise<void> {
  const sql = await getSql();
  await sql.query(`delete from ${def.table}`);
  for (const row of rows) {
    const { id, ...rest } = row as T & { id: string };
    const cols = Object.keys(def.columns) as (keyof T)[];
    const dbCols = ["id"];
    const values: unknown[] = [id];
    for (const key of cols) {
      const col = def.columns[key];
      if (!col || key === "id") continue;
      dbCols.push(col);
      const v = (rest as Record<string, unknown>)[key as string];
      values.push(v === "" || v === undefined ? null : v);
    }
    dbCols.push("created_by", "updated_by");
    values.push(userId, userId);
    const placeholders = dbCols.map((_, i) => `$${i + 1}`);
    await sql.query(
      `insert into ${def.table} (${dbCols.join(", ")}) values (${placeholders.join(", ")})
       on conflict (id) do update set ${dbCols
         .filter((c) => c !== "id")
         .map((c) => `${c} = excluded.${c}`)
         .join(", ")}`,
      values,
    );
  }
}

async function writeSnapshot(data: PmSnapshot, userId: string): Promise<void> {
  // Parents before children so FK constraints never trip mid-import.
  await replaceTable(PROJECTS, data.projects, userId);
  await replaceTable(WORK_PACKAGES, data.workPackages, userId);
  await replaceTable(DRAWING_SETS, data.drawingSets, userId);
  await replaceTable(DRAWING_SHEETS, data.drawingSheets, userId);
  await replaceTable(FAB_ITEMS, data.fab, userId);
  await replaceTable(DELIVERIES, data.deliveries, userId);
  await replaceTable(INSTALL_ITEMS, data.install, userId);
  await replaceTable(RFIS, data.rfis, userId);
  await replaceTable(CHANGE_ORDERS, data.cos, userId);
  await replaceTable(ROADBLOCKS, data.roadblocks, userId);
  await replaceTable(TASKS, data.tasks, userId);
}

async function countRows(): Promise<number> {
  const sql = await getSql();
  let total = 0;
  for (const def of ALL_TABLES) {
    const rows = await sql.query<{ count: number }>(`select count(*)::int as count from ${def.table}`);
    total += rows[0]?.count ?? 0;
  }
  return total;
}

export const Route = createFileRoute("/api/pm/workspace")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await ensureDbReady();
          const data = await readSnapshot();
          const total = await countRows();
          const body: WorkspaceResponse = {
            id: "default",
            // No single incrementing version column anymore now that data lives
            // across many tables — total row count is a cheap, good-enough
            // "did anything change" signal for the client's poll loop.
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
          await writeSnapshot(
            {
              ...data,
              workPackages: data.workPackages ?? [],
              roadblocks: data.roadblocks ?? [],
            },
            userId,
          );

          const saved = await readSnapshot();
          const total = await countRows();
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
