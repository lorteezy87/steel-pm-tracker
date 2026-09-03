import type { Task } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const TASKS: EntityTable<Task> = {
  table: "tasks",
  columns: {
    id: "id",
    projectId: "project_id",
    task: "task",
    category: "category",
    owner: "owner",
    due: "due",
    status: "status",
    priority: "priority",
    notes: "notes",
  },
  nullableKeys: ["due"],
};
