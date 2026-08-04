import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-medium tracking-wide text-muted uppercase">
      {children}
    </label>
  );
}

export function FieldInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg outline-none",
        "placeholder:text-subtle focus:border-primary focus:ring-1 focus:ring-primary/40",
        className,
      )}
    />
  );
}

export function FieldTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-[72px] w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-fg outline-none",
        "placeholder:text-subtle focus:border-primary focus:ring-1 focus:ring-primary/40",
        className,
      )}
    />
  );
}

export function FieldSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg outline-none",
        "focus:border-primary focus:ring-1 focus:ring-primary/40",
        className,
      )}
    >
      {children}
    </select>
  );
}
