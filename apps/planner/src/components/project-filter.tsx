import { usePmStore } from "@/lib/pm/store";

export function ProjectFilter() {
  const projects = usePmStore((s) => s.projects);
  const filter = usePmStore((s) => s.filterProjectId);
  const setFilter = usePmStore((s) => s.setFilterProjectId);

  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span className="hidden sm:inline">Project</span>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="h-9 min-w-[8rem] rounded-md border border-border bg-surface-2 px-2 text-sm text-fg outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
      >
        <option value="all">All projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code}
          </option>
        ))}
      </select>
    </label>
  );
}
