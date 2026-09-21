import type { InstallItem } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const INSTALL_ITEMS: EntityTable<InstallItem> = {
  table: "install_items",
  columns: {
    id: "id",
    projectId: "project_id",
    workPackageId: "work_package_id",
    sequenceArea: "sequence_area",
    pieceMarks: "piece_marks",
    plannedErect: "planned_erect",
    status: "status",
    pctComplete: "pct_complete",
    crew: "crew",
    owner: "owner",
    notes: "notes",
  },
  numericKeys: ["pctComplete"],
  nullableKeys: ["plannedErect"],
};
