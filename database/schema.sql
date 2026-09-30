-- =============================================================================
-- Academic Connect — Core Schema
-- Chunk 02: Identity & Institution foundation
-- Chunk 03: RBAC (permissions, role_permissions) + auth tokens
--   (refresh_tokens, email_verification_tokens)
-- Chunk 04: Institutional management (university_domains,
--   university_memberships, audit_logs) + universities.verification_status
-- Chunk 05: Student Academic Profile (student_profiles, skills,
--   student_skills, interests, student_interests, research_areas,
--   student_research_interests, languages, student_languages,
--   student_certifications, student_achievements, student_goals)
--
-- Scope: users, roles, user_roles, universities, faculties, departments,
-- programs, permissions, role_permissions, refresh_tokens,
-- email_verification_tokens, university_domains, university_memberships,
-- audit_logs, student_profiles, skills, student_skills, interests,
-- student_interests, research_areas, student_research_interests,
-- languages, student_languages, student_certifications,
-- student_achievements, student_goals. Nothing beyond this is created
-- here — see docs/database-guidelines.md ("Future schema domains") for
-- what comes next.
--
-- This file is the current DDL for a FRESH database only. If you already
-- have a Chunk 02/03 database, this file's CREATE TABLE statements won't
-- retroactively add the new `universities.verification_status` column —
-- run database/migrations/001_chunk04_institution_management.sql first.
-- Chunk 05 adds only new tables (no ALTER TABLE), so an existing Chunk 04
-- database can pick them up via
-- database/migrations/002_chunk05_student_profiles.sql (identical
-- CREATE TABLE IF NOT EXISTS statements to this file's new tables).
--
-- After running this file (and any migrations, if applicable), run
-- database/seed_rbac.sql to populate the initial
-- roles/permissions/role_permissions catalog — without it, registration
-- has no STUDENT role to assign and RBAC has nothing to check against —
-- and database/seed_catalog.sql to populate the initial skills/
-- interests/research-areas/languages catalog (see docs/student-profiles.md).
--
-- This script is the deliberately-controlled alternative to
-- sequelize.sync({ alter: true }) / sync({ force: true }), which this
-- project never uses (see docs/database-guidelines.md, "Production
-- migration strategy"). Run it by hand against a target database you
-- control; the application never modifies its own schema at startup.
--
-- Usage (credentials are never stored in this file):
--   mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/schema.sql
--
-- Requires MySQL 8.0+. Uses CREATE TABLE IF NOT EXISTS for safe re-runs
-- during local development; it does not alter a table that already
-- exists with a different shape. A real migration tool (e.g. Sequelize
-- CLI / umzug) should replace this for production schema evolution — see
-- docs/database-guidelines.md.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------
-- roles — reference/lookup table. `name` is VARCHAR, not ENUM, so new
-- roles can be added with an INSERT, not a migration (role system must
-- stay extensible). Not soft-deletable: reference data is hard-removed.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(50)  NOT NULL,
  description VARCHAR(255) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- users — core identity record. `id` is the internal surrogate key used
-- for joins/indexing; `uuid` is the externally-exposed identifier. See
-- docs/database-guidelines.md ("Primary key strategy") for why both
-- exist. `password_hash` only — never a plaintext password column.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid              CHAR(36)     NOT NULL,
  email             VARCHAR(255) NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  display_name      VARCHAR(150) NULL,
  phone             VARCHAR(30)  NULL,
  avatar_url        VARCHAR(500) NULL,
  status            ENUM('ACTIVE','PENDING','SUSPENDED','DEACTIVATED') NOT NULL DEFAULT 'PENDING',
  email_verified_at DATETIME NULL,
  last_login_at     DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_uuid (uuid),
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- user_roles — many-to-many join between users and roles. Pure
-- relational data (not an institutional entity): hard-deleted, cascades
-- with its parent user or role.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  role_id    BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_roles_user_role (user_id, role_id),
  KEY ix_user_roles_role_id (role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- universities — organizational root of the institution hierarchy and
-- the multi-tenancy boundary (logical, not a separate database — see
-- docs/database-guidelines.md, "Multi-tenancy strategy"). `email_domain`
-- is a single convenience column kept for backward compatibility;
-- multi-domain support is the dedicated `university_domains` table
-- (Chunk 04, below). `status` (operational) and `verification_status`
-- (institutional — Chunk 04) are deliberately independent dimensions —
-- see docs/university-management.md, "University lifecycle".
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS universities (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid                CHAR(36)     NOT NULL,
  name                VARCHAR(255) NOT NULL,
  short_name          VARCHAR(100) NULL,
  slug                VARCHAR(150) NOT NULL,
  description         TEXT NULL,
  logo_url            VARCHAR(500) NULL,
  website_url         VARCHAR(500) NULL,
  email_domain        VARCHAR(255) NULL,
  country             VARCHAR(100) NULL,
  state_province      VARCHAR(100) NULL,
  city                VARCHAR(100) NULL,
  address             VARCHAR(500) NULL,
  postal_code         VARCHAR(20)  NULL,
  status              ENUM('PENDING','ACTIVE','SUSPENDED','DEACTIVATED') NOT NULL DEFAULT 'PENDING',
  verified_at         DATETIME NULL,
  verification_status ENUM('UNVERIFIED','PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'UNVERIFIED',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at          DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_universities_uuid (uuid),
  UNIQUE KEY uq_universities_slug (slug),
  KEY ix_universities_status (status),
  KEY ix_universities_country (country),
  KEY ix_universities_city (city),
  KEY ix_universities_verification_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- faculties — belongs to exactly one university. University deletion
-- never cascades here (RESTRICT); soft-delete is the normal teardown
-- path for institutional entities — see docs/database-guidelines.md
-- ("Foreign key strategy").
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faculties (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid           CHAR(36)     NOT NULL,
  university_id  BIGINT UNSIGNED NOT NULL,
  name           VARCHAR(255) NOT NULL,
  short_name     VARCHAR(100) NULL,
  description    TEXT NULL,
  status         ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_faculties_uuid (uuid),
  KEY ix_faculties_university_id (university_id),
  CONSTRAINT fk_faculties_university FOREIGN KEY (university_id) REFERENCES universities (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- departments — always belongs to a university; faculty_id is OPTIONAL
-- because some institutions run departments directly under the
-- university with no faculty layer (see docs/database-guidelines.md,
-- "Institution hierarchy"). Losing a faculty clears the reference
-- (SET NULL) rather than blocking or cascading.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid           CHAR(36)     NOT NULL,
  university_id  BIGINT UNSIGNED NOT NULL,
  faculty_id     BIGINT UNSIGNED NULL,
  name           VARCHAR(255) NOT NULL,
  short_name     VARCHAR(100) NULL,
  description    TEXT NULL,
  status         ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_departments_uuid (uuid),
  KEY ix_departments_university_id (university_id),
  KEY ix_departments_faculty_id (faculty_id),
  CONSTRAINT fk_departments_university FOREIGN KEY (university_id) REFERENCES universities (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_departments_faculty FOREIGN KEY (faculty_id) REFERENCES faculties (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- programs — always belongs to a department (and transitively a
-- university, optionally a faculty). `degree_level` is VARCHAR, not
-- ENUM, so the vocabulary can grow without a migration (see
-- docs/database-guidelines.md, "Naming conventions").
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid            CHAR(36)     NOT NULL,
  university_id   BIGINT UNSIGNED NOT NULL,
  faculty_id      BIGINT UNSIGNED NULL,
  department_id   BIGINT UNSIGNED NOT NULL,
  name            VARCHAR(255) NOT NULL,
  short_name      VARCHAR(100) NULL,
  degree_level    VARCHAR(30)  NOT NULL,
  description     TEXT NULL,
  duration_years  DECIMAL(3,1) UNSIGNED NULL,
  status          ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_programs_uuid (uuid),
  KEY ix_programs_university_id (university_id),
  KEY ix_programs_department_id (department_id),
  KEY ix_programs_degree_level (degree_level),
  CONSTRAINT fk_programs_university FOREIGN KEY (university_id) REFERENCES universities (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_programs_faculty FOREIGN KEY (faculty_id) REFERENCES faculties (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_programs_department FOREIGN KEY (department_id) REFERENCES departments (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- permissions — reference table of grantable actions (USER_VIEW,
-- ROLE_ASSIGN, ...). Same VARCHAR-not-ENUM extensibility reasoning as
-- roles.name. Not soft-deletable: reference data is hard-removed.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(50)  NOT NULL,
  description VARCHAR(255) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- role_permissions — many-to-many join between roles and permissions.
-- Pure relational data: hard-deleted, cascades with its parent role or
-- permission (same policy as user_roles).
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_id       BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_role_permissions_role_permission (role_id, permission_id),
  KEY ix_role_permissions_permission_id (permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- refresh_tokens — one row per issued refresh token. Only a SHA-256 hash
-- of the raw token is stored (never the token itself) — see
-- docs/database-guidelines.md, "Token hashing" for why SHA-256 rather
-- than bcrypt is correct here. Revocation is a column (revoked_at), not
-- a delete, so a token's history stays inspectable; hard-deleted only
-- when its user is (CASCADE), same policy as user_roles.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  token_hash    CHAR(64)  NOT NULL,
  expires_at    DATETIME  NOT NULL,
  revoked_at    DATETIME  NULL,
  last_used_at  DATETIME  NULL,
  created_at    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_token_hash (token_hash),
  KEY ix_refresh_tokens_user_id (user_id),
  KEY ix_refresh_tokens_expires_at (expires_at),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- email_verification_tokens — one row per issued verification token.
-- Same hashing rationale as refresh_tokens. `used_at` marks single-use
-- consumption; hard-deleted only when its user is (CASCADE).
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  expires_at  DATETIME NOT NULL,
  used_at     DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_verification_tokens_token_hash (token_hash),
  KEY ix_email_verification_tokens_user_id (user_id),
  KEY ix_email_verification_tokens_expires_at (expires_at),
  CONSTRAINT fk_email_verification_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- university_domains — verified email domains for a university (Chunk
-- 04). Stores bare domains only, never full email addresses.
-- `domain` is globally unique (see docs/university-management.md).
-- University deletion never cascades here (RESTRICT), same policy as
-- faculties/departments/programs.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS university_domains (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid           CHAR(36)     NOT NULL,
  university_id  BIGINT UNSIGNED NOT NULL,
  domain         VARCHAR(255) NOT NULL,
  is_primary     TINYINT(1)   NOT NULL DEFAULT 0,
  status         ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_university_domains_uuid (uuid),
  UNIQUE KEY uq_university_domains_domain (domain),
  KEY ix_university_domains_university_id (university_id),
  CONSTRAINT fk_university_domains_university FOREIGN KEY (university_id) REFERENCES universities (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- university_memberships — institutional affiliation: which university a
-- user belongs to and in what capacity (Chunk 04). Deliberately separate
-- from platform Role — see docs/university-management.md, "Role vs.
-- membership". `is_primary` "only one per user" is enforced at the
-- service layer (MySQL has no partial/filtered unique index for it) —
-- see server/src/modules/university/membership.service.js.
-- A user's memberships cascade with the user (CASCADE); a university
-- with active memberships cannot be hard-deleted out from under them
-- (RESTRICT), matching faculties/departments/programs.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS university_memberships (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid             CHAR(36)     NOT NULL,
  user_id          BIGINT UNSIGNED NOT NULL,
  university_id    BIGINT UNSIGNED NOT NULL,
  membership_type  ENUM('STUDENT','FACULTY','RESEARCHER','STAFF','ADMIN') NOT NULL,
  status           ENUM('PENDING','ACTIVE','SUSPENDED','ENDED') NOT NULL DEFAULT 'PENDING',
  is_primary       TINYINT(1) NOT NULL DEFAULT 0,
  joined_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at          DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_university_memberships_uuid (uuid),
  UNIQUE KEY uq_university_memberships_user_university_type (user_id, university_id, membership_type),
  KEY ix_university_memberships_university_id (university_id),
  KEY ix_university_memberships_status (status),
  CONSTRAINT fk_university_memberships_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_university_memberships_university FOREIGN KEY (university_id) REFERENCES universities (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- audit_logs — append-only institutional audit trail (Chunk 04). No
-- `uuid` (never addressed by ID from any endpoint), no `deleted_at`
-- (immutable — never soft-deleted, let alone hard-deleted), no
-- `updated_at` (an entry is written once and never changed). See
-- docs/university-management.md, "Audit logging".
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id  BIGINT UNSIGNED NULL,
  action         VARCHAR(100) NOT NULL,
  entity_type    VARCHAR(50)  NOT NULL,
  entity_id      BIGINT UNSIGNED NOT NULL,
  university_id  BIGINT UNSIGNED NULL,
  metadata       JSON NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_audit_logs_entity (entity_type, entity_id),
  KEY ix_audit_logs_university_id (university_id),
  KEY ix_audit_logs_actor_user_id (actor_user_id),
  KEY ix_audit_logs_created_at (created_at),
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_audit_logs_university FOREIGN KEY (university_id) REFERENCES universities (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Chunk 05: Student Academic Profile
-- See docs/student-profiles.md for the full domain design.
-- =============================================================================

-- -----------------------------------------------------------------------
-- skills — reusable, platform-wide skill catalog (Chunk 05). Has a
-- `uuid` (unlike roles/permissions) because it IS addressed directly
-- from a URL (/api/students/me/skills/:skillId). No `deleted_at`:
-- retiring a skill is `status = INACTIVE`, not a soft delete, since
-- existing student_skills rows referencing it must stay meaningful.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid        CHAR(36)     NOT NULL,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL,
  category    VARCHAR(30)  NOT NULL,
  status      ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skills_uuid (uuid),
  UNIQUE KEY uq_skills_name (name),
  UNIQUE KEY uq_skills_slug (slug),
  KEY ix_skills_category (category),
  KEY ix_skills_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- interests — reusable, platform-wide academic-interest catalog
-- (Chunk 05). Same reasoning as `skills`.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interests (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid        CHAR(36)     NOT NULL,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL,
  category    VARCHAR(30)  NULL,
  status      ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_interests_uuid (uuid),
  UNIQUE KEY uq_interests_name (name),
  UNIQUE KEY uq_interests_slug (slug),
  KEY ix_interests_category (category),
  KEY ix_interests_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- research_areas — hierarchical, platform-wide research-area catalog
-- (Chunk 05), e.g. Artificial Intelligence > Machine Learning > Deep
-- Learning. `parent_id` is self-referential; SET NULL mirrors the
-- Faculty -> Department precedent (an optional parent reference clears
-- rather than blocks or cascades).
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research_areas (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid        CHAR(36)     NOT NULL,
  name        VARCHAR(150) NOT NULL,
  slug        VARCHAR(170) NOT NULL,
  parent_id   BIGINT UNSIGNED NULL,
  description TEXT NULL,
  status      ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_research_areas_uuid (uuid),
  UNIQUE KEY uq_research_areas_slug (slug),
  KEY ix_research_areas_parent_id (parent_id),
  KEY ix_research_areas_status (status),
  CONSTRAINT fk_research_areas_parent FOREIGN KEY (parent_id) REFERENCES research_areas (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- languages — reusable, platform-wide language catalog (Chunk 05).
-- `code` is the ISO 639-1 code where one exists, stored for display; the
-- API addresses a language by its `uuid`, consistent with every other
-- catalog table in this chunk.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS languages (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid        CHAR(36)    NOT NULL,
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(10)  NOT NULL,
  status      ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_languages_uuid (uuid),
  UNIQUE KEY uq_languages_name (name),
  UNIQUE KEY uq_languages_code (code),
  KEY ix_languages_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- student_profiles — the Student Academic Profile (Chunk 05). Deliberately
-- separate from `users` (identity only) and from `university_memberships`
-- (which remains the authoritative institutional-affiliation record) —
-- see docs/student-profiles.md. `user_id` is unique: one profile per user
-- in this chunk. `student_identifier` is sensitive institutional data,
-- unique per-university (not globally) since a student number is only
-- guaranteed unique within its issuing institution — MySQL treats each
-- NULL as distinct, so many students without one is fine.
-- `current_semester` is intentionally a plain TINYINT UNSIGNED (0-255)
-- rather than a narrower type: the real ceiling is enforced by the Joi
-- validator, not the database (see docs/student-profiles.md).
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_profiles (
  id                        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid                      CHAR(36)     NOT NULL,
  user_id                   BIGINT UNSIGNED NOT NULL,
  university_id             BIGINT UNSIGNED NOT NULL,
  program_id                BIGINT UNSIGNED NULL,
  student_identifier        VARCHAR(50)  NULL,
  admission_year            SMALLINT UNSIGNED NULL,
  expected_graduation_year  SMALLINT UNSIGNED NULL,
  current_semester          TINYINT UNSIGNED NULL,
  academic_status           ENUM('ACTIVE','ON_LEAVE','GRADUATED','SUSPENDED','WITHDRAWN') NOT NULL DEFAULT 'ACTIVE',
  bio                       TEXT NULL,
  headline                  VARCHAR(150) NULL,
  profile_visibility        ENUM('PUBLIC','ACADEMIC_NETWORK','UNIVERSITY_ONLY','CONNECTIONS_ONLY','PRIVATE')
                              NOT NULL DEFAULT 'ACADEMIC_NETWORK',
  availability_status       ENUM('NOT_SPECIFIED','AVAILABLE','LIMITED','NOT_AVAILABLE') NOT NULL DEFAULT 'NOT_SPECIFIED',
  created_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at                DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_profiles_uuid (uuid),
  UNIQUE KEY uq_student_profiles_user_id (user_id),
  UNIQUE KEY uq_student_profiles_university_identifier (university_id, student_identifier),
  KEY ix_student_profiles_university_id (university_id),
  KEY ix_student_profiles_program_id (program_id),
  KEY ix_student_profiles_academic_status (academic_status),
  KEY ix_student_profiles_availability_status (availability_status),
  KEY ix_student_profiles_university_status (university_id, academic_status),
  CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_student_profiles_university FOREIGN KEY (university_id) REFERENCES universities (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_student_profiles_program FOREIGN KEY (program_id) REFERENCES programs (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- student_skills — a student's self-reported skill + proficiency
-- (Chunk 05). Pure relational fact (like user_roles): no uuid, no soft
-- delete, both FKs CASCADE.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_skills (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_profile_id  BIGINT UNSIGNED NOT NULL,
  skill_id            BIGINT UNSIGNED NOT NULL,
  proficiency_level   ENUM('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT') NOT NULL DEFAULT 'BEGINNER',
  years_experience    DECIMAL(3,1) UNSIGNED NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_skills_profile_skill (student_profile_id, skill_id),
  KEY ix_student_skills_skill_id (skill_id),
  CONSTRAINT fk_student_skills_profile FOREIGN KEY (student_profile_id) REFERENCES student_profiles (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_student_skills_skill FOREIGN KEY (skill_id) REFERENCES skills (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- student_interests — a student's academic interest (Chunk 05). Same
-- reasoning as student_skills.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_interests (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_profile_id  BIGINT UNSIGNED NOT NULL,
  interest_id         BIGINT UNSIGNED NOT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_interests_profile_interest (student_profile_id, interest_id),
  KEY ix_student_interests_interest_id (interest_id),
  CONSTRAINT fk_student_interests_profile FOREIGN KEY (student_profile_id) REFERENCES student_profiles (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_student_interests_interest FOREIGN KEY (interest_id) REFERENCES interests (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- student_research_interests — a student's self-described interest in a
-- research area (Chunk 05). Same reasoning as student_skills.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_research_interests (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_profile_id  BIGINT UNSIGNED NOT NULL,
  research_area_id    BIGINT UNSIGNED NOT NULL,
  interest_level      ENUM('CURIOUS','INTERESTED','ACTIVE','ADVANCED') NOT NULL DEFAULT 'CURIOUS',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_research_interests_profile_area (student_profile_id, research_area_id),
  KEY ix_student_research_interests_area_id (research_area_id),
  CONSTRAINT fk_student_research_interests_profile FOREIGN KEY (student_profile_id) REFERENCES student_profiles (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_student_research_interests_area FOREIGN KEY (research_area_id) REFERENCES research_areas (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- student_languages — a language a student speaks + proficiency
-- (Chunk 05). Same reasoning as student_skills.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_languages (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_profile_id  BIGINT UNSIGNED NOT NULL,
  language_id         BIGINT UNSIGNED NOT NULL,
  proficiency_level   ENUM('BASIC','CONVERSATIONAL','PROFESSIONAL','FLUENT','NATIVE') NOT NULL DEFAULT 'CONVERSATIONAL',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_languages_profile_language (student_profile_id, language_id),
  KEY ix_student_languages_language_id (language_id),
  CONSTRAINT fk_student_languages_profile FOREIGN KEY (student_profile_id) REFERENCES student_profiles (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_student_languages_language FOREIGN KEY (language_id) REFERENCES languages (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- student_certifications — a certification a student holds (Chunk 05).
-- Unlike the join tables above, this is a standalone record addressed by
-- its own id from a URL, so it has a uuid and is soft-deleted (paranoid),
-- consistent with every other externally-addressable entity. External
-- credential verification is out of scope for this chunk.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_certifications (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid                  CHAR(36)     NOT NULL,
  student_profile_id    BIGINT UNSIGNED NOT NULL,
  name                  VARCHAR(255) NOT NULL,
  issuing_organization  VARCHAR(255) NULL,
  issue_date            DATE NULL,
  expiry_date           DATE NULL,
  credential_id         VARCHAR(255) NULL,
  credential_url        VARCHAR(500) NULL,
  description           TEXT NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at            DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_certifications_uuid (uuid),
  KEY ix_student_certifications_profile_id (student_profile_id),
  CONSTRAINT fk_student_certifications_profile FOREIGN KEY (student_profile_id) REFERENCES student_profiles (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- student_achievements — an achievement a student wants to showcase
-- (Chunk 05). Same reasoning as student_certifications.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_achievements (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid                CHAR(36)     NOT NULL,
  student_profile_id  BIGINT UNSIGNED NOT NULL,
  title               VARCHAR(255) NOT NULL,
  description         TEXT NULL,
  organization        VARCHAR(255) NULL,
  achievement_date    DATE NULL,
  url                 VARCHAR(500) NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at          DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_achievements_uuid (uuid),
  KEY ix_student_achievements_profile_id (student_profile_id),
  CONSTRAINT fk_student_achievements_profile FOREIGN KEY (student_profile_id) REFERENCES student_profiles (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------
-- student_goals — an academic/career goal a student is tracking
-- (Chunk 05). Same reasoning as student_certifications.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_goals (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid                CHAR(36)     NOT NULL,
  student_profile_id  BIGINT UNSIGNED NOT NULL,
  goal_type           ENUM('RESEARCH','MENTORSHIP','INTERNSHIP','PROJECT','SCHOLARSHIP','GRADUATE_STUDY','CAREER','COMPETITION','OTHER') NOT NULL,
  title               VARCHAR(255) NOT NULL,
  description         TEXT NULL,
  target_date         DATE NULL,
  status              ENUM('ACTIVE','COMPLETED','PAUSED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at          DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_goals_uuid (uuid),
  KEY ix_student_goals_profile_id (student_profile_id),
  KEY ix_student_goals_status (status),
  CONSTRAINT fk_student_goals_profile FOREIGN KEY (student_profile_id) REFERENCES student_profiles (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
