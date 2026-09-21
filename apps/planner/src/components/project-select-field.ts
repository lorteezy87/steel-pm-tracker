import type { Project, WorkPackage } from "@/lib/pm/types";
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

/** Optional work-package picker — an empty option keeps the FK nullable. */
export function workPackageField(
  workPackages: WorkPackage[],
  projectId?: string | "all",
): FormFieldDef {
  const scoped =
    projectId && projectId !== "all"
      ? workPackages.filter((wp) => wp.projectId === projectId)
      : workPackages;
  return {
    key: "workPackageId",
    label: "Work package (optional)",
    type: "select",
    options: [{ value: "", label: "— none —" }, ...scoped.map((wp) => ({ value: wp.id, label: `${wp.code} — ${wp.name}` }))],
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
