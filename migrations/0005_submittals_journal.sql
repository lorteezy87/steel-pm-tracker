-- Submittals register + daily field journal.
--
-- Same single-company sharing model as migrations/0003_entities.sql: no
-- `user_id` visibility column — every signed-in user reads and writes the SAME
-- rows; `created_by` / `updated_by` are audit trail only.
--
-- `submittals` is the formal submittal register (shop drawings, mill certs,
-- welder/WPS quals, coating data, bolt certs, joist/deck packages…). It is
-- deliberately separate from `drawing_sets` / `drawing_sheets`: those track the
-- DETAILING deliverable sheet by sheet, while a submittal is the contractual
-- transmittal that carries a package to the GC/EOR and comes back stamped.
-- `linked_drawing_set` ties a submittal back to the set it transmitted.

create table if not exists submittals (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  submittal_number text not null default '',
  type text not null default 'Shop Drawings',
  title text not null default '',
  spec_section text not null default '',
  revision text not null default '0',
  submitted date,
  due_back date,
  returned date,
  status text not null default 'Not Submitted',
  ball_in_court text not null default '',
  linked_drawing_set text not null default '',
  owner text not null default '',
  notes text not null default '',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists submittals_project_id_idx on submittals (project_id);
create index if not exists submittals_status_idx on submittals (status);
create index if not exists submittals_due_back_idx on submittals (due_back);

-- Daily field journal — one row per project per day. This is the erection-side
-- record that backs up delay claims and change-order time impacts: crew size,
-- man-hours, tons set, weather, what actually got done, and what stopped it.
create table if not exists journal_entries (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  entry_date date not null,
  weather text not null default '',
  temp_high numeric,
  crew_count numeric,
  manhours numeric,
  tons_erected numeric,
  work_performed text not null default '',
  delays text not null default '',
  deliveries_received text not null default '',
  visitors text not null default '',
  safety_notes text not null default '',
  author text not null default '',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists journal_entries_project_id_idx on journal_entries (project_id);
create index if not exists journal_entries_entry_date_idx on journal_entries (entry_date);
