-- Relational entity tables, replacing the single-blob `pm_workspace` sync with
-- real per-record Postgres tables (one per tracker entity).
--
-- IMPORTANT deviation from the multi-tenant guidance in migrations/0001_auth.sql:
-- this is a single-company internal tool (S&H Steel), NOT a per-user-isolated
-- app. Every signed-in user reads and writes the SAME shared set of projects
-- and records — there is no `user_id` filter column here. `created_by` /
-- `updated_by` are audit trail only (who last touched a row), never used to
-- scope visibility. Every mutation still requires a signed-in session via
-- `authMiddleware` (see src/lib/auth/middleware.ts); reads are open to any
-- signed-in user.
--
-- `pm_workspace` (migrations/0002_pm_workspace.sql) is left in place, unused
-- going forward, harmless — see src/lib/pm/api/import.ts for the one-time
-- import path that moves any locally-persisted snapshot into these tables.

create table if not exists projects (
  id text primary key,
  code text not null unique,
  name text not null,
  client text not null default '',
  status text not null default 'Active',
  start_date date,
  target_complete date,
  owner text not null default '',
  notes text not null default '',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_status_idx on projects (status);

create table if not exists work_packages (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  code text not null,
  name text not null default '',
  description text not null default '',
  status text not null default 'Planned',
  planned_start date,
  planned_complete date,
  tonnage numeric,
  owner text not null default '',
  notes text not null default '',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);
create index if not exists work_packages_project_id_idx on work_packages (project_id);
create index if not exists work_packages_status_idx on work_packages (status);
create index if not exists work_packages_planned_complete_idx on work_packages (planned_complete);

-- Submittals tracker: named drawing set (package / issue).
create table if not exists drawing_sets (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  name text not null default '',
  type text not null default '',
  description text not null default '',
  submitted date,
  required_by date,
  status text not null default 'Not Submitted',
  ball_in_court text not null default '',
  owner text not null default '',
  notes text not null default '',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drawing_sets_project_id_idx on drawing_sets (project_id);
create index if not exists drawing_sets_status_idx on drawing_sets (status);
create index if not exists drawing_sets_required_by_idx on drawing_sets (required_by);

-- Child: individual sheet within a drawing set.
create table if not exists drawing_sheets (
  id text primary key,
  set_id text not null references drawing_sets(id) on delete cascade,
  number_rev text not null default '',
  description text not null default '',
  submitted date,
  required_by date,
  status text not null default 'Not Submitted',
  ball_in_court text not null default '',
  notes text not null default '',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drawing_sheets_set_id_idx on drawing_sheets (set_id);
create index if not exists drawing_sheets_status_idx on drawing_sheets (status);
create index if not exists drawing_sheets_required_by_idx on drawing_sheets (required_by);

create table if not exists fab_items (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  work_package_id text references work_packages(id) on delete set null,
  -- Free-text label kept for UI continuity (pre-existing "Fabrication" tracker
  -- identifies rows by a typed label, e.g. "WP-01 Columns Area A") alongside
  -- the new `work_package_id` FK — not part of the spec's literal column list
  -- but needed so existing rows/UI keep working; see PR description.
  work_package_label text not null default '',
  description text not null default '',
  qty integer not null default 0,
  weight_tons numeric not null default 0,
  drawing_ref text not null default '',
  status text not null default 'Released',
  pct_complete integer not null default 0,
  shop text not null default '',
  planned_date date,
  owner text not null default '',
  notes text not null default '',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fab_items_project_id_idx on fab_items (project_id);
create index if not exists fab_items_work_package_id_idx on fab_items (work_package_id);
create index if not exists fab_items_status_idx on fab_items (status);
create index if not exists fab_items_planned_date_idx on fab_items (planned_date);

create table if not exists deliveries (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  work_package_id text references work_packages(id) on delete set null,
  load_number text not null default '',
  piece_marks text not null default '',
  planned_ship date,
  actual_ship date,
  planned_arrival date,
  actual_arrival date,
  status text not null default 'Scheduled',
  destination text not null default '',
  owner text not null default '',
  notes text not null default '',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists deliveries_project_id_idx on deliveries (project_id);
create index if not exists deliveries_work_package_id_idx on deliveries (work_package_id);
create index if not exists deliveries_status_idx on deliveries (status);
create index if not exists deliveries_planned_ship_idx on deliveries (planned_ship);

-- Erection / install tracker.
create table if not exists install_items (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  work_package_id text references work_packages(id) on delete set null,
  sequence_area text not null default '',
  piece_marks text not null default '',
  planned_erect date,
  status text not null default 'On Site',
  pct_complete integer not null default 0,
  crew text not null default '',
  owner text not null default '',
  notes text not null default '',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists install_items_project_id_idx on install_items (project_id);
create index if not exists install_items_work_package_id_idx on install_items (work_package_id);
create index if not exists install_items_status_idx on install_items (status);
create index if not exists install_items_planned_erect_idx on install_items (planned_erect);

create table if not exists rfis (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  rfi_number text not null default '',
  subject text not null default '',
  issued date,
  response_due date,
  status text not null default 'Open',
  ball_in_court text not null default '',
  impact text not null default '',
  linked_drawing text not null default '',
  notes text not null default '',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rfis_project_id_idx on rfis (project_id);
create index if not exists rfis_status_idx on rfis (status);
create index if not exists rfis_response_due_idx on rfis (response_due);

create table if not exists change_orders (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  co_number text not null default '',
  description text not null default '',
  linked text not null default '',
  cost numeric not null default 0,
  schedule_days integer not null default 0,
  status text not null default 'Draft',
  owner text not null default '',
  notes text not null default '',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists change_orders_project_id_idx on change_orders (project_id);
create index if not exists change_orders_status_idx on change_orders (status);

create table if not exists roadblocks (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  title text not null default '',
  category text not null default 'Other',
  description text not null default '',
  raised_date date,
  ball_in_court text not null default '',
  impact text not null default 'Other',
  severity text not null default 'Med',
  status text not null default 'Open',
  resolved_date date,
  linked_entity_type text not null default '',
  linked_entity_id text not null default '',
  owner text not null default '',
  notes text not null default '',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists roadblocks_project_id_idx on roadblocks (project_id);
create index if not exists roadblocks_status_idx on roadblocks (status);
create index if not exists roadblocks_resolved_date_idx on roadblocks (resolved_date);

create table if not exists tasks (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  task text not null default '',
  category text not null default '',
  owner text not null default '',
  due date,
  status text not null default 'Not Started',
  priority text not null default 'Med',
  notes text not null default '',
  created_by text references "user"(id),
  updated_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_project_id_idx on tasks (project_id);
create index if not exists tasks_status_idx on tasks (status);
create index if not exists tasks_due_idx on tasks (due);
