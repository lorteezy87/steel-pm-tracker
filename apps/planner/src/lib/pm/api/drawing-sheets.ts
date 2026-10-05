import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady } from "@/lib/db";
import { newId } from "@/lib/pm/id";
import type { DrawingSheet } from "@/lib/pm/types";
import { DRAWING_SHEETS as TABLE } from "./drawing-sheets.table";
import { createEntity, deleteEntity, listEntities, updateEntity } from "./entity-crud";

export const listDrawingSheets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureDbReady();
    return listEntities(TABLE);
  });

export const createDrawingSheet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((row: Omit<DrawingSheet, "id"> & { id?: string }) => row)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    // Prefer the client-generated id (see src/lib/pm/id.ts's newId()) so the
    // optimistic row Zustand inserts immediately keeps the SAME id once the
    // server confirms it — no swap-the-temp-id reconciliation needed. Falls
    // back to generating one server-side for any caller that omits it.
    const { id: clientId, ...row } = data;
    const id = clientId ?? newId("sh");
    return createEntity(TABLE, id, row, context.userId);
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
