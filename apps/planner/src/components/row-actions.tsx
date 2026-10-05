import { Pencil, Trash2 } from "lucide-react";

export function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-md p-1.5 text-muted hover:bg-surface-3 hover:text-primary"
        aria-label="Edit"
        title="Edit"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-md p-1.5 text-muted hover:bg-status-red/15 hover:text-status-red"
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

export function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-fg hover:bg-primary-dim"
    >
      <span className="text-base leading-none">+</span>
      {label}
    </button>
  );
}
