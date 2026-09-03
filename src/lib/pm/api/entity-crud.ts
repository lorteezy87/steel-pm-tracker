import { getSql } from "@/lib/db";

/**
 * Shared per-record CRUD helpers for the relational tracker tables
 * (migrations/0003_entities.sql).
 *
 * IMPORTANT: this is a single-company shared tool, NOT per-user-isolated —
 * see the "IMPORTANT deviation" note at the top of that migration. Every
 * function here reads/writes the FULL shared table (no `user_id` filter).
 * `createdBy`/`updatedBy` are audit-trail only. Callers (the `src/lib/pm/api/*`
 * entity files) are responsible for wrapping these in `createServerFn` +
 * `authMiddleware` so every write still requires a signed-in session.
 */

/**
 * snake_case <-> camelCase column mapping for one entity table. Partial: a
 * client-only field with no backing column (e.g. `FabItem.workPackage`, the
 * legacy free-text label kept for display continuity alongside the new
 * `workPackageId` FK) is simply omitted and round-trips as `""` — see
 * `fromRow`/`toRow` below.
 */
export type ColumnMap<T> = {
  [K in keyof T]?: string;
};

function toRow<T extends { id: string }>(
  def: EntityTable<T>,
  values: Partial<T>,
): Record<string, unknown> {
  const columns = def.columns;
  const nullable = new Set<keyof T>([...(def.nullableKeys ?? []), ...(def.numericKeys ?? [])]);
  const row: Record<string, unknown> = {};
  for (const key of Object.keys(columns) as (keyof T)[]) {
    const col = columns[key];
    if (!col) continue; // client-only field, no backing column
    if (key in values) {
      const v = values[key];
      // Empty string -> NULL only for columns backed by a nullable
      // date/numeric column; every other (text, `not null default ''`)
      // column must keep `''` as `''` — see `EntityTable.nullableKeys`.
      row[col] = v === "" && nullable.has(key) ? null : (v ?? null);
    }
  }
  return row;
}

function fromRow<T extends Record<string, unknown>>(
  columns: ColumnMap<T>,
  row: Record<string, unknown>,
): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(columns) as (keyof T)[]) {
    const col = columns[key];
    if (!col) {
      out[key as string] = ""; // client-only field, no backing column
      continue;
    }
    const v = row[col];
    // Dates come back as 'YYYY-MM-DD' strings (or null) from src/lib/db.ts's
    // OID_DATE normalization; numerics as strings. Coerce to the client shape
    // (empty string for null text/date, number for numeric) so the Zustand
    // store's existing `""`-means-unset convention keeps working untouched.
    if (v === null || v === undefined) {
      out[key as string] = "";
    } else {
      out[key as string] = v;
    }
  }
  return out as T;
}

export interface EntityTable<T extends { id: string }> {
  table: string;
  columns: ColumnMap<T>;
  /** Columns that are numeric in Postgres and must be coerced to `number`. */
  numericKeys?: (keyof T)[];
  /**
   * Columns backed by a nullable Postgres `date`/`numeric` column (no
   * `not null default`) — an empty client string must become SQL `NULL` for
   * these (Postgres rejects `''` as an invalid date/numeric literal).
   * Every OTHER text column is `not null default ''`, so `''` must be sent
   * through AS `''`, never `null` (a real, pre-fix bug: converting every
   * blank field to `null` violated the `not null` constraint on the very
   * first create with any optional text field left empty).
   */
  nullableKeys?: (keyof T)[];
}

function coerceNumeric<T extends { id: string }>(def: EntityTable<T>, row: T): T {
  if (!def.numericKeys?.length) return row;
  const out: Record<string, unknown> = { ...row };
  for (const key of def.numericKeys) {
    const v = out[key as string];
    out[key as string] = v === "" || v === null || v === undefined ? 0 : Number(v);
  }
  return out as T;
}

export async function listEntities<T extends { id: string }>(
  def: EntityTable<T>,
  orderBy = "created_at asc",
): Promise<T[]> {
  const sql = await getSql();
  const rows = await sql.query<Record<string, unknown>>(
    `select * from ${def.table} order by ${orderBy}`,
  );
  return rows.map((r) => coerceNumeric(def, fromRow(def.columns, r)));
}

/** Fields in `values` with no backing DB column — carried through as-is (see `ColumnMap`). */
function unmappedFields<T extends Record<string, unknown>>(
  columns: ColumnMap<T>,
  values: Partial<T>,
): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(values) as (keyof T)[]) {
    if (!columns[key]) out[key] = values[key];
  }
  return out;
}

export async function createEntity<T extends { id: string }>(
  def: EntityTable<T>,
  id: string,
  values: Omit<T, "id">,
  userId: string,
): Promise<T> {
  const sql = await getSql();
  const row = toRow(def, values as Partial<T>);
  const cols = ["id", ...Object.keys(row), "created_by", "updated_by"];
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const params = [id, ...Object.values(row), userId, userId];
  const inserted = await sql.query<Record<string, unknown>>(
    `insert into ${def.table} (${cols.join(", ")}) values (${placeholders.join(", ")}) returning *`,
    params,
  );
  return {
    ...coerceNumeric(def, fromRow(def.columns, inserted[0])),
    ...unmappedFields(def.columns, values as Partial<T>),
  };
}

export async function updateEntity<T extends { id: string }>(
  def: EntityTable<T>,
  id: string,
  patch: Partial<T>,
  userId: string,
): Promise<T | null> {
  const sql = await getSql();
  const row = toRow(def, patch);
  const setCols = Object.keys(row);
  if (setCols.length === 0) {
    const existing = await sql.query<Record<string, unknown>>(
      `select * from ${def.table} where id = $1`,
      [id],
    );
    return existing[0] ? coerceNumeric(def, fromRow(def.columns, existing[0])) : null;
  }
  const setClauses = setCols.map((c, i) => `${c} = $${i + 2}`);
  setClauses.push(`updated_by = $${setCols.length + 2}`);
  setClauses.push(`updated_at = now()`);
  const params = [id, ...setCols.map((c) => row[c]), userId];
  const updated = await sql.query<Record<string, unknown>>(
    `update ${def.table} set ${setClauses.join(", ")} where id = $1 returning *`,
    params,
  );
  return updated[0]
    ? {
        ...coerceNumeric(def, fromRow(def.columns, updated[0])),
        ...unmappedFields(def.columns, patch),
      }
    : null;
}

export async function deleteEntity(table: string, id: string): Promise<void> {
  const sql = await getSql();
  await sql.query(`delete from ${table} where id = $1`, [id]);
}
