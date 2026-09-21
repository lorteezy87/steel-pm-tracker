import type { PmSnapshot, WorkspaceResponse } from "./snapshot";
import { isPmSnapshot } from "./snapshot";
import { usePmStore } from "./store";

/**
 * Multi-device freshness + status reporting.
 *
 * IMPORTANT: this module is READ-ONLY against the server. Every write goes
 * through the per-record `src/lib/pm/api/*` server functions, called directly
 * from the matching `usePmStore` action (see `store.ts`) at the moment of the
 * edit — never a debounced whole-snapshot PUT. `pullWorkspace` (GET) is safe
 * to apply wholesale on a timer because it reflects the CURRENT authoritative
 * server state; overwriting the local Zustand cache with it just picks up
 * every other user's per-record edits since the last poll. This is the fix
 * for the earlier version of this file, which used to debounce a whole-blob
 * PUT (delete + reinsert every table) 700ms after ANY local change — that
 * silently clobbered concurrent edits from other users and wasn't "real"
 * per-record persistence at the application layer.
 */

export type SyncStatus =
  | "idle"
  | "loading"
  | "saving"
  | "synced"
  | "offline"
  | "error";

let syncStatus: SyncStatus = "idle";
let lastError: string | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let started = false;
/** True whenever an optimistic mutation is in flight, from `client-mutations.ts`. */
let pendingMutations = 0;
const listeners = new Set<() => void>();

/** Cached snapshot for useSyncExternalStore (must be referentially stable). */
let metaSnapshot = {
  syncStatus: "idle" as SyncStatus,
  lastError: null as string | null,
};

function refreshMetaSnapshot() {
  metaSnapshot = { syncStatus, lastError };
}

export function getSyncMeta() {
  return metaSnapshot;
}

