# Database ERD — Chunk 02 (Identity & Institution)

This diagram covers only the tables implemented so far. See
[`database-guidelines.md`](./database-guidelines.md) for the domains
planned for later chunks.

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : "has"
    ROLES ||--o{ USER_ROLES : "assigned via"

    UNIVERSITIES ||--o{ FACULTIES : "has"
    UNIVERSITIES ||--o{ DEPARTMENTS : "has"
    UNIVERSITIES ||--o{ PROGRAMS : "has"
    FACULTIES ||--o{ DEPARTMENTS : "optionally groups"
    FACULTIES ||--o{ PROGRAMS : "optionally groups"
    DEPARTMENTS ||--o{ PROGRAMS : "offers"

    USERS {
        bigint id PK
        char_36 uuid UK
        varchar_255 email UK
        varchar_255 password_hash
        varchar_100 first_name
        varchar_100 last_name
        varchar_150 display_name
        varchar_30 phone
        varchar_500 avatar_url
        enum status
        datetime email_verified_at
        datetime last_login_at
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    ROLES {
        bigint id PK
        varchar_50 name UK
        varchar_255 description
        datetime created_at
        datetime updated_at
    }

    USER_ROLES {
        bigint id PK
        bigint user_id FK
        bigint role_id FK
        datetime created_at
        datetime updated_at
    }

    UNIVERSITIES {
        bigint id PK
        char_36 uuid UK
        varchar_255 name
        varchar_100 short_name
        varchar_150 slug UK
        text description
        varchar_500 logo_url
        varchar_500 website_url
        varchar_255 email_domain
        varchar_100 country
        varchar_100 state_province
        varchar_100 city
        varchar_500 address
        varchar_20 postal_code
        enum status
        datetime verified_at
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    FACULTIES {
        bigint id PK
        char_36 uuid UK
        bigint university_id FK
        varchar_255 name
        varchar_100 short_name
        text description
        enum status
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    DEPARTMENTS {
        bigint id PK
        char_36 uuid UK
        bigint university_id FK
        bigint faculty_id "FK, nullable"
        varchar_255 name
        varchar_100 short_name
        text description
        enum status
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    PROGRAMS {
        bigint id PK
        char_36 uuid UK
        bigint university_id FK
        bigint faculty_id "FK, nullable"
        bigint department_id FK
        varchar_255 name
        varchar_100 short_name
        varchar_30 degree_level
        text description
        decimal_3_1 duration_years
        enum status
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
```

## Reading this diagram

- `USERS ↔ ROLES` is many-to-many through `USER_ROLES` — a user can hold
  several roles (e.g. `FACULTY` and `UNIVERSITY_ADMIN`) at once.
- `UNIVERSITIES` is the root of the institution hierarchy. `FACULTIES`
  and `DEPARTMENTS` both carry a direct `university_id`, not just a
  transitive one through each other — this is deliberate, since
  `faculty_id` on `DEPARTMENTS` (and on `PROGRAMS`) is optional. An
  institution without a faculty layer still has departments correctly
  scoped to their university.
- `PROGRAMS` always has a `department_id`, and carries `university_id`
  (and optionally `faculty_id`) directly for the same reason — querying
  "all programs at university X" should never require walking through an
  optional faculty relationship.

Full column types, constraints, indexes, and `ON DELETE` behavior are in
[`../database/schema.sql`](../database/schema.sql) and explained in
[`database-guidelines.md`](./database-guidelines.md).
