import type { Project } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const PROJECTS: EntityTable<Project> = {
  table: "projects",
  columns: {
    id: "id",
    code: "code",
    name: "name",
    client: "client",
    status: "status",
    startDate: "start_date",
    targetComplete: "target_complete",
    owner: "owner",
    notes: "notes",
  },
  nullableKeys: ["startDate", "targetComplete"],
};
