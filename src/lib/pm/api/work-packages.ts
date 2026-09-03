import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady } from "@/lib/db";
import { newId } from "@/lib/pm/id";
import type { WorkPackage } from "@/lib/pm/types";
import { createEntity, deleteEntity, listEntities, updateEntity, type EntityTable } from "./entity-crud";

const TABLE: EntityTable<WorkPackage> = {
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

export const listWorkPackages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureDbReady();
    return listEntities(TABLE, "code asc");
  });

export const createWorkPackage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((row: Omit<WorkPackage, "id">) => row)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    const id = newId("wp");
    return createEntity(TABLE, id, data, context.userId);
  });

export const updateWorkPackage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; patch: Partial<WorkPackage> }) => input)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    return updateEntity(TABLE, data.id, data.patch, context.userId);
  });

export const deleteWorkPackage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await ensureDbReady();
    await deleteEntity(TABLE.table, data.id);
    return { ok: true };
  });
