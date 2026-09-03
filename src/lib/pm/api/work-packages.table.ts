import type { WorkPackage } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const WORK_PACKAGES: EntityTable<WorkPackage> = {
  table: "work_packages",
  columns: {
    id: "id",
    projectId: "project_id",
    code: "code",
    name: "name",
    description: "description",
    status: "status",
    plannedStart: "planned_start",
    plannedComplete: "planned_complete",
    tonnage: "tonnage",
    owner: "owner",
    notes: "notes",
  },
  numericKeys: ["tonnage"],
  nullableKeys: ["plannedStart", "plannedComplete"],
};
