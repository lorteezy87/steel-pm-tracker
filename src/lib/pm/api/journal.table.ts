import type { JournalEntry } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const JOURNAL_ENTRIES: EntityTable<JournalEntry> = {
  table: "journal_entries",
  columns: {
    id: "id",
    projectId: "project_id",
    entryDate: "entry_date",
    weather: "weather",
    tempHigh: "temp_high",
    crewCount: "crew_count",
    manhours: "manhours",
    tonsErected: "tons_erected",
    workPerformed: "work_performed",
    delays: "delays",
    deliveriesReceived: "deliveries_received",
    visitors: "visitors",
    safetyNotes: "safety_notes",
    author: "author",
  },
  numericKeys: ["tempHigh", "crewCount", "manhours", "tonsErected"],
};
