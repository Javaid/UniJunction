-- =============================================================================
-- Academic Connect — Migration 002
-- Chunk 05: Student Academic Profile
--
-- Upgrades an existing Chunk 02/03/04 database. Adds only NEW tables
-- (student_profiles, skills, student_skills, interests, student_interests,
-- research_areas, student_research_interests, languages,
-- student_languages, student_certifications, student_achievements,
-- student_goals) — no ALTER TABLE against existing tables is required for
-- this chunk, unlike migration 001. All new tables use
-- CREATE TABLE IF NOT EXISTS, so this file is also safe to run against a
-- database that already has them (a no-op).
--
-- A FRESH database never needs this file — database/schema.sql already
-- includes every table below. Run this only against a database that was
-- already running Chunk 04 or earlier.
--
-- After this file, run database/seed_rbac.sql (adds the new
-- STUDENT_PROFILE_VIEW permission) and database/seed_catalog.sql (the
-- initial skills/interests/research-areas/languages catalog) — see
-- docs/student-profiles.md.
--
-- Usage:
--   mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> \
--     < database/migrations/002_chunk05_student_profiles.sql
-- =============================================================================

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
