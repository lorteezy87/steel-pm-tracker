import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  FieldInput,
  FieldLabel,
  FieldSelect,
  FieldTextarea,
} from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

export type FormFieldDef =
  | {
      key: string;
      label: string;
      type: "text" | "number" | "date" | "textarea";
      required?: boolean;
      placeholder?: string;
    }
  | {
      key: string;
      label: string;
      type: "select";
      options: readonly string[] | { value: string; label: string }[];
      required?: boolean;
    };

export function CrudDialog({
  open,
  title,
  fields,
  initial,
  onClose,
  onSubmit,
  submitLabel = "Save",
}: {
  open: boolean;
  title: string;
  fields: FormFieldDef[];
  initial: Record<string, string | number>;
  onClose: () => void;
  onSubmit: (values: Record<string, string | number>) => void;
  submitLabel?: string;
}) {
  const titleId = useId();
  const [values, setValues] = useState(initial);

  useEffect(() => {
    if (open) setValues(initial);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function set(key: string, v: string | number) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && (values[f.key] === "" || values[f.key] === undefined)) {
        return;
      }
    }
    onSubmit(values);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-bg/75 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col",
          "rounded-t-xl border border-border bg-surface shadow-2xl sm:rounded-xl",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id={titleId} className="text-sm font-semibold text-fg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-3 overflow-y-auto px-4 py-4">
            {fields.map((f) => (
              <div key={f.key}>
                <FieldLabel>
                  {f.label}
                  {f.required ? " *" : ""}
                </FieldLabel>
                {f.type === "textarea" ? (
                  <FieldTextarea
                    value={String(values[f.key] ?? "")}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                      set(f.key, e.target.value)
                    }
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                ) : f.type === "select" ? (
                  <FieldSelect
                    value={String(values[f.key] ?? "")}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                      set(f.key, e.target.value)
                    }
                    required={f.required}
                  >
                    {f.options.map((o) => {
                      const value = typeof o === "string" ? o : o.value;
                      const label = typeof o === "string" ? o : o.label;
                      return (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </FieldSelect>
                ) : (
                  <FieldInput
                    type={f.type}
                    value={String(values[f.key] ?? "")}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      set(
                        f.key,
                        f.type === "number"
                          ? e.target.value === ""
                            ? 0
                            : Number(e.target.value)
                          : e.target.value,
                      )
                    }
                    placeholder={f.placeholder}
                    required={f.required}
                    step={f.type === "number" ? "any" : undefined}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-md border border-border px-4 text-sm text-muted hover:bg-surface-2 hover:text-fg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary-dim"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ConfirmDelete({
  open,
  title,
  message,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-bg/75"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl"
      >
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-border px-4 text-sm text-muted hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-md bg-danger px-4 text-sm font-semibold text-fg hover:opacity-90"
          >
            Confirm delete
          </button>
        </div>
      </div>
    </div>
  );
}
