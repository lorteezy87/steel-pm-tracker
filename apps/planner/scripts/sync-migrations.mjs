#!/usr/bin/env node
/**
 * Keep this app's `migrations/` identical to the repo-root `migrations/`.
 *
 * Both apps point at the SAME database and run the same schema. The root
 * directory is canonical; this copy exists only because Vite resolves
 * `import.meta.glob("/migrations/*.sql")` against the app root (see
 * src/lib/db.ts), so the files have to sit inside the app.
 *
 * Run with `--check` in CI to fail on drift instead of fixing it.
 */
import { readdir, readFile, writeFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const mine = join(here, "..", "migrations");
const canonical = join(here, "..", "..", "..", "migrations");
const check = process.argv.includes("--check");

const sqlFiles = async (dir) =>
  (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

const [source, target] = await Promise.all([sqlFiles(canonical), sqlFiles(mine)]);
const drift = [];

for (const name of source) {
  const want = await readFile(join(canonical, name), "utf8");
  let have = null;
  try {
    have = await readFile(join(mine, name), "utf8");
  } catch {
    /* missing */
  }
  if (have === want) continue;
  drift.push(have === null ? `missing: ${name}` : `differs: ${name}`);
  if (!check) await writeFile(join(mine, name), want);
}

for (const name of target) {
  if (source.includes(name)) continue;
  drift.push(`extra: ${name}`);
  if (!check) await unlink(join(mine, name));
}

if (drift.length === 0) {
  console.log("[sync-migrations] in sync with the root migrations/");
  process.exit(0);
}
if (check) {
  console.error("[sync-migrations] DRIFT from root migrations/:");
  for (const d of drift) console.error(`  - ${d}`);
  console.error("Run `npm run sync:migrations` to fix.");
  process.exit(1);
}
console.log("[sync-migrations] updated:");
for (const d of drift) console.log(`  - ${d}`);
