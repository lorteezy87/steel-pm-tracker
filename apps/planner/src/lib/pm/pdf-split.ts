import * as pdfjs from "pdfjs-dist";

// Vite-friendly worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type BulkFilePlan =
  | {
      kind: "pdf";
      fileName: string;
      pageCount: number;
      /** Optional sheet labels guessed from text on each page */
      pageLabels: string[];
    }
  | {
      kind: "image" | "other";
      fileName: string;
      pageCount: 1;
      pageLabels: string[];
    };

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function guessSheetNumber(text: string, pageIndex: number): string {
  // Common steel drawing callouts near title block
  const patterns = [
    /\b([A-Z]{1,3}[-\s]?\d{1,4}[A-Z]?)\s*(?:Rev(?:ision)?\.?\s*([A-Z0-9]+))?/i,
    /\bSHEET\s*(?:NO\.?|NUMBER)?\s*[:#]?\s*([A-Z0-9\-]+)/i,
    /\bDWG\.?\s*(?:NO\.?|NUMBER)?\s*[:#]?\s*([A-Z0-9\-]+)/i,
  ];
  const clean = text.replace(/\s+/g, " ").slice(0, 4000);
  for (const re of patterns) {
    const m = clean.match(re);
    if (m?.[1]) {
      const num = m[1].replace(/\s+/g, "-").toUpperCase();
      const rev = m[2] ? ` Rev ${m[2].toUpperCase()}` : "";
      return `${num}${rev}`;
    }
  }
  return `Page ${pageIndex + 1}`;
}

export async function planBulkFile(file: File): Promise<BulkFilePlan> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf") || file.type === "application/pdf") {
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const pageCount = doc.numPages;
    const pageLabels: string[] = [];

    // Extract a little text per page for sheet number guesses (cap for speed)
    const maxTextPages = Math.min(pageCount, 40);
    for (let i = 1; i <= maxTextPages; i++) {
      try {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items
          .map((it) => ("str" in it ? String((it as { str: string }).str) : ""))
          .join(" ");
        pageLabels.push(guessSheetNumber(text, i - 1));
      } catch {
        pageLabels.push(`Page ${i}`);
      }
    }
    for (let i = maxTextPages + 1; i <= pageCount; i++) {
      pageLabels.push(`Page ${i}`);
    }

    await doc.destroy();
    return { kind: "pdf", fileName: file.name, pageCount, pageLabels };
  }

  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|tif{1,2})$/i.test(lower)) {
    return {
      kind: "image",
      fileName: file.name,
      pageCount: 1,
      pageLabels: [baseName(file.name)],
    };
  }

  // Unknown binary: treat as single sheet reference
  return {
    kind: "other",
    fileName: file.name,
    pageCount: 1,
    pageLabels: [baseName(file.name)],
  };
}

export async function planBulkFiles(files: File[]): Promise<BulkFilePlan[]> {
  const out: BulkFilePlan[] = [];
  for (const f of files) {
    out.push(await planBulkFile(f));
  }
  return out;
}

export function setNameFromFile(fileName: string): string {
  return baseName(fileName).replace(/[_-]+/g, " ").trim() || fileName;
}
