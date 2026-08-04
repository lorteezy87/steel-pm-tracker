import type { LookaheadEntityType } from "./types";
import type { usePmStore } from "./store";

type Store = ReturnType<typeof usePmStore.getState>;

/** Apply "done" status on the source row for any tracker entity. */
export function markEntityComplete(
  store: Pick<
    Store,
    | "updateDrawingSet"
    | "updateDrawingSheet"
    | "updateFab"
    | "updateDelivery"
    | "updateInstall"
    | "updateRfi"
    | "updateTask"
    | "updateCo"
    | "updateProject"
  >,
  entityType: LookaheadEntityType | "changeOrder" | "project",
  entityId: string,
) {
  switch (entityType) {
    case "drawingSet":
      store.updateDrawingSet(entityId, { status: "Approved" });
      break;
    case "drawingSheet":
      store.updateDrawingSheet(entityId, { status: "Approved" });
      break;
    case "fab":
      store.updateFab(entityId, { status: "Ready to Ship", pctComplete: 100 });
      break;
    case "delivery":
      store.updateDelivery(entityId, { status: "Delivered" });
      break;
    case "install":
      store.updateInstall(entityId, { status: "Complete", pctComplete: 100 });
      break;
    case "rfi":
      store.updateRfi(entityId, { status: "Closed" });
      break;
    case "task":
      store.updateTask(entityId, { status: "Complete" });
      break;
    case "changeOrder":
      store.updateCo(entityId, { status: "Implemented" });
      break;
    case "project":
      store.updateProject(entityId, { status: "Complete" });
      break;
  }
}

export function reopenEntity(
  store: Pick<
    Store,
    | "updateDrawingSet"
    | "updateDrawingSheet"
    | "updateFab"
    | "updateDelivery"
    | "updateInstall"
    | "updateRfi"
    | "updateTask"
    | "updateCo"
    | "updateProject"
  >,
  entityType: LookaheadEntityType | "changeOrder" | "project",
  entityId: string,
) {
  switch (entityType) {
    case "drawingSet":
    case "drawingSheet":
      store[
        entityType === "drawingSet" ? "updateDrawingSet" : "updateDrawingSheet"
      ](entityId, { status: "Under Review" });
      break;
    case "fab":
      store.updateFab(entityId, { status: "Welded", pctComplete: 70 });
      break;
    case "delivery":
      store.updateDelivery(entityId, { status: "Scheduled" });
      break;
    case "install":
      store.updateInstall(entityId, { status: "On Site", pctComplete: 20 });
      break;
    case "rfi":
      store.updateRfi(entityId, { status: "Open" });
      break;
    case "task":
      store.updateTask(entityId, { status: "In Progress" });
      break;
    case "changeOrder":
      store.updateCo(entityId, { status: "Under Review" });
      break;
    case "project":
      store.updateProject(entityId, { status: "Active" });
      break;
  }
}
