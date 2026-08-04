import type { Project } from "@/lib/pm/types";
import type { FormFieldDef } from "./crud-dialog";

export function projectField(projects: Project[]): FormFieldDef {
  return {
    key: "projectId",
    label: "Project",
    type: "select",
    required: true,
    options: projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
  };
}

export function defaultProjectId(
  projects: Project[],
  filterProjectId: string | "all",
): string {
  if (filterProjectId !== "all" && projects.some((p) => p.id === filterProjectId)) {
    return filterProjectId;
  }
  return projects[0]?.id ?? "";
}
