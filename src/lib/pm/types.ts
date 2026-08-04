export type ProjectStatus = "Active" | "On Hold" | "Complete" | "Cancelled";

export type DrawingStatus =
  | "Not Submitted"
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Approved as Noted"
  | "R&R"
  | "Rejected";

export type FabStatus =
  | "Released"
  | "Cut"
  | "Fitted"
  | "Welded"
  | "Painted"
  | "QC"
  | "Ready to Ship";

export type DeliveryStatus = "Scheduled" | "In Transit" | "Delivered" | "Verified";

export type InstallStatus =
  | "On Site"
  | "Staged"
  | "Erected"
  | "Bolted"
  | "Inspected"
  | "Complete";

export type RfiStatus = "Open" | "Answered" | "Closed";

export type CoStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Rejected"
  | "Implemented";

export type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "Review"
  | "Complete"
  | "Blocked";

export type Priority = "High" | "Med" | "Low";

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  status: ProjectStatus;
  startDate: string;
  targetComplete: string;
  owner: string;
  notes: string;
}

/** Parent: named drawing set (package / issue). */
export interface DrawingSet {
  id: string;
  projectId: string;
  name: string;
  type: string;
  description: string;
  submitted: string;
  requiredBy: string;
  status: DrawingStatus;
  ballInCourt: string;
  owner: string;
  notes: string;
}

/** Child: individual sheet within a set. */
export interface DrawingSheet {
  id: string;
  setId: string;
  numberRev: string;
  description: string;
  submitted: string;
  requiredBy: string;
  status: DrawingStatus;
  ballInCourt: string;
  notes: string;
}

/** Fabrication tracked by work package (not individual piece marks). */
export interface FabItem {
  id: string;
  projectId: string;
  workPackage: string;
  description: string;
  qty: number;
  weightTons: number;
  drawingRef: string;
  status: FabStatus;
  pctComplete: number;
  shop: string;
  plannedDate: string;
  owner: string;
  notes: string;
}

export interface Delivery {
  id: string;
  projectId: string;
  loadNumber: string;
  /** Work package(s) or piece list on the truck */
  pieceMarks: string;
  plannedShip: string;
  actualShip: string;
  plannedArrival: string;
  actualArrival: string;
  status: DeliveryStatus;
  destination: string;
  owner: string;
  notes: string;
}

export interface InstallItem {
  id: string;
  projectId: string;
  sequenceArea: string;
  /** Work package or area scope */
  pieceMarks: string;
  plannedErect: string;
  status: InstallStatus;
  pctComplete: number;
  crew: string;
  owner: string;
  notes: string;
}

export interface Rfi {
  id: string;
  projectId: string;
  rfiNumber: string;
  subject: string;
  issued: string;
  responseDue: string;
  status: RfiStatus;
  ballInCourt: string;
  impact: string;
  linkedDrawing: string;
  notes: string;
}

export interface ChangeOrder {
  id: string;
  projectId: string;
  coNumber: string;
  description: string;
  linked: string;
  cost: number;
  scheduleDays: number;
  status: CoStatus;
  owner: string;
  notes: string;
}

export interface Task {
  id: string;
  projectId: string;
  task: string;
  category: string;
  owner: string;
  due: string;
  status: TaskStatus;
  priority: Priority;
  notes: string;
}

export type TrackerName =
  | "Drawings"
  | "Fabrication"
  | "Delivery"
  | "Installation"
  | "RFIs"
  | "Change Orders"
  | "Tasks";

export type LookaheadEntityType =
  | "drawingSet"
  | "drawingSheet"
  | "fab"
  | "delivery"
  | "install"
  | "rfi"
  | "task";

export interface LookaheadItem {
  projectCode: string;
  tracker: TrackerName;
  id: string;
  description: string;
  owner: string;
  due: string;
  status: string;
  priority: Priority;
  action: string;
  entityType: LookaheadEntityType;
  entityId: string;
}

export interface KpiSnapshot {
  activeProjects: number;
  openRfis: number;
  overdueRfis: number;
  fabPct: number;
  installPct: number;
  totalOverdue: number;
  onTimeDeliveryPct: number;
  pendingCoValue: number;
  due48h: number;
  due10d: number;
}
