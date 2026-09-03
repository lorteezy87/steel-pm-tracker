import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady } from "@/lib/db";
import { newId } from "@/lib/pm/id";
import type { Delivery } from "@/lib/pm/types";
import { createEntity, deleteEntity, listEntities, updateEntity, type EntityTable } from "./entity-crud";

const TABLE: EntityTable<Delivery> = {
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

export const listDeliveries = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureDbReady();
    return listEntities(TABLE);
  });

export const createDelivery = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((row: Omit<Delivery, "id">) => row)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    const id = newId("dl");
    return createEntity(TABLE, id, data, context.userId);
  });

export const updateDelivery = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; patch: Partial<Delivery> }) => input)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    return updateEntity(TABLE, data.id, data.patch, context.userId);
  });

export const deleteDelivery = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await ensureDbReady();
    await deleteEntity(TABLE.table, data.id);
    return { ok: true };
  });
