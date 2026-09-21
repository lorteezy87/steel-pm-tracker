import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady, getSql } from "@/lib/db";
import { isPmSnapshot, type PmSnapshot } from "@/lib/pm/snapshot";
import { listEntities, type EntityTable } from "./entity-crud";
import { PROJECTS } from "./projects.table";
import { WORK_PACKAGES } from "./work-packages.table";
import { DRAWING_SETS } from "./drawing-sets.table";
import { DRAWING_SHEETS } from "./drawing-sheets.table";
import { FAB_ITEMS } from "./fab-items.table";
import { DELIVERIES } from "./deliveries.table";
import { INSTALL_ITEMS } from "./install-items.table";
import { RFIS } from "./rfis.table";
import { CHANGE_ORDERS } from "./change-orders.table";
import { ROADBLOCKS } from "./roadblocks.table";
import { TASKS } from "./tasks.table";
import { SUBMITTALS } from "./submittals.table";
import { JOURNAL_ENTRIES } from "./journal.table";

/**
 * One-time snapshot import — the "one-time import path" referenced in
 * migrations/0003_entities.sql. Used for:
 *   1. First-run bootstrap: a browser that already has a locally-persisted
 *      (Zustand `persist`) snapshot from before the relational upgrade, and
 *      the server has no rows yet.
 *   2. The Team Access "Import JSON" backup feature (`src/lib/pm/sync.ts`'s
 *      `importSnapshotJson`), so Nick can paste in a previously exported
 *      snapshot without losing anything already on the server.
 *
 * This is INSERT-ONLY and additive: for every row in the incoming snapshot,
 * insert it if no row with that id already exists in the table; existing
 * server rows are never updated or deleted. This is intentionally NOT the
 * same operation as the per-record create/update/delete endpoints (which are
 * the normal, real-time save path used by every tracker page) — it exists
 * only to backfill gaps once, safely, alongside data other users may already
 * be editing concurrently.
 */

/** Insert every row in `rows` whose id isn't already present in `def.table`. */
async function fillGaps<T extends { id: string }>(
  def: EntityTable<T>,
  rows: T[],
  userId: string,
): Promise<number> {
  if (rows.length === 0) return 0;
  const sql = await getSql();
  const existing = await sql.query<{ id: string }>(`select id from ${def.table}`);
  const existingIds = new Set(existing.map((r) => r.id));
  let inserted = 0;
  // Empty string -> NULL only for nullable date/numeric columns; every other
  // (text, `not null default ''`) column must keep `''` as `''` — mirrors
  // `toRow` in entity-crud.ts. See `EntityTable.nullableKeys` doc comment.
  const nullable = new Set<keyof T>([...(def.nullableKeys ?? []), ...(def.numericKeys ?? [])]);
  for (const row of rows) {
    if (existingIds.has(row.id)) continue; // never overwrite an existing row
    const { id, ...rest } = row as T & { id: string };
    const cols = Object.keys(def.columns) as (keyof T)[];
    const dbCols = ["id"];
    const values: unknown[] = [id];
    for (const key of cols) {
      const col = def.columns[key];
      if (!col || key === "id") continue;
      dbCols.push(col);
      const v = (rest as Record<string, unknown>)[key as string];
      values.push(v === undefined ? null : v === "" && nullable.has(key) ? null : v);
    }
    dbCols.push("created_by", "updated_by");
    values.push(userId, userId);
    const placeholders = dbCols.map((_, i) => `$${i + 1}`);
    try {
      await sql.query(
        `insert into ${def.table} (${dbCols.join(", ")}) values (${placeholders.join(", ")})
         on conflict (id) do nothing`,
        values,
      );
      inserted += 1;
    } catch (err) {
      // A row referencing a not-yet-imported parent (e.g. a drawing sheet
      // whose set wasn't in this snapshot) shouldn't abort the whole import —
      // skip it and keep going with the rest.
      console.warn(`[pm/import] skipped a ${def.table} row`, err);
    }
  }
  return inserted;
}

/** Insert-only import of a full snapshot; parents before children for FK safety. */
export async function importSnapshotGaps(
  data: PmSnapshot,
  userId: string,
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  result.projects = await fillGaps(PROJECTS, data.projects, userId);
  result.workPackages = await fillGaps(WORK_PACKAGES, data.workPackages ?? [], userId);
  result.drawingSets = await fillGaps(DRAWING_SETS, data.drawingSets, userId);
  result.drawingSheets = await fillGaps(DRAWING_SHEETS, data.drawingSheets, userId);
  result.fab = await fillGaps(FAB_ITEMS, data.fab, userId);
  result.deliveries = await fillGaps(DELIVERIES, data.deliveries, userId);
  result.install = await fillGaps(INSTALL_ITEMS, data.install, userId);
  result.rfis = await fillGaps(RFIS, data.rfis, userId);
  result.cos = await fillGaps(CHANGE_ORDERS, data.cos, userId);
  result.roadblocks = await fillGaps(ROADBLOCKS, data.roadblocks ?? [], userId);
  result.tasks = await fillGaps(TASKS, data.tasks, userId);
  result.submittals = await fillGaps(SUBMITTALS, data.submittals ?? [], userId);
  result.journal = await fillGaps(JOURNAL_ENTRIES, data.journal ?? [], userId);
  return result;
}

export async function readFullSnapshot(): Promise<PmSnapshot> {
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
    submittals,
    journal,
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
    listEntities(SUBMITTALS),
    listEntities(JOURNAL_ENTRIES, "entry_date desc"),
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
    submittals,
    journal,
  };
}

/** Server function wrapper, for any future client code that wants to import without a raw fetch. */
export const importWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { data: unknown }) => input)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    if (!isPmSnapshot(data.data)) throw new Error("Invalid workspace snapshot");
    await importSnapshotGaps(data.data as PmSnapshot, context.userId);
    return readFullSnapshot();
  });
