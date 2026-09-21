import { projectCode } from "./store";
import type { EntityTag, Note, Project, Tag, TaggableType, TrackerName } from "./types";

/**
 * Flat search index across every tracker. Built on demand from the store
 * (the whole dataset is a few hundred rows for a PM's active jobs), so there
 * is no index to invalidate when a record changes.
 */

export interface SearchHit {
  key: string;
  tracker: TrackerName | "Notes" | "Projects";
  entityType: TaggableType;
  entityId: string;
  title: string;
  subtitle: string;
  projectCode: string;
  status: string;
  date: string;
  href: string;
  /** Lower-cased haystack the query is matched against. */
  haystack: string;
}

type SearchState = {
  projects: Project[];
  notes: Note[];
  tags: Tag[];
  entityTags: EntityTag[];
} & Record<string, unknown>;

function hit(h: Omit<SearchHit, "haystack">): SearchHit {
  return {
    ...h,
    haystack:
      `${h.title} ${h.subtitle} ${h.projectCode} ${h.status}`.toLowerCase(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSearchIndex(state: any): SearchHit[] {
  const s = state as SearchState & Record<string, any[]>;
  const code = (id: string) => (id ? projectCode(s.projects, id) : "");
  const out: SearchHit[] = [];

  for (const p of s.projects) {
    out.push(hit({
      key: `project-${p.id}`, tracker: "Projects", entityType: "project", entityId: p.id,
      title: `${p.code} — ${p.name}`, subtitle: `${p.client} · ${p.owner}`,
      projectCode: p.code, status: p.status, date: p.targetComplete, href: "/projects",
    }));
  }
  for (const d of s.drawingSets) {
    out.push(hit({
      key: `ds-${d.id}`, tracker: "Drawings", entityType: "drawingSet", entityId: d.id,
      title: d.name, subtitle: `${d.type} · ${d.description}`, projectCode: code(d.projectId),
      status: d.status, date: d.requiredBy, href: "/drawings",
    }));
  }
  const setById = new Map(s.drawingSets.map((d: any) => [d.id, d]));
  for (const sh of s.drawingSheets) {
    const parent = setById.get(sh.setId);
    out.push(hit({
      key: `sh-${sh.id}`, tracker: "Drawings", entityType: "drawingSheet", entityId: sh.id,
      title: sh.numberRev, subtitle: `${parent?.name ?? ""} · ${sh.description}`,
      projectCode: parent ? code(parent.projectId) : "", status: sh.status,
      date: sh.requiredBy, href: "/drawings",
    }));
  }
  for (const sb of s.submittals) {
    out.push(hit({
      key: `sb-${sb.id}`, tracker: "Submittals", entityType: "submittal", entityId: sb.id,
      title: `${sb.submittalNumber} · ${sb.type}`,
      subtitle: `${sb.title} · ${sb.specSection} · ball: ${sb.ballInCourt}`,
      projectCode: code(sb.projectId), status: sb.status, date: sb.dueBack,
      href: "/submittals",
    }));
  }
  for (const wp of s.workPackages) {
    out.push(hit({
      key: `wp-${wp.id}`, tracker: "Work Packages", entityType: "workPackage", entityId: wp.id,
      title: wp.code, subtitle: `${wp.name} · ${wp.description} · ${wp.tonnage}t`,
      projectCode: code(wp.projectId), status: wp.status, date: wp.plannedComplete,
      href: "/work-packages",
    }));
  }
  for (const f of s.fab) {
    out.push(hit({
      key: `fab-${f.id}`, tracker: "Fabrication", entityType: "fab", entityId: f.id,
      title: f.workPackage, subtitle: `${f.description} · ${f.drawingRef} · ${f.shop}`,
      projectCode: code(f.projectId), status: f.status, date: f.plannedDate,
      href: "/fabrication",
    }));
  }
  for (const d of s.deliveries) {
    out.push(hit({
      key: `dl-${d.id}`, tracker: "Delivery", entityType: "delivery", entityId: d.id,
      title: d.loadNumber, subtitle: `${d.pieceMarks} → ${d.destination}`,
      projectCode: code(d.projectId), status: d.status, date: d.plannedShip,
      href: "/delivery",
    }));
  }
  for (const i of s.install) {
    out.push(hit({
      key: `inst-${i.id}`, tracker: "Installation", entityType: "install", entityId: i.id,
      title: i.sequenceArea, subtitle: `${i.pieceMarks} · crew ${i.crew}`,
      projectCode: code(i.projectId), status: i.status, date: i.plannedErect,
      href: "/installation",
    }));
  }
  for (const r of s.rfis) {
    out.push(hit({
      key: `rfi-${r.id}`, tracker: "RFIs", entityType: "rfi", entityId: r.id,
      title: r.rfiNumber, subtitle: `${r.subject} · ${r.impact} · ${r.linkedDrawing}`,
      projectCode: code(r.projectId), status: r.status, date: r.responseDue, href: "/rfis",
    }));
  }
  for (const c of s.cos) {
    out.push(hit({
      key: `co-${c.id}`, tracker: "Change Orders", entityType: "changeOrder", entityId: c.id,
      title: c.coNumber, subtitle: `${c.description} · ${c.linked}`,
      projectCode: code(c.projectId), status: c.status, date: c.decisionDue, href: "/changes",
    }));
  }
  for (const rb of s.roadblocks) {
    out.push(hit({
      key: `rb-${rb.id}`, tracker: "Roadblocks", entityType: "roadblock", entityId: rb.id,
      title: rb.title, subtitle: `${rb.description} · ${rb.category}`,
      projectCode: code(rb.projectId), status: rb.status, date: rb.resolvedDate,
      href: "/roadblocks",
    }));
  }
  for (const t of s.tasks) {
    out.push(hit({
      key: `task-${t.id}`, tracker: "Tasks", entityType: "task", entityId: t.id,
      title: t.task, subtitle: `${t.category} · ${t.owner}`,
      projectCode: code(t.projectId), status: t.status, date: t.due, href: "/tasks",
    }));
  }
  for (const n of s.notes) {
    out.push(hit({
      key: `note-${n.id}`, tracker: "Notes", entityType: "note", entityId: n.id,
      title: n.title || "(untitled note)", subtitle: n.body,
      projectCode: code(n.projectId), status: n.triaged ? "" : "Inbox",
      date: n.noteDate, href: n.triaged ? "/notes" : "/inbox",
    }));
  }
  return withTags(out, s.tags ?? [], s.entityTags ?? []);
}

/**
 * Fold each record's tag names into its haystack, so searching "Grid C" finds
 * everything carrying that tag — not just records with the words in their text.
 */
function withTags(hits: SearchHit[], tags: Tag[], entityTags: EntityTag[]): SearchHit[] {
  if (tags.length === 0 || entityTags.length === 0) return hits;
  const nameById = new Map(tags.map((t) => [t.id, t.name]));
  const namesByEntity = new Map<string, string[]>();
  for (const et of entityTags) {
    const name = nameById.get(et.tagId);
    if (!name) continue;
    const key = `${et.entityType}:${et.entityId}`;
    const list = namesByEntity.get(key);
    if (list) list.push(name);
    else namesByEntity.set(key, [name]);
  }
  return hits.map((h) => {
    const names = namesByEntity.get(`${h.entityType}:${h.entityId}`);
    if (!names) return h;
    return { ...h, haystack: `${h.haystack} ${names.join(" ").toLowerCase()}` };
  });
}

/**
 * All query terms must match somewhere in the hit (AND, not phrase), so
 * "grid c rfi" narrows instead of widening.
 */
export function searchHits(index: SearchHit[], query: string): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return index.filter((h) => terms.every((t) => h.haystack.includes(t)));
}
