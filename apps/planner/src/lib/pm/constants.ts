import type {
  CoStatus,
  DeliveryStatus,
  DrawingStatus,
  FabStatus,
  InstallStatus,
  Priority,
  ProjectStatus,
  RfiStatus,
  RoadblockCategory,
  RoadblockImpact,
  RoadblockStatus,
  SubmittalStatus,
  SubmittalType,
  TagColor,
  TaskStatus,
  WorkPackageStatus,
} from "./types";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "Active",
  "On Hold",
  "Complete",
  "Cancelled",
];

export const DRAWING_STATUSES: DrawingStatus[] = [
  "Not Submitted",
  "Submitted",
  "Under Review",
  "Approved",
  "Approved as Noted",
  "R&R",
  "Rejected",
];

export const FAB_STATUSES: FabStatus[] = [
  "Released",
  "Cut",
  "Fitted",
  "Welded",
  "Painted",
  "QC",
  "Ready to Ship",
];

export const DELIVERY_STATUSES: DeliveryStatus[] = [
  "Scheduled",
  "In Transit",
  "Delivered",
  "Verified",
];

export const INSTALL_STATUSES: InstallStatus[] = [
  "On Site",
  "Staged",
  "Erected",
  "Bolted",
  "Inspected",
  "Complete",
];

export const RFI_STATUSES: RfiStatus[] = ["Open", "Answered", "Closed"];

export const CO_STATUSES: CoStatus[] = [
  "Draft",
  "Submitted",
  "Under Review",
  "Approved",
  "Rejected",
  "Implemented",
];

export const SUBMITTAL_STATUSES: SubmittalStatus[] = [
  "Not Submitted",
  "Submitted",
  "Under Review",
  "Approved",
  "Approved as Noted",
  "Revise & Resubmit",
  "Rejected",
];

export const SUBMITTAL_TYPES: SubmittalType[] = [
  "Shop Drawings",
  "Erection Drawings",
  "Anchor Bolt Plan",
  "Embed Plan",
  "Mill Certs",
  "Welder Quals",
  "WPS / PQR",
  "Bolt Certs",
  "Paint / Coating",
  "Galvanizing",
  "Joists / Girders",
  "Metal Deck",
  "Grating / Handrail",
  "Stairs",
  "Erection Plan",
  "Rigging / Lift Plan",
  "Other",
];

/** Who we're waiting on. Drives the "ball in court" split on the Today view. */
export const BALL_IN_COURT = ["Us", "GC", "EOR", "Architect", "Owner", "Vendor"] as const;

export const TASK_STATUSES: TaskStatus[] = [
  "Not Started",
  "In Progress",
  "Review",
  "Complete",
  "Blocked",
];

export const PRIORITIES: Priority[] = ["High", "Med", "Low"];

export const WORK_PACKAGE_STATUSES: WorkPackageStatus[] = [
  "Planned",
  "Released",
  "In Fabrication",
  "Ready to Ship",
  "Shipped",
  "Erected",
  "Complete",
];

export const ROADBLOCK_CATEGORIES: RoadblockCategory[] = [
  "Drawings",
  "Fabrication",
  "Delivery",
  "Installation",
  "RFI",
  "ChangeOrder",
  "Procurement",
  "Safety",
  "Other",
];

export const ROADBLOCK_IMPACTS: RoadblockImpact[] = [
  "Schedule",
  "Cost",
  "Safety",
  "Quality",
  "Other",
];

export const ROADBLOCK_STATUSES: RoadblockStatus[] = ["Open", "Resolved"];

export const TAG_COLORS: TagColor[] = [
  "steel",
  "blue",
  "green",
  "yellow",
  "red",
  "purple",
  "gray",
];

/** Tag color token → border/background/text classes. */
export const TAG_COLOR_CLASSES: Record<TagColor, string> = {
  steel: "bg-accent-steel/20 text-accent-steel border-accent-steel/40",
  blue: "bg-status-blue/20 text-status-blue border-status-blue/40",
  green: "bg-status-green/20 text-status-green border-status-green/40",
  yellow: "bg-status-yellow/20 text-status-yellow border-status-yellow/40",
  red: "bg-status-red/20 text-status-red border-status-red/40",
  purple: "bg-[#a78bfa]/20 text-[#a78bfa] border-[#a78bfa]/40",
  gray: "bg-status-gray/20 text-status-gray border-status-gray/40",
};

/**
 * The second row of the nav, behind the chevron — the reference app's
 * Journal / Lists / Smart Lists / Notes / Tags strip.
 */
