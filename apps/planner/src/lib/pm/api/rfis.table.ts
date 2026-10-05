import type { Rfi } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const RFIS: EntityTable<Rfi> = {
  table: "rfis",
  columns: {
    id: "id",
    projectId: "project_id",
    rfiNumber: "rfi_number",
    subject: "subject",
    issued: "issued",
    responseDue: "response_due",
    status: "status",
    ballInCourt: "ball_in_court",
    impact: "impact",
    linkedDrawing: "linked_drawing",
    notes: "notes",
  },
  nullableKeys: ["issued", "responseDue"],
};
