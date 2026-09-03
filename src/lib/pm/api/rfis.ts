import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady } from "@/lib/db";
import { newId } from "@/lib/pm/id";
import type { Rfi } from "@/lib/pm/types";
import { createEntity, deleteEntity, listEntities, updateEntity, type EntityTable } from "./entity-crud";

const TABLE: EntityTable<Rfi> = {
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

export const listRfis = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureDbReady();
    return listEntities(TABLE);
  });

export const createRfi = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((row: Omit<Rfi, "id">) => row)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    const id = newId("r");
    return createEntity(TABLE, id, data, context.userId);
  });

export const updateRfi = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; patch: Partial<Rfi> }) => input)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    return updateEntity(TABLE, data.id, data.patch, context.userId);
  });

export const deleteRfi = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await ensureDbReady();
    await deleteEntity(TABLE.table, data.id);
    return { ok: true };
  });