export const SECONDARY_NAV = [
  { to: "/journal", label: "Journal", icon: "NotebookPen" as const },
  { to: "/lists", label: "Lists", icon: "ListTree" as const },
  { to: "/smart-lists", label: "Smart Lists", icon: "Sparkles" as const },
  { to: "/inbox", label: "Inbox", icon: "Inbox" as const },
  { to: "/notes", label: "Notes", icon: "StickyNote" as const },
  { to: "/tags", label: "Tags", icon: "TagIcon" as const },
] as const;

/** Status → semantic color class tokens */
export function statusTone(status: string): "gray" | "blue" | "yellow" | "green" | "red" {
  const s = status.toLowerCase();
  if (s === "high") return "red";
  if (s === "med" || s === "medium") return "yellow";
  if (s === "low") return "gray";
  if (
    s.includes("overdue") ||
    s === "blocked" ||
    s === "rejected" ||
    s === "r&r" ||
    s === "revise & resubmit" ||
    s === "cancelled"
  )
    return "red";
  if (
    s === "complete" ||
    s === "approved" ||
    s === "approved as noted" ||
    s === "answered" ||
    s === "closed" ||
    s === "verified" ||
    s === "delivered" ||
    s === "implemented" ||
    s === "ready to ship" ||
    s === "resolved" ||
    s === "erected"
  )
    return "green";
  if (
    s === "under review" ||
    s === "review" ||
    s === "submitted" ||
    s === "draft" ||
    s === "qc" ||
    s === "in fabrication" ||
    s === "shipped"
  )
    return "yellow";
  if (
    s === "not started" ||
    s === "not submitted" ||
    s === "on hold" ||
    s === "released" ||
    s === "planned"
  )
    return "gray";
  if (s === "open") return "red";
  return "blue";
}

export const TONE_CLASSES: Record<ReturnType<typeof statusTone>, string> = {
  gray: "bg-status-gray/20 text-status-gray border-status-gray/30",
  blue: "bg-status-blue/20 text-status-blue border-status-blue/30",
  yellow: "bg-status-yellow/20 text-status-yellow border-status-yellow/30",
  green: "bg-status-green/20 text-status-green border-status-green/30",
  red: "bg-status-red/20 text-status-red border-status-red/30",
};

/**
 * The five top-level planner views (the floating pill nav). These are the
 * day-to-day driving surfaces; PANEL_SECTIONS below is the per-tracker drill-down.
 */
export const PLANNER_NAV = [
  { to: "/", label: "Today", icon: "Sun" as const },
  { to: "/timeline", label: "Timeline", icon: "GanttChartSquare" as const },
  { to: "/planner", label: "Planner", icon: "CalendarRange" as const },
  { to: "/journal", label: "Journal", icon: "NotebookPen" as const },
  { to: "/lists", label: "Lists", icon: "ListTree" as const },
] as const;

/**
 * The trackers, grouped, as they appear in the command panel. This app has no
 * permanent rail — the panel is opened on demand, so the day-to-day planner
 * views stay uncluttered and the record-level tables are one keystroke away
 * rather than always on screen.
 */
export const PANEL_SECTIONS = [
  {
    label: "Workflow",
    items: [
      { to: "/drawings", label: "Detailing", icon: "FileStack" as const },
      { to: "/submittals", label: "Submittals", icon: "Send" as const },
      { to: "/fabrication", label: "Fabrication", icon: "Hammer" as const },
      { to: "/delivery", label: "Delivery", icon: "Truck" as const },
      { to: "/installation", label: "Installation", icon: "HardHat" as const },
    ],
  },
  {
    label: "Commercial",
    items: [
      { to: "/rfis", label: "RFIs", icon: "MessageSquareWarning" as const },
      { to: "/changes", label: "Change Orders", icon: "FilePenLine" as const },
      { to: "/roadblocks", label: "Roadblocks", icon: "AlertTriangle" as const },
    ],
  },
  {
    label: "Planning",
    items: [
      { to: "/projects", label: "Projects", icon: "Building2" as const },
      { to: "/work-packages", label: "Work Packages", icon: "PackageSearch" as const },
      { to: "/tasks", label: "Tasks", icon: "ListTodo" as const },
    ],
  },
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" as const },
      { to: "/calendar", label: "Calendar", icon: "CalendarRange" as const },
      { to: "/lookahead-48h", label: "48h Lookahead", icon: "Clock" as const },
      { to: "/lookahead-10d", label: "10d Lookahead", icon: "CalendarDays" as const },
      { to: "/access", label: "Team Access", icon: "Share2" as const },
    ],
  },
] as const;
