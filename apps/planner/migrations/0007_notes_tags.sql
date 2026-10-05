-- Notes / Inbox / journal moments, and cross-cutting tags.
--
-- Same single-company sharing model as migrations/0003_entities.sql: no
-- `user_id` visibility column, `created_by` / `updated_by` are audit only.

-- ONE table backs three surfaces, because they are the same record seen from
-- different angles:
--   * Inbox      — triaged = false. Field capture: you jot "AB at grid C looks
--                  off" from the deck and triage it into a real RFI/task later.
--   * Journal    — note_date is not null. A timestamped moment on that day,
--                  sitting alongside the structured daily field log.
--   * Notes      — everything. Meeting notes, coordination notes, scratch.
--
-- project_id is NULLABLE here (unlike every other entity table): a capture made
-- in the field often isn't attached to a job yet, and forcing a project at
-- capture time is exactly the friction that stops things getting written down.
create table if not exists notes (
  id text primary key,
  project_id text references projects(id) on delete cascade,
  note_date date,
  note_time text not null default '',
  title text not null default '',
  body text not null default '',
  pinned boolean not null default false,
  triaged boolean not null default true,
  author text not null default '',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_project_id_idx on notes (project_id);
create index if not exists notes_note_date_idx on notes (note_date);
create index if not exists notes_triaged_idx on notes (triaged);

create table if not exists tags (
  id text primary key,
  name text not null unique,
  color text not null default 'steel',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Polymorphic join: a tag can hang on ANY tracker record. Deliberately no FK on
-- (entity_type, entity_id) — there is no single table to point at, and the same
-- trade-off is already made by `roadblocks.linked_entity_type/_id`. A tag
-- pointing at a deleted record is harmless: it simply resolves to nothing when
-- the client joins against the records it actually has.
create table if not exists entity_tags (
  id text primary key,
  tag_id text not null references tags(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tag_id, entity_type, entity_id)
);
create index if not exists entity_tags_tag_id_idx on entity_tags (tag_id);
create index if not exists entity_tags_entity_idx on entity_tags (entity_type, entity_id);
