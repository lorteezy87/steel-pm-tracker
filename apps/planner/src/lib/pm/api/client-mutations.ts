/**
 * Client-side helper that makes every tracker CRUD action a REAL, immediate
 * per-record server call (not a debounced whole-snapshot replace).
 *
 * Pattern per mutation:
 *   1. Apply the change to local Zustand state immediately (optimistic UI).
 *   2. Fire the matching `src/lib/pm/api/<entity>.ts` `createServerFn` call.
 *   3. On success, reconcile local state with the server's confirmed row
 *      (harmless no-op most of the time; matters if the server computed/
 *      normalized any field).
 *   4. On failure, roll the optimistic change back and surface the error via
 *      the existing sync status chip (`src/lib/pm/sync.ts`), so a rejected
 *      write is visible instead of silently diverging from the server.
 *
 * Two different browser sessions editing two different records now hit two
 * independent `update .. where id = $1` statements — no shared "replace the
 * whole table" step, so they can never clobber each other. Two sessions
 * racing to edit the SAME record is last-write-wins at the single-row level
 * (whichever `UPDATE` commits last on the server wins), the normal semantics
 * for this kind of app — never a whole-OTHER-table wipe.
 */
import { beginMutation, endMutation, setStatus } from "@/lib/pm/sync";

export interface EntityMutationApi<T extends { id: string }> {
  create: (row: Omit<T, "id"> & { id: string }) => Promise<T>;
  update: (input: { id: string; patch: Partial<T> }) => Promise<T | null>;
  remove: (input: { id: string }) => Promise<{ ok: true }>;
}

/**
 * Persist an already-optimistically-inserted `row` (with a client-generated
 * `id`) server-side. The caller is responsible for the synchronous local
 * insert BEFORE calling this (see `store.ts`'s `crudActions.add`, which also
 * needs to sequence this call after any parent row's own create resolves
 * without delaying the optimistic UI update). Rolls back (removes the row)
 * if the server call fails.
 */
export async function persistCreate<T extends { id: string }>(
  api: Pick<EntityMutationApi<T>, "create">,
  row: T,
  applyLocal: (row: T) => void,
  removeLocal: (id: string) => void,
): Promise<void> {
  beginMutation();
  setStatus("saving");
  try {
    const saved = await api.create(row as Omit<T, "id"> & { id: string });
    applyLocal(saved); // reconcile any server-normalized fields, same id
    setStatus("synced");
  } catch (err) {
    removeLocal(row.id);
    setStatus("offline", describeError(err, "Failed to create"));
  } finally {
    endMutation();
  }
}

/** Optimistically patch local state, persist server-side, roll back the patch on failure. */
export async function optimisticUpdate<T extends { id: string }>(
  api: Pick<EntityMutationApi<T>, "update">,
  id: string,
  patch: Partial<T>,
  previous: Partial<T>,
  applyLocal: (id: string, patch: Partial<T>) => void,
): Promise<void> {
  applyLocal(id, patch);
  beginMutation();
  setStatus("saving");
  try {
    const saved = await api.update({ id, patch });
    if (saved) applyLocal(id, saved);
    setStatus("synced");
  } catch (err) {
    applyLocal(id, previous); // roll back to the pre-edit values
    setStatus("offline", describeError(err, "Failed to save changes"));
  } finally {
    endMutation();
  }
}

/** Optimistically remove locally, persist the delete server-side, restore on failure. */
export async function optimisticDelete<T extends { id: string }>(
  api: Pick<EntityMutationApi<T>, "remove">,
  id: string,
  removeLocal: (id: string) => void,
  restoreLocal: (row: T) => void,
  snapshotBeforeDelete: T,
): Promise<void> {
  removeLocal(id);
  beginMutation();
  setStatus("saving");
  try {
    await api.remove({ id });
    setStatus("synced");
  } catch (err) {
    restoreLocal(snapshotBeforeDelete);
    setStatus("offline", describeError(err, "Failed to delete"));
  } finally {
    endMutation();
  }
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    // Better Auth / requireUserId throws with message "Unauthorized".
    if (err.message === "Unauthorized") return "Sign in to make changes to the shared workspace";
    return err.message;
  }
  return fallback;
}
