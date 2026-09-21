import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDoneStatus } from "@/lib/pm/complete";

/** Checkbox: mark complete (or reopen if already done when shown). */
export function CompleteCheck({
  status,
  onComplete,
  onReopen,
  label,
}: {
  status: string;
  onComplete: () => void;
  onReopen?: () => void;
  label?: string;
}) {
  const done = isDoneStatus(status);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label ?? (done ? "Completed" : "Mark complete")}
      title={done ? "Completed — click to reopen" : "Mark complete and remove from open list"}
      onClick={(e) => {
        e.stopPropagation();
        if (done) onReopen?.();
        else onComplete();
      }}
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
        done
          ? "border-status-green bg-status-green text-primary-fg"
          : "border-border bg-surface-2 hover:border-status-green hover:bg-status-green/15",
      )}
    >
      {done ? <Check className="size-3.5" strokeWidth={3} /> : null}
    </button>
  );
}

export function ShowCompletedToggle({
  show,
  onChange,
  openCount,
  totalCount,
}: {
  show: boolean;
  onChange: (v: boolean) => void;
  openCount?: number;
  totalCount?: number;
}) {
  return (
    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 text-xs text-muted hover:text-fg">
      <input
        type="checkbox"
        checked={show}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 accent-[var(--color-primary)]"
      />
      Show completed
      {typeof openCount === "number" && typeof totalCount === "number" ? (
        <span className="tabular text-subtle">
          ({openCount}/{totalCount} open)
        </span>
      ) : null}
    </label>
  );
}
