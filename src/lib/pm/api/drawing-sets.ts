import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady } from "@/lib/db";
import { newId } from "@/lib/pm/id";
import type { DrawingSet } from "@/lib/pm/types";
import { createEntity, deleteEntity, listEntities, updateEntity, type EntityTable } from "./entity-crud";

const TABLE: EntityTable<DrawingSet> = {
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

export const listDrawingSets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureDbReady();
    return listEntities(TABLE);
  });

export const createDrawingSet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((row: Omit<DrawingSet, "id">) => row)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    const id = newId("ds");
    return createEntity(TABLE, id, data, context.userId);
  });

export const updateDrawingSet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; patch: Partial<DrawingSet> }) => input)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    return updateEntity(TABLE, data.id, data.patch, context.userId);
  });

export const deleteDrawingSet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await ensureDbReady();
    await deleteEntity(TABLE.table, data.id);
    return { ok: true };
  });
