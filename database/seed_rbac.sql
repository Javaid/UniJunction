-- =============================================================================
-- Academic Connect — Initial RBAC catalog (Chunk 03)
--
-- Populates the fixed starting set of roles, permissions, and their
-- mapping. This is reference/catalog data, not sample or fake production
-- data — the platform cannot function without at least these rows (e.g.
-- registration has no STUDENT role to assign without this).
--
-- Idempotent: safe to run multiple times. Run this AFTER schema.sql.
--
-- Usage:
--   mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/seed_rbac.sql
-- =============================================================================

INSERT INTO roles (name, description) VALUES
  ('SUPER_ADMIN', 'Full platform administrator'),
  ('UNIVERSITY_ADMIN', 'Administrator scoped to a single university'),
  ('FACULTY', 'Faculty member'),
  ('RESEARCHER', 'Researcher'),
  ('STUDENT', 'Student — the default self-registration role')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO permissions (name, description) VALUES
  ('USER_VIEW', 'View user records'),
  ('USER_UPDATE', 'Update user records'),
  ('UNIVERSITY_VIEW', 'View university records'),
  ('UNIVERSITY_CREATE', 'Create university records'),
  ('UNIVERSITY_UPDATE', 'Update university records'),
  ('ROLE_VIEW', 'View role assignments'),
  ('ROLE_ASSIGN', 'Assign or remove a user''s roles'),
  ('SYSTEM_ADMIN', 'Full system administration')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Role -> permission mapping (see docs/authentication.md, "Permissions").
-- Written as a name-to-name join so it never depends on guessing
-- auto-increment id values.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON (r.name = 'SUPER_ADMIN' AND p.name IN (
        'SYSTEM_ADMIN', 'USER_VIEW', 'USER_UPDATE',
        'UNIVERSITY_VIEW', 'UNIVERSITY_CREATE', 'UNIVERSITY_UPDATE',
        'ROLE_VIEW', 'ROLE_ASSIGN'
      ))
  OR (r.name = 'UNIVERSITY_ADMIN' AND p.name IN ('USER_VIEW', 'UNIVERSITY_VIEW', 'UNIVERSITY_UPDATE'))
  OR (r.name = 'STUDENT' AND p.name IN ('USER_VIEW'))
  OR (r.name = 'FACULTY' AND p.name IN ('USER_VIEW'))
  OR (r.name = 'RESEARCHER' AND p.name IN ('USER_VIEW'))
ON DUPLICATE KEY UPDATE role_id = role_id;
