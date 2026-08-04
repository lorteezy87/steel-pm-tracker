import type {
  ChangeOrder,
  Delivery,
  DrawingSet,
  DrawingSheet,
  FabItem,
  InstallItem,
  Project,
  Rfi,
  Task,
} from "./types";

/** Serializable workspace shared across devices. */
export type PmSnapshot = {
  projects: Project[];
  drawingSets: DrawingSet[];
  drawingSheets: DrawingSheet[];
  fab: FabItem[];
  deliveries: Delivery[];
  install: InstallItem[];
  rfis: Rfi[];
  cos: ChangeOrder[];
  tasks: Task[];
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
    Array.isArray(o.tasks)
  );
}
