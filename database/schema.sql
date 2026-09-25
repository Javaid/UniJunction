-- =============================================================================
-- Academic Connect — Core Schema (Chunk 02: Identity & Institution foundation)
--
-- Scope: users, roles, user_roles, universities, faculties, departments,
-- programs. Nothing beyond this chunk's domains is created here — see
-- docs/database-guidelines.md ("Future schema domains") for what comes next.
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
-- is a single convenience domain; multi-domain support is a documented
-- future table (university_domains), not built here.
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS universities (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid            CHAR(36)     NOT NULL,
  name            VARCHAR(255) NOT NULL,
  short_name      VARCHAR(100) NULL,
  slug            VARCHAR(150) NOT NULL,
  description     TEXT NULL,
  logo_url        VARCHAR(500) NULL,
  website_url     VARCHAR(500) NULL,
  email_domain    VARCHAR(255) NULL,
  country         VARCHAR(100) NULL,
  state_province  VARCHAR(100) NULL,
  city            VARCHAR(100) NULL,
  address         VARCHAR(500) NULL,
  postal_code     VARCHAR(20)  NULL,
  status          ENUM('PENDING','ACTIVE','SUSPENDED','DEACTIVATED') NOT NULL DEFAULT 'PENDING',
  verified_at     DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_universities_uuid (uuid),
  UNIQUE KEY uq_universities_slug (slug),
  KEY ix_universities_status (status),
  KEY ix_universities_country (country),
  KEY ix_universities_city (city)
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
