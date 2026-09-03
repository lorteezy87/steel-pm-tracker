import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady } from "@/lib/db";
import { newId } from "@/lib/pm/id";
import type { ChangeOrder } from "@/lib/pm/types";
import { createEntity, deleteEntity, listEntities, updateEntity, type EntityTable } from "./entity-crud";

const TABLE: EntityTable<ChangeOrder> = {
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

export const listChangeOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureDbReady();
    return listEntities(TABLE);
  });

export const createChangeOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((row: Omit<ChangeOrder, "id">) => row)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    const id = newId("c");
    return createEntity(TABLE, id, data, context.userId);
  });

export const updateChangeOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; patch: Partial<ChangeOrder> }) => input)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    return updateEntity(TABLE, data.id, data.patch, context.userId);
  });

export const deleteChangeOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await ensureDbReady();
    await deleteEntity(TABLE.table, data.id);
    return { ok: true };
  });
