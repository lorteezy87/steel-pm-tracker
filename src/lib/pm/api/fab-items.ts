import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady } from "@/lib/db";
import { newId } from "@/lib/pm/id";
import type { FabItem } from "@/lib/pm/types";
import { createEntity, deleteEntity, listEntities, updateEntity, type EntityTable } from "./entity-crud";

const TABLE: EntityTable<FabItem> = {
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

export const listFabItems = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureDbReady();
    return listEntities(TABLE);
  });

export const createFabItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((row: Omit<FabItem, "id">) => row)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    const id = newId("f");
    return createEntity(TABLE, id, data, context.userId);
  });

export const updateFabItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; patch: Partial<FabItem> }) => input)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    return updateEntity(TABLE, data.id, data.patch, context.userId);
  });

export const deleteFabItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await ensureDbReady();
    await deleteEntity(TABLE.table, data.id);
    return { ok: true };
  });
