-- =============================================================================
-- Academic Connect — RBAC catalog
-- Chunk 03: initial roles/permissions
-- Chunk 04: institutional management permissions + role mapping updates
-- Chunk 05: STUDENT_PROFILE_VIEW (admin oversight of student profiles)
--
-- Populates the fixed starting set of roles, permissions, and their
-- mapping. This is reference/catalog data, not sample or fake production
-- data — the platform cannot function without at least these rows (e.g.
-- registration has no STUDENT role to assign without this).
--
-- Idempotent: safe to run multiple times. Run this AFTER schema.sql (and
-- after database/migrations/001_chunk04_institution_management.sql and
-- database/migrations/002_chunk05_student_profiles.sql if upgrading an
-- existing pre-Chunk-05 database).
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
  ('ROLE_VIEW', 'View role assignments'),
  ('ROLE_ASSIGN', 'Assign or remove a user''s roles'),
  ('SYSTEM_ADMIN', 'Full system administration'),
  -- Chunk 04: institutional management
  ('UNIVERSITY_VIEW', 'View university records'),
  ('UNIVERSITY_CREATE', 'Create university records'),
  ('UNIVERSITY_UPDATE', 'Update university records'),
  ('UNIVERSITY_VERIFY', 'Set a university''s verification status'),
  ('UNIVERSITY_STATUS_UPDATE', 'Change a university''s operational status'),
  ('UNIVERSITY_ADMIN_VIEW', 'View a university''s administrators'),
  ('UNIVERSITY_ADMIN_ASSIGN', 'Assign a university administrator'),
  ('UNIVERSITY_MEMBER_VIEW', 'View a university''s institutional memberships'),
  ('UNIVERSITY_MEMBER_CREATE', 'Create an institutional membership'),
  ('UNIVERSITY_MEMBER_UPDATE', 'Update an institutional membership'),
  ('UNIVERSITY_DOMAIN_VIEW', 'View a university''s registered email domains'),
  ('UNIVERSITY_DOMAIN_MANAGE', 'Add or remove a university''s registered email domains'),
  ('FACULTY_VIEW', 'View faculty records'),
  ('FACULTY_CREATE', 'Create faculty records'),
  ('FACULTY_UPDATE', 'Update faculty records'),
  ('FACULTY_STATUS_UPDATE', 'Change a faculty''s status'),
  ('DEPARTMENT_VIEW', 'View department records'),
  ('DEPARTMENT_CREATE', 'Create department records'),
  ('DEPARTMENT_UPDATE', 'Update department records'),
  ('DEPARTMENT_STATUS_UPDATE', 'Change a department''s status'),
  ('PROGRAM_VIEW', 'View program records'),
  ('PROGRAM_CREATE', 'Create program records'),
  ('PROGRAM_UPDATE', 'Update program records'),
  ('PROGRAM_STATUS_UPDATE', 'Change a program''s status'),
  -- Chunk 05: student academic profile
  ('STUDENT_PROFILE_VIEW', 'View student academic profiles at institutional-admin level')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Role -> permission mapping (see docs/authentication.md and
-- docs/university-management.md, "Permissions"). Written as a
-- name-to-name join so it never depends on guessing auto-increment id
-- values.
--
-- Deliberately NOT given to UNIVERSITY_ADMIN (chunk brief §30):
-- UNIVERSITY_CREATE, UNIVERSITY_VERIFY, UNIVERSITY_STATUS_UPDATE,
-- UNIVERSITY_ADMIN_ASSIGN — these remain SUPER_ADMIN-only.
--
-- STUDENT_PROFILE_VIEW (Chunk 05) is granted only to SUPER_ADMIN and
-- UNIVERSITY_ADMIN, for the admin student-list endpoint
-- (GET /api/universities/:universityId/students) — see
-- docs/student-profiles.md, "Authorization". A student's OWN profile
-- self-service (create/update/skills/interests/...) is not gated by a
-- permission at all: it's `requireAuth` plus a service-layer check that
-- the caller holds the STUDENT role and an active STUDENT membership at
-- the target university, the same "me" pattern as
-- university_memberships' own /users/me/universities endpoint.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON (r.name = 'SUPER_ADMIN' AND p.name IN (
        'SYSTEM_ADMIN', 'USER_VIEW', 'USER_UPDATE', 'ROLE_VIEW', 'ROLE_ASSIGN',
        'UNIVERSITY_VIEW', 'UNIVERSITY_CREATE', 'UNIVERSITY_UPDATE',
        'UNIVERSITY_VERIFY', 'UNIVERSITY_STATUS_UPDATE',
        'UNIVERSITY_ADMIN_VIEW', 'UNIVERSITY_ADMIN_ASSIGN',
        'UNIVERSITY_MEMBER_VIEW', 'UNIVERSITY_MEMBER_CREATE', 'UNIVERSITY_MEMBER_UPDATE',
        'UNIVERSITY_DOMAIN_VIEW', 'UNIVERSITY_DOMAIN_MANAGE',
        'FACULTY_VIEW', 'FACULTY_CREATE', 'FACULTY_UPDATE', 'FACULTY_STATUS_UPDATE',
        'DEPARTMENT_VIEW', 'DEPARTMENT_CREATE', 'DEPARTMENT_UPDATE', 'DEPARTMENT_STATUS_UPDATE',
        'PROGRAM_VIEW', 'PROGRAM_CREATE', 'PROGRAM_UPDATE', 'PROGRAM_STATUS_UPDATE',
        'STUDENT_PROFILE_VIEW'
      ))
  OR (r.name = 'UNIVERSITY_ADMIN' AND p.name IN (
        'USER_VIEW',
        'UNIVERSITY_VIEW', 'UNIVERSITY_UPDATE',
        'UNIVERSITY_ADMIN_VIEW',
        'UNIVERSITY_MEMBER_VIEW', 'UNIVERSITY_MEMBER_CREATE', 'UNIVERSITY_MEMBER_UPDATE',
        'UNIVERSITY_DOMAIN_VIEW', 'UNIVERSITY_DOMAIN_MANAGE',
        'FACULTY_VIEW', 'FACULTY_CREATE', 'FACULTY_UPDATE', 'FACULTY_STATUS_UPDATE',
        'DEPARTMENT_VIEW', 'DEPARTMENT_CREATE', 'DEPARTMENT_UPDATE', 'DEPARTMENT_STATUS_UPDATE',
        'PROGRAM_VIEW', 'PROGRAM_CREATE', 'PROGRAM_UPDATE', 'PROGRAM_STATUS_UPDATE',
        'STUDENT_PROFILE_VIEW'
      ))
  OR (r.name = 'STUDENT' AND p.name IN ('USER_VIEW', 'UNIVERSITY_VIEW'))
  OR (r.name = 'FACULTY' AND p.name IN ('USER_VIEW', 'UNIVERSITY_VIEW'))
  OR (r.name = 'RESEARCHER' AND p.name IN ('USER_VIEW', 'UNIVERSITY_VIEW'))
ON DUPLICATE KEY UPDATE role_id = role_id;
