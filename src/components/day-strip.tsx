import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysIso } from "@/lib/pm/day-plan";
import { DEMO_TODAY } from "@/lib/pm/store";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** The seven-day scrubber pinned under the Today and Timeline views. */
export function DayStrip({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  // Anchor the strip on the Sunday of the selected date's week.
  const selected = new Date(`${value}T12:00:00`);
  const weekStart = addDaysIso(value, -selected.getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i));

  return (
    <div className="sticky bottom-3 z-20 mx-auto flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border-strong bg-surface-2/95 px-2 py-1.5 shadow-lg backdrop-blur">
      <button
        type="button"
        aria-label="Previous week"
        onClick={() => onChange(addDaysIso(value, -7))}
        className="rounded-full p-1.5 text-muted hover:bg-surface-3 hover:text-fg"
      >
        <ChevronLeft className="size-4" />
      </button>
      {days.map((iso) => {
        const d = new Date(`${iso}T12:00:00`);
        const active = iso === value;
        const isToday = iso === DEMO_TODAY;
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onChange(iso)}
            className={cn(
              "flex min-w-11 flex-col items-center rounded-full px-2.5 py-1 leading-tight transition-colors",
              active
                ? "bg-primary text-primary-fg"
                : isToday
                  ? "text-primary hover:bg-surface-3"
                  : "text-muted hover:bg-surface-3 hover:text-fg",
            )}
          >
            <span className="tabular text-sm font-semibold">{d.getDate()}</span>
            <span className="text-[9px] font-semibold tracking-wider">
              {WEEKDAYS[d.getDay()]}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        aria-label="Next week"
        onClick={() => onChange(addDaysIso(value, 7))}
        className="rounded-full p-1.5 text-muted hover:bg-surface-3 hover:text-fg"
      >
        <ChevronRight className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange(DEMO_TODAY)}
        className="ml-1 rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-wider text-primary hover:bg-surface-3"
      >
        TODAY
      </button>
    </div>
  );
}
