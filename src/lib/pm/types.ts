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

export type SubmittalStatus =
  | "Not Submitted"
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Approved as Noted"
  | "Revise & Resubmit"
  | "Rejected";

/** Submittal package types a steel fabricator actually transmits. */
export type SubmittalType =
  | "Shop Drawings"
  | "Erection Drawings"
  | "Anchor Bolt Plan"
  | "Embed Plan"
  | "Mill Certs"
  | "Welder Quals"
  | "WPS / PQR"
  | "Bolt Certs"
  | "Paint / Coating"
  | "Galvanizing"
  | "Joists / Girders"
  | "Metal Deck"
  | "Grating / Handrail"
  | "Stairs"
  | "Erection Plan"
  | "Rigging / Lift Plan"
  | "Other";

export type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "Review"
  | "Complete"
  | "Blocked";

export type Priority = "High" | "Med" | "Low";

export type WorkPackageStatus =
  | "Planned"
  | "Released"
  | "In Fabrication"
  | "Ready to Ship"
  | "Shipped"
  | "Erected"
  | "Complete";

export type RoadblockCategory =
  | "Drawings"
  | "Fabrication"
  | "Delivery"
  | "Installation"
  | "RFI"
  | "ChangeOrder"
  | "Procurement"
  | "Safety"
  | "Other";

export type RoadblockImpact = "Schedule" | "Cost" | "Safety" | "Quality" | "Other";

export type RoadblockStatus = "Open" | "Resolved";

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

/** Discrete scope of work within a project — the parent for Fab/Delivery/Install. */
export interface WorkPackage {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description: string;
  status: WorkPackageStatus;
  plannedStart: string;
  plannedComplete: string;
  tonnage: number;
  owner: string;
  notes: string;
}

/** Fabrication tracked by work package (not individual piece marks). */
export interface FabItem {
  id: string;
  projectId: string;
  workPackage: string;
  /** Optional FK to a first-class WorkPackage record. */
  workPackageId?: string;
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
  /** Optional FK to a first-class WorkPackage record. */
  workPackageId?: string;
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
  /** Optional FK to a first-class WorkPackage record. */
  workPackageId?: string;
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
  /** Date the pricing went out. */
  submitted: string;
  /** Date an answer is needed before the change starts eating job float. */
  decisionDue: string;
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

/** Anything blocking progress on a project — optionally linked to another tracker record. */
export interface Roadblock {
  id: string;
  projectId: string;
  title: string;
  category: RoadblockCategory;
  description: string;
  raisedDate: string;
  ballInCourt: string;
  impact: RoadblockImpact;
  severity: Priority;
  status: RoadblockStatus;
  resolvedDate: string;
  /** Free-text link to another tracker record (RFI, CO, drawing set, …). */
  linkedEntityType: string;
  linkedEntityId: string;
  owner: string;
  notes: string;
}

/**
 * Formal submittal register entry — the contractual transmittal that carries a
 * package to the GC/EOR and comes back stamped. Distinct from `DrawingSet`:
 * that tracks the detailing deliverable sheet by sheet, this tracks the
 * submittal/return cycle (spec section, revision, ball in court, due back).
 */
export interface Submittal {
  id: string;
  projectId: string;
  submittalNumber: string;
  type: SubmittalType;
  title: string;
  specSection: string;
  revision: string;
  submitted: string;
  dueBack: string;
  returned: string;
  status: SubmittalStatus;
  ballInCourt: string;
  /** Free-text link back to the drawing set this submittal transmitted. */
  linkedDrawingSet: string;
  owner: string;
  notes: string;
}

/**
 * Daily field journal — one row per project per day. The erection-side record
 * that backs up delay claims and change-order time impacts.
 */
export interface JournalEntry {
  id: string;
  projectId: string;
  entryDate: string;
  weather: string;
  tempHigh: number;
  crewCount: number;
  manhours: number;
  tonsErected: number;
  workPerformed: string;
  delays: string;
  deliveriesReceived: string;
  visitors: string;
  safetyNotes: string;
  author: string;
}

export type TrackerName =
  | "Drawings"
  | "Fabrication"
  | "Delivery"
  | "Installation"
  | "RFIs"
  | "Change Orders"
  | "Tasks"
  | "Work Packages"
  | "Roadblocks"
  | "Submittals";

export type LookaheadEntityType =
  | "drawingSet"
  | "drawingSheet"
  | "fab"
  | "delivery"
  | "install"
  | "rfi"
  | "task"
  | "workPackage"
  | "roadblock"
  | "submittal"
  | "changeOrder";

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
  openRoadblocks: number;
  overdueRoadblocks: number;
  openSubmittals: number;
  overdueSubmittals: number;
  ballInCourtUs: number;
}
