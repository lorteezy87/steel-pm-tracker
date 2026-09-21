import type { CalendarEvent } from "./calendar-events";
import type { TrackerName } from "./types";

/**
 * Turns dated tracker records into a clock-laid-out day.
 *
 * Nothing in the tracker carries a time of day — a delivery has a date, not a
 * 7:15 AM. Rather than make every row carry a meaningless time field, each
 * event kind gets the slot it actually occupies in a steel PM's day: trucks
 * leave the shop at first light, the crew is on steel all morning, reviews and
 * paperwork land midday, and office follow-up sits in the afternoon. That gives
 * the Timeline a realistic shape and keeps the Today view ordered the way the
 * day is actually worked, without asking anyone to key in times.
 */

export type DayPeriod = "Morning" | "Afternoon" | "Evening";

export interface DayBlock {
  event: CalendarEvent;
  /** Minutes from midnight. */
  start: number;
  end: number;
  period: DayPeriod;
  /** Column index + column count, for laying overlapping blocks side by side. */
  lane: number;
  laneCount: number;
}

export interface FreeGap {
  start: number;
  end: number;
}

/** Workday bounds the Timeline renders between. */
export const DAY_START = 5 * 60;
export const DAY_END = 19 * 60;

interface Slot {
  start: number;
  minutes: number;
}

const DEFAULT_SLOT: Slot = { start: 15 * 60, minutes: 60 };

/** `${tracker}|${kind}` → slot. Falls back to `${tracker}|*`, then DEFAULT_SLOT. */
const SLOTS: Record<string, Slot> = {
  // Shop and field — the morning half of the day.
  "Delivery|ship": { start: 6 * 60, minutes: 60 },
  "Installation|erect": { start: 6 * 60 + 30, minutes: 240 },
  "Delivery|arrival": { start: 7 * 60, minutes: 60 },
  "Fabrication|planned": { start: 8 * 60, minutes: 120 },
  "Work Packages|*": { start: 9 * 60, minutes: 60 },
  // Review cycle — what lands on the desk mid-morning.
  "Submittals|due": { start: 10 * 60, minutes: 60 },
  "Drawings|due": { start: 10 * 60 + 30, minutes: 60 },
  "Submittals|returned": { start: 11 * 60, minutes: 30 },
  "Submittals|issued": { start: 11 * 60 + 30, minutes: 30 },
  "Drawings|issued": { start: 11 * 60 + 30, minutes: 30 },
  "RFIs|issued": { start: 12 * 60, minutes: 30 },
  // Afternoon: chasing answers and closing paper.
  "RFIs|due": { start: 13 * 60, minutes: 60 },
  "Change Orders|*": { start: 14 * 60, minutes: 60 },
  "Roadblocks|*": { start: 14 * 60, minutes: 60 },
  "Tasks|due": { start: 15 * 60, minutes: 60 },
};

export function slotFor(tracker: TrackerName, kind: string): Slot {
  return SLOTS[`${tracker}|${kind}`] ?? SLOTS[`${tracker}|*`] ?? DEFAULT_SLOT;
}

export function periodOf(minutes: number): DayPeriod {
  if (minutes < 12 * 60) return "Morning";
  if (minutes < 17 * 60) return "Afternoon";
  return "Evening";
}

export const DAY_PERIODS: DayPeriod[] = ["Morning", "Afternoon", "Evening"];

/**
 * Lays the events falling on `iso` onto the clock, packing overlapping blocks
 * into side-by-side lanes (first lane whose previous block has already ended).
 */
export function buildDayPlan(events: CalendarEvent[], iso: string): DayBlock[] {
  const onDay = events.filter((e) => e.date === iso);
  const blocks: DayBlock[] = onDay
    .map((event) => {
      const slot = slotFor(event.tracker, event.kind);
      return {
        event,
        start: slot.start,
        end: slot.start + slot.minutes,
        period: periodOf(slot.start),
        lane: 0,
        laneCount: 1,
      };
    })
    .sort((a, b) => a.start - b.start || a.event.title.localeCompare(b.event.title));

  // Pack into lanes, then give every block in one overlapping cluster the same
  // laneCount so they render as equal-width columns.
  const laneEnds: number[] = [];
  let cluster: DayBlock[] = [];
  let clusterEnd = -1;

  const closeCluster = () => {
    if (cluster.length === 0) return;
    const width = Math.max(...cluster.map((b) => b.lane)) + 1;
    for (const b of cluster) b.laneCount = width;
    cluster = [];
    laneEnds.length = 0;
  };

  for (const block of blocks) {
    if (block.start >= clusterEnd) {
      closeCluster();
      clusterEnd = block.end;
    } else {
      clusterEnd = Math.max(clusterEnd, block.end);
    }
    let lane = laneEnds.findIndex((end) => end <= block.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(block.end);
    } else {
      laneEnds[lane] = block.end;
    }
    block.lane = lane;
    cluster.push(block);
  }
  closeCluster();

  return blocks;
}

/** Unbooked stretches of at least `minMinutes` inside the workday. */
export function freeGaps(blocks: DayBlock[], minMinutes = 45): FreeGap[] {
  const busy = blocks
    .map((b) => ({ start: b.start, end: b.end }))
    .sort((a, b) => a.start - b.start);

  // Merge overlaps first so a gap is measured against the real booked span.
  const merged: FreeGap[] = [];
  for (const span of busy) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else merged.push({ ...span });
  }

  const gaps: FreeGap[] = [];
  let cursor = DAY_START;
  for (const span of merged) {
    if (span.start - cursor >= minMinutes) gaps.push({ start: cursor, end: span.start });
    cursor = Math.max(cursor, span.end);
  }
  if (DAY_END - cursor >= minMinutes) gaps.push({ start: cursor, end: DAY_END });
  return gaps;
}

export function formatClock(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "p" : "a";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h}:00${suffix}` : `${h}:${String(m).padStart(2, "0")}${suffix}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatLongDate(iso: string): { day: string; month: string; weekday: string } {
  const d = new Date(`${iso}T12:00:00`);
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString("en-US", { month: "long" }).toUpperCase(),
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase(),
  };
}

/** ISO week number — the left-hand gutter numbers on the Planner year grid. */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Shift to the Thursday of this ISO week, then count weeks from Jan 4.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
