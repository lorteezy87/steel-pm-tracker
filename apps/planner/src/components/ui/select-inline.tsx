import { cn } from "@/lib/utils";

export function SelectInline({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 max-w-full rounded-md border border-border bg-surface-2 px-2 text-xs text-fg",
        "outline-none focus:border-primary focus:ring-1 focus:ring-primary/40",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
