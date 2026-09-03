import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady } from "@/lib/db";
import { newId } from "@/lib/pm/id";
import type { Task } from "@/lib/pm/types";
import { createEntity, deleteEntity, listEntities, updateEntity, type EntityTable } from "./entity-crud";

const TABLE: EntityTable<Task> = {
  table: "tasks",
  columns: {
    id: "id",
    projectId: "project_id",
    task: "task",
    category: "category",
    owner: "owner",
    due: "due",
    status: "status",
    priority: "priority",
    notes: "notes",
  },
};

export const listTasks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureDbReady();
    return listEntities(TABLE);
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((row: Omit<Task, "id">) => row)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    const id = newId("t");
    return createEntity(TABLE, id, data, context.userId);
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; patch: Partial<Task> }) => input)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    return updateEntity(TABLE, data.id, data.patch, context.userId);
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await ensureDbReady();
    await deleteEntity(TABLE.table, data.id);
    return { ok: true };
  });
