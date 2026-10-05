import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureDbReady } from "@/lib/db";
import { newId } from "@/lib/pm/id";
import type { Note } from "@/lib/pm/types";
import { NOTES as TABLE } from "./notes.table";
import { createEntity, deleteEntity, listEntities, updateEntity } from "./entity-crud";

export const listNotes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    await ensureDbReady();
    return listEntities(TABLE);
  });

export const createNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((row: Omit<Note, "id"> & { id?: string }) => row)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    // Prefer the client-generated id so the optimistic row keeps the SAME id
    // once the server confirms it — same contract as every other entity here.
    const { id: clientId, ...row } = data;
    return createEntity(TABLE, clientId ?? newId("n"), row, context.userId);
  });

export const updateNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; patch: Partial<Note> }) => input)
  .handler(async ({ data, context }) => {
    await ensureDbReady();
    return updateEntity(TABLE, data.id, data.patch, context.userId);
  });

export const deleteNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await ensureDbReady();
    await deleteEntity(TABLE.table, data.id);
    return { ok: true } as const;
  });
