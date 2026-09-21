import { isDoneStatus } from "./complete";
import { buildLookahead, DEMO_TODAY, projectCode } from "./store";
import type { LookaheadItem, Priority } from "./types";

/**
 * Derived views over the trackers — no stored state of their own. Every bucket
 * is recomputed from the same records the tracker pages edit, so a smart list
 * can never drift out of step with the board.
 */

type State = Parameters<typeof buildLookahead>[0];

/** Far-future horizon: smart lists cover everything open, not a window. */
const ALL_TIME = "2099-12-31";

/** Statuses that mean work is actively underway, not queued or finished. */
const IN_PROGRESS_STATUSES = new Set([
  "in progress",
  "in fabrication",
  "cut",
  "fitted",
  "welded",
  "painted",
  "qc",
  "under review",
  "in transit",
  "on site",
  "staged",
  "erected",
  "bolted",
  "review",
]);

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Open records carrying NO driving date. `buildLookahead` only emits dated
 * items (that is its whole job), so the "Undated" bucket — the pile that never
 * surfaces on any calendar and quietly rots — needs its own pass.
 */
export function buildUndated(state: State): LookaheadItem[] {
  const items: LookaheadItem[] = [];
  const code = (id: string) => projectCode(state.projects, id);
  const push = (
    projectId: string,
    tracker: LookaheadItem["tracker"],
    id: string,
    description: string,
    owner: string,
    status: string,
    action: string,
    entityType: LookaheadItem["entityType"],
    entityId: string,
    priority: Priority = "Med",
    ballInCourt = "",
  ) => {
    items.push({
      projectCode: code(projectId),
      tracker,
      id,
      description,
      owner,
      due: "",
      status,
      priority,
      action,
      entityType,
      entityId,
      ballInCourt,
    });
  };

  for (const d of state.drawingSets) {
    if (d.requiredBy || isDoneStatus(d.status)) continue;
    push(d.projectId, "Drawings", d.name, d.description || d.type, d.owner, d.status,
      "Set a required-by date", "drawingSet", d.id, "Med", d.ballInCourt);
  }
  for (const sb of state.submittals) {
    if (sb.dueBack) continue;
    if (sb.status === "Approved" || sb.status === "Approved as Noted") continue;
    push(sb.projectId, "Submittals", sb.submittalNumber, `${sb.type} · ${sb.title}`,
      sb.ballInCourt || sb.owner, sb.status, "Set a due-back date", "submittal", sb.id,
      "Med", sb.ballInCourt);
  }
  for (const f of state.fab) {
    if (f.plannedDate || isDoneStatus(f.status)) continue;
    push(f.projectId, "Fabrication", f.workPackage, f.description, f.owner, f.status,
      "Schedule fab", "fab", f.id);
  }
  for (const dl of state.deliveries) {
    if (dl.plannedShip || isDoneStatus(dl.status)) continue;
    push(dl.projectId, "Delivery", dl.loadNumber, `Ship ${dl.pieceMarks}`, dl.owner,
      dl.status, "Schedule the truck", "delivery", dl.id);
  }
  for (const i of state.install) {
    if (i.plannedErect || isDoneStatus(i.status)) continue;
    push(i.projectId, "Installation", i.sequenceArea, `Erect ${i.pieceMarks}`, i.owner,
      i.status, "Schedule erection", "install", i.id);
  }
  for (const r of state.rfis) {
    if (r.responseDue || isDoneStatus(r.status)) continue;
    push(r.projectId, "RFIs", r.rfiNumber, r.subject, r.ballInCourt, r.status,
      "Set a response-due date", "rfi", r.id, "High", r.ballInCourt);
  }
  for (const c of state.cos) {
    if (c.decisionDue) continue;
    if (c.status === "Implemented" || c.status === "Rejected") continue;
    push(c.projectId, "Change Orders", c.coNumber, c.description, c.owner, c.status,
      "Set a decision-due date", "changeOrder", c.id, "Med",
      c.status === "Draft" ? "Us" : "GC");
  }
  for (const t of state.tasks) {
    if (t.due || isDoneStatus(t.status)) continue;
    push(t.projectId, "Tasks", t.category || "Task", t.task, t.owner, t.status,
      "Set a due date", "task", t.id, t.priority);
  }
  for (const wp of state.workPackages) {
    if (wp.plannedComplete || wp.plannedStart || isDoneStatus(wp.status)) continue;
    push(wp.projectId, "Work Packages", wp.code, wp.name || wp.description, wp.owner,
      wp.status, "Set plan dates", "workPackage", wp.id);
  }
  return items;
}

/** Every open item, dated or not. */
export function buildAllOpen(state: State): LookaheadItem[] {
  const dated = buildLookahead(state, ALL_TIME).filter((i) => !isDoneStatus(i.status));
  // An open roadblock with no target date is already emitted by buildLookahead
  // with `due` set to today, so it is not repeated here.
  return [...dated, ...buildUndated(state)];
}

export type SmartListId =
  | "in-progress"
  | "overdue"
  | "due-today"
  | "this-week"
  | "next-4-weeks"
  | "undated"
  | "ours"
  | "waiting"
  | "resubmit";

export interface SmartList {
  id: SmartListId;
  label: string;
  hint: string;
  tone?: "red" | "yellow";
}

export const SMART_LISTS: SmartList[] = [
  { id: "in-progress", label: "In Progress", hint: "Work actively underway" },
  { id: "overdue", label: "Overdue", hint: "Past its date and still open", tone: "red" },
  { id: "due-today", label: "Due Today", hint: "Lands today", tone: "yellow" },
  { id: "this-week", label: "This Week", hint: "Through Saturday" },
  { id: "next-4-weeks", label: "Next 4 Weeks", hint: "The near-term horizon" },
  { id: "undated", label: "Undated", hint: "Open with no date — the pile that rots" },
  { id: "ours", label: "Ball in Our Court", hint: "Ours to move" },
  { id: "waiting", label: "Waiting on Others", hint: "Chase these" },
  {
    id: "resubmit",
    label: "Revise & Resubmit",
    hint: "Back from review, gating the shop",
    tone: "red",
  },
];

const OURS = (bic: string) => bic.trim().toLowerCase() === "us";

export function filterSmartList(
  items: LookaheadItem[],
  id: SmartListId,
  today = DEMO_TODAY,
): LookaheadItem[] {
  // Week runs today → Saturday, matching how a lookahead is actually called.
  const dow = new Date(`${today}T12:00:00`).getDay();
  const endOfWeek = addDaysIso(today, 6 - dow);
  const end4Weeks = addDaysIso(today, 28);

  switch (id) {
    case "in-progress":
      return items.filter((i) => IN_PROGRESS_STATUSES.has(i.status.toLowerCase()));
    case "overdue":
      return items.filter((i) => i.due && i.due < today);
    case "due-today":
      return items.filter((i) => i.due === today);
    case "this-week":
      return items.filter((i) => i.due && i.due >= today && i.due <= endOfWeek);
    case "next-4-weeks":
      return items.filter((i) => i.due && i.due >= today && i.due <= end4Weeks);
    case "undated":
      return items.filter((i) => !i.due);
    case "ours":
      return items.filter((i) => OURS(i.ballInCourt));
    case "waiting":
      // Only items in a real review cycle. Fab/delivery/install/tasks carry no
      // ball-in-court — they're staffed by our own crew, not awaited.
      return items.filter((i) => i.ballInCourt.trim() !== "" && !OURS(i.ballInCourt));
    case "resubmit":
      return items.filter((i) => i.status === "Revise & Resubmit");
  }
}
