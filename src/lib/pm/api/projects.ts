import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady } from "@/lib/db";
import { newId } from "@/lib/pm/id";
import type { Project } from "@/lib/pm/types";
import { createEntity, deleteEntity, listEntities, updateEntity, type EntityTable } from "./entity-crud";

const TABLE: EntityTable<Project> = {
  table: "projects",
  columns: {
    id: "id",
    code: "code",
    name: "name",
    client: "client",
    status: "status",
    startDate: "start_date",
    targetComplete: "target_complete",
    owner: "owner",
    notes: "notes",
  },
};

export const listProjects = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureDbReady();
    return listEntities(TABLE, "code asc");
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((row: Omit<Project, "id">) => row)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    const id = newId("p");
    return createEntity(TABLE, id, data, context.userId);
  });

export const updateProjectRow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; patch: Partial<Project> }) => input)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    return updateEntity(TABLE, data.id, data.patch, context.userId);
  });

export const deleteProjectRow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await ensureDbReady();
    await deleteEntity(TABLE.table, data.id);
    return { ok: true };
  });
