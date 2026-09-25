-- =============================================================================
-- Migration 001 — Chunk 04: Institutional management
--
-- For a database that already has the Chunk 02/03 schema applied (i.e.
-- `universities` exists without a `verification_status` column). A
-- brand-new database should use database/schema.sql directly instead —
-- it already includes everything below.
--
-- This is the first ALTER TABLE this project has needed — see
-- docs/database-guidelines.md, "Production migration strategy", which
-- flagged this exact moment as when a real migration file (rather than
-- just editing schema.sql) becomes necessary, since schema.sql's
-- `CREATE TABLE IF NOT EXISTS` statements cannot retroactively alter a
-- table that already exists with an older shape.
--
-- The ALTER TABLE statement below will fail with a duplicate-column
-- error if run twice against the same database — that failure means
-- this migration was already applied; it is not harmful, and the
-- CREATE TABLE statements that follow are safe to re-run regardless
-- (IF NOT EXISTS).
--
-- Usage:
--   mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> \
--     < database/migrations/001_chunk04_institution_management.sql
-- =============================================================================

SET NAMES utf8mb4;

ALTER TABLE universities
  ADD COLUMN verification_status ENUM('UNVERIFIED','PENDING','VERIFIED','REJECTED')
    NOT NULL DEFAULT 'UNVERIFIED' AFTER verified_at,
  ADD KEY ix_universities_verification_status (verification_status);

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
