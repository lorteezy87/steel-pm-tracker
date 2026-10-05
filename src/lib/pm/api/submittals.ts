import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady } from "@/lib/db";
import { newId } from "@/lib/pm/id";
import type { Submittal } from "@/lib/pm/types";
import { SUBMITTALS as TABLE } from "./submittals.table";
import { createEntity, deleteEntity, listEntities, updateEntity } from "./entity-crud";

export const listSubmittals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureDbReady();
    return listEntities(TABLE);
  });

export const createSubmittal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((row: Omit<Submittal, "id"> & { id?: string }) => row)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    // Prefer the client-generated id so the optimistic row keeps the SAME id
    // once the server confirms it — same contract as every other entity here.
    const { id: clientId, ...row } = data;
    return createEntity(TABLE, clientId ?? newId("sb"), row, context.userId);
  });

export const updateSubmittal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; patch: Partial<Submittal> }) => input)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    return updateEntity(TABLE, data.id, data.patch, context.userId);
  });

export const deleteSubmittal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await ensureDbReady();
    await deleteEntity(TABLE.table, data.id);
    return { ok: true } as const;
  });
