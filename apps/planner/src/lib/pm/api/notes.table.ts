import type { Note } from "@/lib/pm/types";
import type { EntityTable } from "./entity-crud";

export const NOTES: EntityTable<Note> = {
  table: "notes",
  columns: {
    id: "id",
    projectId: "project_id",
    noteDate: "note_date",
    noteTime: "note_time",
    title: "title",
    body: "body",
    pinned: "pinned",
    triaged: "triaged",
    author: "author",
  },
  // projectId is nullable here (unlike every other entity): an untriaged field
  // capture may not be attached to a job yet.
  nullableKeys: ["projectId", "noteDate"],
};
