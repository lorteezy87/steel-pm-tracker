-- Seed the shared "dev-user" row so the relational entity tables' `created_by`
-- / `updated_by` audit columns (which reference "user"(id), added in
-- 0003_entities.sql) can be satisfied when auth is disabled
-- (VITE_AUTH_ENABLED=false) with no DATABASE_URL configured.
--
-- src/lib/auth/verify.server.ts's `requireUserId()` falls back to the literal
-- id "dev-user" in exactly that mode (auth disabled + no real database
-- configured, e.g. local dev against the PGLite fallback). Without a matching
-- "user" row, every create/update in that mode 500s on a foreign key
-- violation (`insert or update on table "projects" violates foreign key
-- constraint "projects_created_by_fkey"`) the moment any entity is touched.
--
-- No-op / harmless everywhere else: when auth IS enabled (the default, and
-- always true in production), `requireUserId()` never returns "dev-user" —
-- it returns the real signed-in Better Auth user id instead — so this row is
-- simply unused there.
INSERT INTO "user" (id, name, email, "emailVerified")
VALUES ('dev-user', 'Dev User', 'dev-user@local.invalid', true)
ON CONFLICT (id) DO NOTHING;
