import type {
  CoStatus,
  DeliveryStatus,
  DrawingStatus,
  FabStatus,
  InstallStatus,
  Priority,
  ProjectStatus,
  RfiStatus,
  TaskStatus,
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

export const TASK_STATUSES: TaskStatus[] = [
  "Not Started",
  "In Progress",
  "Review",
  "Complete",
  "Blocked",
];

export const PRIORITIES: Priority[] = ["High", "Med", "Low"];

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
    s === "ready to ship"
  )
    return "green";
  if (
    s === "under review" ||
    s === "review" ||
    s === "submitted" ||
    s === "draft" ||
    s === "qc"
  )
    return "yellow";
  if (
    s === "not started" ||
    s === "not submitted" ||
    s === "on hold" ||
    s === "released"
  )
    return "gray";
  return "blue";
}

export const TONE_CLASSES: Record<ReturnType<typeof statusTone>, string> = {
  gray: "bg-status-gray/20 text-status-gray border-status-gray/30",
  blue: "bg-status-blue/20 text-status-blue border-status-blue/30",
  yellow: "bg-status-yellow/20 text-status-yellow border-status-yellow/30",
  green: "bg-status-green/20 text-status-green border-status-green/30",
  red: "bg-status-red/20 text-status-red border-status-red/30",
};

export const NAV_ITEMS = [
  { to: "/", label: "KPI Board", icon: "LayoutDashboard" as const },
  { to: "/calendar", label: "Calendar", icon: "CalendarRange" as const },
  { to: "/projects", label: "Projects", icon: "Building2" as const },
  { to: "/drawings", label: "Drawings", icon: "FileStack" as const },
  { to: "/fabrication", label: "Fabrication", icon: "Hammer" as const },
  { to: "/delivery", label: "Delivery", icon: "Truck" as const },
  { to: "/installation", label: "Installation", icon: "HardHat" as const },
  { to: "/rfis", label: "RFIs", icon: "MessageSquareWarning" as const },
  { to: "/changes", label: "Change Orders", icon: "FilePenLine" as const },
  { to: "/tasks", label: "Tasks", icon: "ListTodo" as const },
  { to: "/lookahead-48h", label: "48h Lookahead", icon: "Clock" as const },
  { to: "/lookahead-10d", label: "10d Lookahead", icon: "CalendarDays" as const },
  { to: "/access", label: "Team Access", icon: "Share2" as const },
] as const;
