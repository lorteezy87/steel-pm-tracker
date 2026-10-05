import type { DrawingSet } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const DRAWING_SETS: EntityTable<DrawingSet> = {
  table: "drawing_sets",
  columns: {
    id: "id",
    projectId: "project_id",
    name: "name",
    type: "type",
    description: "description",
    submitted: "submitted",
    requiredBy: "required_by",
    status: "status",
    ballInCourt: "ball_in_court",
    owner: "owner",
    notes: "notes",
  },
  nullableKeys: ["submitted", "requiredBy"],
};
