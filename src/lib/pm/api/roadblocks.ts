import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady } from "@/lib/db";
import { newId } from "@/lib/pm/id";
import type { Roadblock } from "@/lib/pm/types";
import { createEntity, deleteEntity, listEntities, updateEntity, type EntityTable } from "./entity-crud";

const TABLE: EntityTable<Roadblock> = {
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

export const listRoadblocks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureDbReady();
    return listEntities(TABLE);
  });

export const createRoadblock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((row: Omit<Roadblock, "id">) => row)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    const id = newId("rb");
    return createEntity(TABLE, id, data, context.userId);
  });

export const updateRoadblock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; patch: Partial<Roadblock> }) => input)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    return updateEntity(TABLE, data.id, data.patch, context.userId);
  });

export const deleteRoadblock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await ensureDbReady();
    await deleteEntity(TABLE.table, data.id);
    return { ok: true };
  });
