import type { Roadblock } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const ROADBLOCKS: EntityTable<Roadblock> = {
  table: "roadblocks",
  columns: {
    id: "id",
    projectId: "project_id",
    title: "title",
    category: "category",
    description: "description",
    raisedDate: "raised_date",
    ballInCourt: "ball_in_court",
    impact: "impact",
    severity: "severity",
    status: "status",
    resolvedDate: "resolved_date",
    linkedEntityType: "linked_entity_type",
    linkedEntityId: "linked_entity_id",
    owner: "owner",
    notes: "notes",
  },
  nullableKeys: ["raisedDate", "resolvedDate"],
};
