import type {
  ChangeOrder,
  Delivery,
  DrawingSet,
  DrawingSheet,
  FabItem,
  InstallItem,
  JournalEntry,
  Project,
  Rfi,
  Roadblock,
  Submittal,
  Task,
  WorkPackage,
} from "./types";

/** Serializable workspace shared across devices. */
export type PmSnapshot = {
  projects: Project[];
  workPackages: WorkPackage[];
  drawingSets: DrawingSet[];
  drawingSheets: DrawingSheet[];
  fab: FabItem[];
  deliveries: Delivery[];
  install: InstallItem[];
  rfis: Rfi[];
  cos: ChangeOrder[];
  roadblocks: Roadblock[];
  tasks: Task[];
  submittals: Submittal[];
  journal: JournalEntry[];
};

export type WorkspaceResponse = {
  id: string;
  version: number;
  updatedAt: string | null;
  data: PmSnapshot | null;
  source: "server" | "empty";
};

export function isPmSnapshot(v: unknown): v is PmSnapshot {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.projects) &&
    Array.isArray(o.drawingSets) &&
    Array.isArray(o.drawingSheets) &&
    Array.isArray(o.fab) &&
    Array.isArray(o.deliveries) &&
    Array.isArray(o.install) &&
    Array.isArray(o.rfis) &&
    Array.isArray(o.cos) &&
    Array.isArray(o.tasks) &&
    // Older exported snapshots (pre relational-upgrade) won't have these —
    // treat them as optional so `importSnapshotJson` can still backfill.
    (o.workPackages === undefined || Array.isArray(o.workPackages)) &&
    (o.roadblocks === undefined || Array.isArray(o.roadblocks)) &&
    (o.submittals === undefined || Array.isArray(o.submittals)) &&
    (o.journal === undefined || Array.isArray(o.journal))
  );
}
