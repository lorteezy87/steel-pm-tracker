import type { DrawingSheet } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const DRAWING_SHEETS: EntityTable<DrawingSheet> = {
  table: "drawing_sheets",
  columns: {
    id: "id",
    setId: "set_id",
    numberRev: "number_rev",
    description: "description",
    submitted: "submitted",
    requiredBy: "required_by",
    status: "status",
    ballInCourt: "ball_in_court",
    notes: "notes",
  },
  nullableKeys: ["submitted", "requiredBy"],
};
