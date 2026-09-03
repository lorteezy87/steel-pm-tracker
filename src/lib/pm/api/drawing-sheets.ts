import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady } from "@/lib/db";
import { newId } from "@/lib/pm/id";
import type { DrawingSheet } from "@/lib/pm/types";
import { createEntity, deleteEntity, listEntities, updateEntity, type EntityTable } from "./entity-crud";

const TABLE: EntityTable<DrawingSheet> = {
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

export const listDrawingSheets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureDbReady();
    return listEntities(TABLE);
  });

export const createDrawingSheet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((row: Omit<DrawingSheet, "id">) => row)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    const id = newId("sh");
    return createEntity(TABLE, id, data, context.userId);
  });

export const updateDrawingSheet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; patch: Partial<DrawingSheet> }) => input)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    return updateEntity(TABLE, data.id, data.patch, context.userId);
  });

export const deleteDrawingSheet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await ensureDbReady();
    await deleteEntity(TABLE.table, data.id);
    return { ok: true };
  });
