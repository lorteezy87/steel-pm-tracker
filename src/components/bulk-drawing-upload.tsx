import { FileUp, Loader2, Upload } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/form-field";
import { DRAWING_STATUSES } from "@/lib/pm/constants";
import {
  planBulkFiles,
  setNameFromFile,
  type BulkFilePlan,
} from "@/lib/pm/pdf-split";
import { usePmStore } from "@/lib/pm/store";
import type { DrawingStatus } from "@/lib/pm/types";
import { cn } from "@/lib/utils";
import { defaultProjectId } from "@/components/project-select-field";

type Mode = "set_per_file" | "one_set";

export function BulkDrawingUploadButton({
  onDone,
}: {
  onDone?: (summary: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 text-xs font-semibold text-fg hover:border-primary/40 hover:bg-surface-3"
      >
        <Upload className="size-3.5" />
        Bulk upload
      </button>
      {open ? (
        <BulkDrawingUploadDialog
          onClose={() => setOpen(false)}
          onDone={(s) => {
            setOpen(false);
            onDone?.(s);
          }}
        />
      ) : null}
    </>
  );
}

function BulkDrawingUploadDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (summary: string) => void;
}) {
  const projects = usePmStore((s) => s.projects);
  const filter = usePmStore((s) => s.filterProjectId);
  const addSet = usePmStore((s) => s.addDrawingSet);
  const addSheet = usePmStore((s) => s.addDrawingSheet);

  const [projectId, setProjectId] = useState(() =>
    defaultProjectId(projects, filter),
  );
  const [mode, setMode] = useState<Mode>("set_per_file");
  const [setName, setSetName] = useState("Bulk Upload");
  const [status, setStatus] = useState<DrawingStatus>("Not Submitted");
  const [requiredBy, setRequiredBy] = useState("");
  const [owner, setOwner] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<BulkFilePlan[]>([]);
  const [progress, setProgress] = useState("");

  const totalSheets = useMemo(
    () => plans.reduce((a, p) => a + p.pageCount, 0),
    [plans],
  );

  const analyze = useCallback(async (list: FileList | File[]) => {
    const files = Array.from(list);
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    setProgress(`Reading ${files.length} file(s)…`);
    try {
      const next = await planBulkFiles(files);
      setPlans(next);
      if (files.length === 1) {
        setSetName(setNameFromFile(files[0].name));
      }
      setProgress("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read files");
      setPlans([]);
    } finally {
      setBusy(false);
    }
  }, []);

  async function importPlans() {
    if (plans.length === 0 || !projectId) return;
    setBusy(true);
    setError(null);
    try {
      let setsCreated = 0;
      let sheetsCreated = 0;

      if (mode === "one_set") {
        setProgress("Creating drawing set…");
        const setId = addSet({
          projectId,
          name: setName || "Bulk Upload",
          type: "Structural",
          description: `Bulk import · ${plans.length} file(s) · ${totalSheets} sheet(s)`,
          submitted: "",
          requiredBy,
          status,
          ballInCourt: "",
          owner,
          notes: plans.map((p) => p.fileName).join(", "),
        });
        setsCreated = 1;
        let sheetIndex = 0;
        for (const plan of plans) {
          for (let i = 0; i < plan.pageCount; i++) {
            sheetIndex += 1;
            const label = plan.pageLabels[i] ?? `Page ${i + 1}`;
            const numberRev =
              plan.kind === "pdf" && label.startsWith("Page")
                ? `${String(sheetIndex).padStart(3, "0")}`
                : label;
            addSheet({
              setId,
              numberRev,
              description:
                plan.kind === "pdf"
                  ? `${plan.fileName} · page ${i + 1} of ${plan.pageCount}`
                  : plan.fileName,
              submitted: "",
              requiredBy,
              status,
              ballInCourt: "",
              notes:
                plan.kind === "pdf"
                  ? `Source: ${plan.fileName} p.${i + 1}`
                  : `Source: ${plan.fileName}`,
            });
            sheetsCreated += 1;
          }
        }
      } else {
        for (const plan of plans) {
          setProgress(`Importing ${plan.fileName}…`);
          const setId = addSet({
            projectId,
            name: setNameFromFile(plan.fileName),
            type: "Structural",
            description:
              plan.kind === "pdf"
                ? `PDF split · ${plan.pageCount} page(s)`
                : plan.fileName,
            submitted: "",
            requiredBy,
            status,
            ballInCourt: "",
            owner,
            notes: `Uploaded file: ${plan.fileName}`,
          });
          setsCreated += 1;
          for (let i = 0; i < plan.pageCount; i++) {
            const label = plan.pageLabels[i] ?? `Page ${i + 1}`;
            addSheet({
              setId,
              numberRev: label,
              description:
                plan.kind === "pdf"
                  ? `Page ${i + 1} of ${plan.pageCount}`
                  : plan.fileName,
              submitted: "",
              requiredBy,
              status,
              ballInCourt: "",
              notes:
                plan.kind === "pdf"
                  ? `Source: ${plan.fileName} p.${i + 1}/${plan.pageCount}`
                  : `Source: ${plan.fileName}`,
            });
            sheetsCreated += 1;
          }
        }
      }

      onDone(
        `Imported ${sheetsCreated} sheet(s) across ${setsCreated} set(s) from ${plans.length} file(s).`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-bg/75 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-xl border border-border bg-surface shadow-2xl sm:rounded-xl"
      >
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-fg">Bulk upload drawings</h2>
          <p className="mt-0.5 text-xs text-muted">
            Multi-page PDFs split into one sheet per page. Images become single
            sheets.
          </p>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Project *</FieldLabel>
              <FieldSelect
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </FieldSelect>
            </div>
            <div>
              <FieldLabel>Default status</FieldLabel>
              <FieldSelect
                value={status}
                onChange={(e) => setStatus(e.target.value as DrawingStatus)}
              >
                {DRAWING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </FieldSelect>
            </div>
            <div>
              <FieldLabel>Required by</FieldLabel>
              <FieldInput
                type="date"
                value={requiredBy}
                onChange={(e) => setRequiredBy(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Owner</FieldLabel>
              <FieldInput
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="PM / detailer"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Import mode</FieldLabel>
            <FieldSelect
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="set_per_file">One drawing set per file</option>
              <option value="one_set">All files into one set</option>
            </FieldSelect>
          </div>

          {mode === "one_set" ? (
            <div>
              <FieldLabel>Set name</FieldLabel>
              <FieldInput
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
              />
            </div>
          ) : null}

          <div
            className={cn(
              "rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary/10"
                : "border-border bg-surface-2/50",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void analyze(e.dataTransfer.files);
            }}
          >
            <FileUp className="mx-auto size-8 text-accent-steel" />
            <p className="mt-2 text-sm text-fg">Drop PDFs or images here</p>
            <p className="mt-1 text-xs text-muted">
              PDF pages → individual sheets · PNG/JPG → one sheet each
            </p>
            <label className="mt-4 inline-flex h-9 cursor-pointer items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-fg hover:bg-primary-dim">
              Choose files
              <input
                type="file"
                className="sr-only"
                accept="application/pdf,image/*,.pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff"
                multiple
                onChange={(e) => {
                  if (e.target.files) void analyze(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {busy && progress ? (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Loader2 className="size-3.5 animate-spin" />
              {progress}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-status-red/40 bg-status-red/10 px-3 py-2 text-xs text-status-red">
              {error}
            </div>
          ) : null}

          {plans.length > 0 ? (
            <div className="rounded-lg border border-border bg-surface-2/40">
              <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted">
                Preview · {plans.length} file(s) · {totalSheets} sheet(s)
              </div>
              <ul className="max-h-48 divide-y divide-border overflow-y-auto text-sm">
                {plans.map((p) => (
                  <li
                    key={p.fileName + p.pageCount}
                    className="flex items-start justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-fg">
                        {p.fileName}
                      </div>
                      <div className="text-xs text-muted">
                        {p.kind === "pdf"
                          ? `PDF · ${p.pageCount} page${p.pageCount === 1 ? "" : "s"} → ${p.pageCount} sheet${p.pageCount === 1 ? "" : "s"}`
                          : p.kind === "image"
                            ? "Image → 1 sheet"
                            : "File → 1 sheet"}
                      </div>
                      {p.kind === "pdf" && p.pageCount > 1 ? (
                        <div className="mt-1 text-[11px] text-subtle">
                          e.g. {p.pageLabels.slice(0, 3).join(", ")}
                          {p.pageLabels.length > 3 ? "…" : ""}
                        </div>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-[11px] tabular text-muted">
                      {p.pageCount} sh
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-border px-4 text-sm text-muted hover:bg-surface-2"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void importPlans()}
            disabled={busy || plans.length === 0 || !projectId}
            className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary-dim disabled:opacity-50"
          >
            {busy ? "Working…" : `Import ${totalSheets || ""} sheet(s)`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
}
