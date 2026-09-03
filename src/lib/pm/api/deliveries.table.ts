import type { Delivery } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const DELIVERIES: EntityTable<Delivery> = {
  table: "deliveries",
  columns: {
    id: "id",
    projectId: "project_id",
    workPackageId: "work_package_id",
    loadNumber: "load_number",
    pieceMarks: "piece_marks",
    plannedShip: "planned_ship",
    actualShip: "actual_ship",
    plannedArrival: "planned_arrival",
    actualArrival: "actual_arrival",
    status: "status",
    destination: "destination",
    owner: "owner",
    notes: "notes",
  },
  nullableKeys: ["plannedShip", "actualShip", "plannedArrival", "actualArrival"],
};
