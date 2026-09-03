import type { FabItem } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const FAB_ITEMS: EntityTable<FabItem> = {
  table: "fab_items",
  columns: {
    id: "id",
    projectId: "project_id",
    workPackageId: "work_package_id",
    workPackage: "work_package_label",
    description: "description",
    qty: "qty",
    weightTons: "weight_tons",
    drawingRef: "drawing_ref",
    status: "status",
    pctComplete: "pct_complete",
    shop: "shop",
    plannedDate: "planned_date",
    owner: "owner",
    notes: "notes",
  },
  numericKeys: ["qty", "weightTons", "pctComplete"],
  nullableKeys: ["plannedDate"],
};
