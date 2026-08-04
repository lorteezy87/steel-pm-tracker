-- Shared multi-device workspace payload (one row per workspace key).
CREATE TABLE IF NOT EXISTS pm_workspace (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO pm_workspace (id, payload, version)
VALUES ('default', '{}'::jsonb, 0)
ON CONFLICT (id) DO NOTHING;
