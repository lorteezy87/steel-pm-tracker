import type { PmSnapshot, WorkspaceResponse } from "./snapshot";
import { isPmSnapshot } from "./snapshot";
import { usePmStore } from "./store";

export type SyncStatus =
  | "idle"
  | "loading"
  | "saving"
  | "synced"
  | "offline"
  | "error";

let serverVersion = 0;
let syncStatus: SyncStatus = "idle";
let lastError: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let started = false;
let suppressPush = false;
const listeners = new Set<() => void>();

/** Cached snapshot for useSyncExternalStore (must be referentially stable). */
let metaSnapshot = {
  serverVersion: 0,
  syncStatus: "idle" as SyncStatus,
  lastError: null as string | null,
};

function refreshMetaSnapshot() {
  metaSnapshot = {
    serverVersion,
    syncStatus,
    lastError,
  };
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

function setStatus(s: SyncStatus, err: string | null = null) {
  if (syncStatus === s && lastError === err) return;
  syncStatus = s;
  lastError = err;
  emit();
}

export function snapshotFromStore(): PmSnapshot {
  const s = usePmStore.getState();
  return {
    projects: s.projects,
    drawingSets: s.drawingSets,
    drawingSheets: s.drawingSheets,
    fab: s.fab,
    deliveries: s.deliveries,
    install: s.install,
    rfis: s.rfis,
    cos: s.cos,
    tasks: s.tasks,
  };
}

export function applySnapshot(data: PmSnapshot) {
  suppressPush = true;
  usePmStore.setState({
    projects: data.projects,
    drawingSets: data.drawingSets,
    drawingSheets: data.drawingSheets,
    fab: data.fab,
    deliveries: data.deliveries,
    install: data.install,
    rfis: data.rfis,
    cos: data.cos,
    tasks: data.tasks,
  });
  queueMicrotask(() => {
    suppressPush = false;
  });
}

export async function pullWorkspace(): Promise<boolean> {
  setStatus("loading");
  try {
    const res = await fetch("/api/pm/workspace", { cache: "no-store" });
    if (!res.ok) throw new Error(`Load failed (${res.status})`);
    const body = (await res.json()) as WorkspaceResponse;
    if (body.version !== serverVersion) {
      serverVersion = body.version || 0;
      emit();
    } else {
      serverVersion = body.version || 0;
    }
    if (body.data && isPmSnapshot(body.data)) {
      applySnapshot(body.data);
    } else if ((body.version || 0) === 0) {
      await pushWorkspace(true);
      return true;
    }
    setStatus("synced");
    return true;
  } catch (e) {
    setStatus("offline", e instanceof Error ? e.message : "Offline");
    return false;
  }
}

export async function pushWorkspace(force = false): Promise<boolean> {
  if (suppressPush && !force) return false;
  setStatus("saving");
  try {
    const data = snapshotFromStore();
    const res = await fetch("/api/pm/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data,
        expectedVersion: force ? undefined : serverVersion || undefined,
      }),
    });

    if (res.status === 409) {
      const conflict = (await res.json()) as {
        data?: PmSnapshot;
        version?: number;
      };
      if (conflict.data && isPmSnapshot(conflict.data)) {
        serverVersion = conflict.version || serverVersion;
        emit();
        applySnapshot(conflict.data);
      } else {
        await pullWorkspace();
      }
      setStatus("synced");
      return true;
    }

    if (!res.ok) throw new Error(`Save failed (${res.status})`);
    const body = (await res.json()) as WorkspaceResponse;
    serverVersion = body.version || serverVersion + 1;
    emit();
    setStatus("synced");
    return true;
  } catch (e) {
    setStatus("offline", e instanceof Error ? e.message : "Save failed");
    return false;
  }
}

function schedulePush() {
  if (suppressPush) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void pushWorkspace();
  }, 700);
}

/** Start shared multi-device sync (call once from client). */
export function startPmSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  void pullWorkspace();

  usePmStore.subscribe((state, prev) => {
    if (suppressPush) return;
    const keys = [
      "projects",
      "drawingSets",
      "drawingSheets",
      "fab",
      "deliveries",
      "install",
      "rfis",
      "cos",
      "tasks",
    ] as const;
    const changed = keys.some((k) => state[k] !== prev[k]);
    if (changed) schedulePush();
  });

  pollTimer = setInterval(() => {
    void (async () => {
      if (syncStatus === "saving" || syncStatus === "loading") return;
      try {
        const res = await fetch("/api/pm/workspace", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as WorkspaceResponse;
        if (body.version > serverVersion && body.data && isPmSnapshot(body.data)) {
          serverVersion = body.version;
          emit();
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
  if (saveTimer) clearTimeout(saveTimer);
  if (pollTimer) clearInterval(pollTimer);
  started = false;
}

export function exportSnapshotJson(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: serverVersion,
      data: snapshotFromStore(),
    },
    null,
    2,
  );
}

export function importSnapshotJson(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as { data?: unknown } | PmSnapshot;
    const data =
      parsed && typeof parsed === "object" && "data" in parsed
        ? (parsed as { data: unknown }).data
        : parsed;
    if (!isPmSnapshot(data)) return false;
    applySnapshot(data);
    void pushWorkspace(true);
    return true;
  } catch {
    return false;
  }
}
