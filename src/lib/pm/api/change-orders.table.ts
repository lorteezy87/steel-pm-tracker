import type { ChangeOrder } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const CHANGE_ORDERS: EntityTable<ChangeOrder> = {
  table: "change_orders",
  columns: {
    id: "id",
    projectId: "project_id",
    coNumber: "co_number",
    description: "description",
    linked: "linked",
    cost: "cost",
    scheduleDays: "schedule_days",
    status: "status",
    owner: "owner",
    notes: "notes",
  },
  numericKeys: ["cost", "scheduleDays"],
};
