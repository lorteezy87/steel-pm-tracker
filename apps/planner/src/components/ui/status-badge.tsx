import { statusTone, TONE_CLASSES } from "@/lib/pm/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
      )}
    >
      {status}
    </span>
  );
}
