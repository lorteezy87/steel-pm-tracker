import type { Submittal } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const SUBMITTALS: EntityTable<Submittal> = {
  table: "submittals",
  columns: {
    id: "id",
    projectId: "project_id",
    submittalNumber: "submittal_number",
    type: "type",
    title: "title",
    specSection: "spec_section",
    revision: "revision",
    submitted: "submitted",
    dueBack: "due_back",
    returned: "returned",
    status: "status",
    ballInCourt: "ball_in_court",
    linkedDrawingSet: "linked_drawing_set",
    owner: "owner",
    notes: "notes",
  },
  nullableKeys: ["submitted", "dueBack", "returned"],
};
