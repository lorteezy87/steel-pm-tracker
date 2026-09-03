import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady } from "@/lib/db";
import { newId } from "@/lib/pm/id";
import type { InstallItem } from "@/lib/pm/types";
import { createEntity, deleteEntity, listEntities, updateEntity, type EntityTable } from "./entity-crud";

const TABLE: EntityTable<InstallItem> = {
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

export const listInstallItems = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureDbReady();
    return listEntities(TABLE);
  });

export const createInstallItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((row: Omit<InstallItem, "id">) => row)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    const id = newId("i");
    return createEntity(TABLE, id, data, context.userId);
  });

export const updateInstallItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; patch: Partial<InstallItem> }) => input)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    return updateEntity(TABLE, data.id, data.patch, context.userId);
  });

export const deleteInstallItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await ensureDbReady();
    await deleteEntity(TABLE.table, data.id);
    return { ok: true };
  });
