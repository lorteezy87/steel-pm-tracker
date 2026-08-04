import { Cloud, CloudOff, Download, Link2, Loader2, Upload } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  exportSnapshotJson,
  getSyncMeta,
  importSnapshotJson,
  pullWorkspace,
  pushWorkspace,
  startPmSync,
  subscribeSyncMeta,
} from "@/lib/pm/sync";
import { usePmStore } from "@/lib/pm/store";
import { cn } from "@/lib/utils";

export function WorkspaceSyncBootstrap() {
  useEffect(() => {
    const start = () => startPmSync();
    const persistApi = (
      usePmStore as unknown as {
        persist?: {
          hasHydrated?: () => boolean;
          onFinishHydration?: (fn: () => void) => () => void;
        };
      }
    ).persist;

    if (persistApi?.hasHydrated?.()) {
      start();
    } else if (persistApi?.onFinishHydration) {
      const unsub = persistApi.onFinishHydration(() => start());
      // fallback if hydration already finished without event
      window.setTimeout(() => {
        if (!persistApi.hasHydrated?.()) start();
      }, 500);
      return unsub;
    } else {
      start();
    }
  }, []);
  return null;
}

export function SyncStatusChip() {
  const meta = useSyncExternalStore(subscribeSyncMeta, getSyncMeta, getSyncMeta);

  const label =
    meta.syncStatus === "loading"
      ? "Loading shared data…"
      : meta.syncStatus === "saving"
        ? "Saving to team…"
        : meta.syncStatus === "synced"
          ? "Synced · all devices"
          : meta.syncStatus === "offline"
            ? "Offline · local only"
            : meta.syncStatus === "error"
              ? "Sync error"
              : "Ready";

  const Icon =
    meta.syncStatus === "loading" || meta.syncStatus === "saving"
      ? Loader2
      : meta.syncStatus === "offline" || meta.syncStatus === "error"
        ? CloudOff
        : Cloud;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]",
        meta.syncStatus === "synced"
          ? "border-status-green/30 bg-status-green/10 text-status-green"
          : meta.syncStatus === "offline" || meta.syncStatus === "error"
            ? "border-status-yellow/30 bg-status-yellow/10 text-status-yellow"
            : "border-border bg-surface-2 text-muted",
      )}
      title={meta.lastError ?? label}
    >
      <Icon
        className={cn(
          "size-3.5",
          (meta.syncStatus === "loading" || meta.syncStatus === "saving") &&
            "animate-spin",
        )}
      />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

export function ShareAccessPanel() {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const meta = useSyncExternalStore(subscribeSyncMeta, getSyncMeta, getSyncMeta);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(origin || window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg("Copy failed — select the URL manually.");
    }
  }

  function downloadJson() {
    const blob = new Blob([exportSnapshotJson()], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `steel-pm-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Exported workspace JSON.");
  }

  function onImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importSnapshotJson(String(reader.result ?? ""));
      setMsg(ok ? "Imported and pushed to shared workspace." : "Invalid workspace file.");
    };
    reader.readAsText(file);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/15 p-2 text-primary">
          <Link2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-fg">Team access</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Open this same URL on any computer or phone. Changes sync to the shared
            workspace automatically (every few seconds).
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="block min-w-0 flex-1 truncate rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-primary">
              {origin || "…"}
            </code>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="h-9 shrink-0 rounded-md bg-primary px-3 text-xs font-semibold text-primary-fg hover:bg-primary-dim"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void pullWorkspace()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 text-xs text-fg hover:border-primary/40"
            >
              Refresh from team
            </button>
            <button
              type="button"
              onClick={() => void pushWorkspace(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 text-xs text-fg hover:border-primary/40"
            >
              Push now
            </button>
            <button
              type="button"
              onClick={downloadJson}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 text-xs text-fg hover:border-primary/40"
            >
              <Download className="size-3.5" />
              Export JSON
            </button>
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 text-xs text-fg hover:border-primary/40">
              <Upload className="size-3.5" />
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportFile(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-subtle">
            Sync: {meta.syncStatus}
            {meta.serverVersion ? ` · v${meta.serverVersion}` : ""}
            {msg ? ` · ${msg}` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