export function subscribeSyncMeta(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit() {
  refreshMetaSnapshot();
  for (const l of listeners) l();
}

/** Exported so `client-mutations.ts` can drive the same status chip per-record edits use. */
export function setStatus(s: SyncStatus, err: string | null = null) {
  if (syncStatus === s && lastError === err) return;
  syncStatus = s;
  lastError = err;
  emit();
}

/** Track in-flight per-record mutations so the poll loop doesn't race a save. */
export function beginMutation(): void {
  pendingMutations += 1;
}
export function endMutation(): void {
  pendingMutations = Math.max(0, pendingMutations - 1);
}

export function snapshotFromStore(): PmSnapshot {
  const s = usePmStore.getState();
  return {
    projects: s.projects,
    workPackages: s.workPackages,
    drawingSets: s.drawingSets,
    drawingSheets: s.drawingSheets,
    fab: s.fab,
    deliveries: s.deliveries,
    install: s.install,
    rfis: s.rfis,
    cos: s.cos,
    roadblocks: s.roadblocks,
    tasks: s.tasks,
    submittals: s.submittals,
    journal: s.journal,
    notes: s.notes,
    tags: s.tags,
    entityTags: s.entityTags,
  };
}

/** Replace local state with the server's current truth (safe: GET is read-only). */
export function applySnapshot(data: PmSnapshot) {
  usePmStore.setState({
    projects: data.projects,
    workPackages: data.workPackages ?? [],
    drawingSets: data.drawingSets,
    drawingSheets: data.drawingSheets,
    fab: data.fab,
    deliveries: data.deliveries,
    install: data.install,
    rfis: data.rfis,
    cos: data.cos,
    roadblocks: data.roadblocks ?? [],
    tasks: data.tasks,
    submittals: data.submittals ?? [],
    journal: data.journal ?? [],
    notes: data.notes ?? [],
    tags: data.tags ?? [],
    entityTags: data.entityTags ?? [],
  });
}

async function authHeaders(): Promise<Record<string, string>> {
  // The live preview's iframe has partitioned cookies, so forward the session
  // bearer token the same way `authMiddleware` does for server functions.
  const { getBearerToken } = await import("@/lib/auth/client");
  const bearer = getBearerToken();
  return bearer ? { Authorization: `Bearer ${bearer}` } : {};
}

/** Load every table's current contents from the server (GET is read-only, never writes). */
export async function pullWorkspace(): Promise<boolean> {
  setStatus("loading");
  try {
    const res = await fetch("/api/pm/workspace", { cache: "no-store" });
    if (!res.ok) {
      // The route reports WHY it failed in `detail` (see
      // src/routes/api/pm/workspace.ts). Throwing a bare status here dropped
      // it on the floor, so a misconfigured deployment showed only
      // "Offline · local only" with "Load failed (500)" behind a tooltip —
      // no hint that the cause was an unset DATABASE_URL.
      const detail = await res
        .json()
        .then((b: { detail?: string; error?: string }) => b.detail ?? b.error)
        .catch(() => undefined);
      throw new Error(detail ? `Load failed (${res.status}): ${detail}` : `Load failed (${res.status})`);
    }
    const body = (await res.json()) as WorkspaceResponse;
    if (body.data && isPmSnapshot(body.data)) {
      applySnapshot(body.data);
    } else if (body.source === "empty") {
      // Nothing on the server yet — see if this browser has a locally
      // persisted snapshot worth offering to import (one-time, additive
      // only; see `maybeOfferLocalImport` / `importSnapshotJson` below).
      await maybeOfferLocalImport();
    }
    setStatus("synced");
    return true;
  } catch (e) {
    setStatus("offline", e instanceof Error ? e.message : "Offline");
    return false;
  }
}

/**
 * One-time bootstrap: if the server has NO rows yet in a given table and this
 * browser's local (Zustand-persisted) state has some, offer them up via the
 * additive import endpoint. Only ever fires when the server snapshot comes
 * back empty on first load, so it can never clobber other users' data — see
 * `src/lib/pm/api/import.ts` for the gap-filling (never-delete) server logic.
 */
async function maybeOfferLocalImport(): Promise<void> {
  const local = snapshotFromStore();
  const hasLocalData = Object.values(local).some((rows) => Array.isArray(rows) && rows.length > 0);
  if (!hasLocalData) return;
  await importWorkspaceSnapshot(local);
}

/**
 * Send a snapshot to the one-time import endpoint, which INSERTS any row
 * whose id doesn't already exist server-side and never deletes/overwrites
 * existing rows. Used for (a) first-run bootstrap from locally-persisted
 * demo/seed data, and (b) the Team Access "Import JSON" backup feature.
 */
export async function importWorkspaceSnapshot(data: PmSnapshot): Promise<boolean> {
  setStatus("saving");
  try {
    const res = await fetch("/api/pm/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ data }),
    });
    if (res.status === 401) {
      setStatus("offline", "Sign in to import into the shared workspace");
      return false;
    }
    if (!res.ok) throw new Error(`Import failed (${res.status})`);
    const body = (await res.json()) as WorkspaceResponse;
    if (body.data && isPmSnapshot(body.data)) applySnapshot(body.data);
    setStatus("synced");
    return true;
  } catch (e) {
    setStatus("offline", e instanceof Error ? e.message : "Import failed");
    return false;
  }
}

/** Start shared multi-device freshness polling (call once from client). Read-only. */
export function startPmSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  void pullWorkspace();

  pollTimer = setInterval(() => {
    void (async () => {
      // Skip a poll tick while a per-record mutation is in flight or a
      // pull/import is already running, so we never overwrite the optimistic
      // row a user just added with a server response that predates it.
      if (pendingMutations > 0 || syncStatus === "loading" || syncStatus === "saving") return;
      try {
        const res = await fetch("/api/pm/workspace", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as WorkspaceResponse;
        if (body.data && isPmSnapshot(body.data)) {
          applySnapshot(body.data);
          setStatus("synced");
        }
      } catch {
        // ignore poll errors
      }
    })();
  }, 8000);

  window.addEventListener("focus", () => {
    void pullWorkspace();
  });
}

export function stopPmSync() {
  if (pollTimer) clearInterval(pollTimer);
  started = false;
}

export function exportSnapshotJson(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      data: snapshotFromStore(),
    },
    null,
    2,
  );
}

/**
 * Team Access "Import JSON" backup feature: parses a previously exported
 * snapshot and merges it into the shared relational tables via the additive
 * import endpoint (fills in any row missing server-side by id; never
 * deletes or overwrites an existing row \u2014 see `src/lib/pm/api/import.ts`).
 */
export function importSnapshotJson(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as { data?: unknown } | PmSnapshot;
    const data =
      parsed && typeof parsed === "object" && "data" in parsed
        ? (parsed as { data: unknown }).data
        : parsed;
    if (!isPmSnapshot(data)) return false;
    void importWorkspaceSnapshot(data as PmSnapshot);
    return true;
  } catch {
    return false;
  }
}
