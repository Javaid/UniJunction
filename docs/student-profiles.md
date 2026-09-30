# Student Academic Profile (Chunk 05)

This document covers the Student Academic Profile domain: profile
architecture, its relationship to identity and institutional membership,
skills/interests/research areas/languages, certifications, achievements,
goals, visibility, profile completeness, and authorization. Read it
alongside [`architecture.md`](./architecture.md),
[`authentication.md`](./authentication.md) (global RBAC),
[`university-management.md`](./university-management.md) (institutional
membership, the authoritative source this domain builds on top of), and
[`database-guidelines.md`](./database-guidelines.md) /
[`database-erd.md`](./database-erd.md) for schema detail.

## 1. Scope

Implemented in this chunk: the student academic profile itself; a
reusable skills/interests/research-areas/languages catalog and each
student's associations to them; certifications, achievements, and
academic goals; profile visibility and its centralized enforcement;
server-calculated profile completeness; self-service student APIs;
public/discovery read access; and a foundational university-admin
student roster view.

**Explicitly not implemented** (see §16): faculty/researcher profiles,
research projects, student projects, project applications, mentorship,
connections, messaging, events, opportunities, AI matching, a
recommendation engine, advanced search, a dedicated search engine, file
uploads, a resume builder, a social feed, or SSO. This chunk establishes
the foundation those future modules will build on — the database is
structured so a future search/matching layer can filter by university,
program, skills, interests, research areas, availability, and degree
level without a schema change, but no such layer exists yet.

## 2. Architectural principle — three separate concepts

```
USER
 │
 ├── Authentication (Chunk 03)
 ├── Roles (Chunk 03)
 │
 └── University Membership (Chunk 04)
        │
        └── Student Academic Profile (Chunk 05)
```

`users` holds only genuinely identity-related fields (name, email,
password, status). `university_memberships` remains the **authoritative**
record of institutional affiliation — which university, in what
capacity, and its lifecycle status. `student_profiles` holds academic
detail that belongs to neither: program, semester, bio, visibility,
availability, and every skill/interest/research/language/certification/
achievement/goal association. A bug fix or a new field never gets added
to `users` just because "it's about the student" — see
`database-guidelines.md` §4 for the same reasoning applied to the
primary-key strategy.

## 3. Student ↔ User

A user has **at most one** student profile in this chunk —
`student_profiles.user_id` is unique. This is deliberately a simple rule
for now: "one active student profile per academic identity context," not
"one profile per user forever under every possible future context." A
user who also becomes a `FACULTY` or `RESEARCHER` in a later chunk would
get a *separate* profile table for that context (not built here) — the
architecture does not assume one person can only ever hold one academic
role. See §17, "Known limitations," for the specific edge case this
simplicity leaves unresolved (re-creating a profile after a future
delete).

## 4. Student ↔ University

`student_profiles.university_id` is set once at profile creation and is
**never** silently reassignable (see §11, "Profile update rules"). It is
not a duplicate of `university_memberships` — that table remains the
single source of truth for "is this person actually affiliated with this
university, and how." `student_profiles.university_id` exists for
efficient academic querying (the profile itself needs to know which
institution to serialize alongside program lookups, admin scoping, and
future discovery filtering) without joining through the membership table
on every read.

**Validated, never assumed.** Creating a profile requires the caller to
hold an `ACTIVE` `STUDENT`-type `UniversityMembership` at the exact
university being claimed (`assertActiveStudentMembership()`,
`server/src/modules/student/student-access.service.js`) — a user can
never claim membership in an arbitrary university by supplying its id in
the request body. This mirrors Chunk 04's `assertUniversityAccess`
pattern (role + membership checked together, never role alone) applied
to the student context specifically.

## 5. Student ↔ Program

```
University
   │
   └── Program
          │
          └── Student Profile
```

A program is optional (`program_id` nullable) — a student without a
declared major is a legitimate state. When a program **is** supplied
(at creation via `POST /api/students/me/profile`, or later via
`PUT /api/students/me/profile`), the service validates, in order:

1. The program exists.
2. The program's `status` is `ACTIVE`.
3. The program's `university_id` matches the profile's own
   `university_id`.

A university-A student attempting to attach a university-B program is
rejected with `400` (`resolveActiveProgramForUniversity()`) — this chunk
does not support any legitimate cross-institution program relationship,
so the scenario is flatly refused rather than partially allowed.

## 6. Academic status

```
ACTIVE       → currently enrolled and studying
ON_LEAVE     → temporarily not attending, expected to return
GRADUATED    → completed the program
SUSPENDED    → enrollment suspended (disciplinary, academic, etc.)
WITHDRAWN    → permanently left without completing
```

Changed only via `PATCH /api/students/me/profile/status` — never through
the general profile update — mirroring the university/faculty/
department/program status-change pattern from Chunk 04 exactly. Every
change is audited (`STUDENT_PROFILE_STATUS_CHANGED`, metadata
`{ from, to }`). In this chunk it remains a self-service action (the
brief's admin-oversight section keeps institutional admin access
read-focused, and defines no separate admin status-change endpoint) —
see §12 for why moving `GRADUATED`/`SUSPENDED`/`WITHDRAWN` to an
institutional workflow is flagged as a documented future direction, not
a gap silently glossed over.

## 7. Current semester

`current_semester` is a plain integer, never free text like "almost done
with second year." The database column is a permissive `TINYINT UNSIGNED`
(0–255) — deliberately not the real constraint — because the database
should never be what stands between a legitimate long-duration or
part-time program and a valid value. The actual ceiling (1–20) is
enforced in the Joi validator
(`server/src/modules/student/student-profile.validator.js`), generous
enough for extended-duration and part-time enrollment without being
meaningless.

## 8. Profile visibility

```
PUBLIC             → anyone, including an anonymous visitor
ACADEMIC_NETWORK    → any signed-in Academic Connect member
UNIVERSITY_ONLY     → members of the student's own university only
CONNECTIONS_ONLY     → reserved; the Connections domain doesn't exist yet
PRIVATE             → the owner only
```

The owner controls this setting, but it can **never** override
institutional administration, platform moderation, or legal access
requirements (§9/§26 of the brief) — see §10 below for exactly how that
is enforced, not just asserted.

**Default:** `ACADEMIC_NETWORK`, not `PUBLIC` and not `PRIVATE` — a
deliberate middle ground. `PUBLIC` by default would expose every new
profile to the open internet before the student has made an informed
choice; `PRIVATE` by default would defeat the platform's core
cross-university-discovery value before the student ever gets to
experience it. `ACADEMIC_NETWORK` means "visible within the platform to
any authenticated member" — real discovery, without being indexed by the
open web on day one.

**`CONNECTIONS_ONLY` is conservatively treated as `PRIVATE`.** The brief
explicitly excludes the Connections domain from this chunk (§58), so
there is no connection graph to check membership against. Rather than
silently defaulting to some other behavior, `resolveStudentProfileAccess`
(§10) denies every non-owner/non-admin viewer for a `CONNECTIONS_ONLY`
profile, exactly as it would for `PRIVATE` — deny-by-default, not
accidentally-public. This is documented here and in the value's own Joi
description shown to users (see the frontend's Privacy section, §15).

## 9. Availability status

```
NOT_SPECIFIED   → no signal given
AVAILABLE       → open to collaboration
LIMITED         → open, but with constraints (time, scope, ...)
NOT_AVAILABLE   → not currently open to collaboration
```

Purely a self-reported signal for future project/research matching
(explicitly not built in this chunk — see §16). Defaults to
`NOT_SPECIFIED`.

## 10. Visibility enforcement — the centralized service

Every read of a profile — the owner's own `GET /me/profile`, the public
`GET /:id/profile`, and the admin bypass — funnels through one function:
`resolveStudentProfileAccess(profile, viewer)`
(`server/src/modules/student/student-profile.serializer.js`). It returns
`{ tier: 'owner' | 'admin' | 'public', context }` or `null` (denied) —
never duplicated per-controller logic, per the brief's explicit
instruction (§26).

Decision order, every time:

```
1. No profile_visibility check overrides institutional oversight:
   - viewer is the OWNER (internalId === profile.userId)              → owner tier, always
   - viewer is SUPER_ADMIN                                            → admin tier, always
   - viewer is the UNIVERSITY_ADMIN of THIS SPECIFIC university        → admin tier, always
     (reuses Chunk 04's assertUniversityAccess — same role+membership
     check as every other institutional-admin gate in this codebase)
2. Otherwise, ordinary visibility rules apply:
   - PUBLIC / ACADEMIC_NETWORK  → any authenticated viewer; PUBLIC also
     allows an anonymous one
   - UNIVERSITY_ONLY            → only a viewer with an ACTIVE
     membership (any type) at the same university
   - CONNECTIONS_ONLY / PRIVATE → denied (see §8)
```

**Denial is `404`, never `403`.** An unauthorized viewer gets "Student
profile not found," identical to a genuinely nonexistent id — the same
deliberate choice Chunk 04 made for cross-tenant resource access (see
`university-management.md` §15): confirming a profile *exists* but is
merely hidden would itself leak information the visibility setting is
meant to protect.

Two tiers of output follow from this: **owner/admin** get the full
detail (§11's list, including `student_identifier`, `academic_status`,
`admission_year`, `expected_graduation_year`, `current_semester`,
`profile_visibility`, timestamps, and `profile_completeness`); **public**
gets the safe shape only (§13). The same safe shape is used for every
authorized non-owner/non-admin viewer regardless of *which* visibility
tier let them in — visibility is a binary gate on "can you see this
profile at all," not a per-field toggle.

**Viewer contexts** (`OWNER`, `SUPER_ADMIN`, `UNIVERSITY_ADMIN`,
`FACULTY`, `RESEARCHER`, `STUDENT`, `ANONYMOUS`) are all resolved and
available on the access decision (`resolveRoleContext()`), even though
`FACULTY`/`RESEARCHER`/`STUDENT` currently collapse into the same
"any authenticated member" bucket for visibility purposes — no
role-specific discovery rule exists yet. The distinct contexts exist for
extension, not because they currently branch differently.

## 11. Field-level output — what's never in the public tier

Per §25/§43 of the brief, the public/safe serialization
(`toPublicStudentProfile`) never includes:

- `student_identifier` (§12)
- the user's `email` or `phone` (only `first_name`/`last_name`/
  `display_name` are ever surfaced — `toPublicUser`/`toAuthenticatedUser`
  from the auth domain are never reused here, since those exist for a
  user's *own* session, not for describing them to a third party)
- any internal numeric id (`student_profiles.id`,
  `university_memberships.id`, ...) — every reference is a `uuid`
- `profile_visibility`, `academic_status`, `admission_year`,
  `expected_graduation_year`, `current_semester` (institutional/
  administrative detail — owner/admin tier only)
- raw Sequelize model instances — every response goes through a
  serializer function (`serializeStudentProfile`,
  `serializeSkill`/`serializeInterest`/... in
  `student-profile.serializer.js`), never `res.json(modelInstance)`

## 12. Student identifier — sensitive institutional data

`student_identifier` (a university-issued student number) is:

- **Not** globally unique — `student_profiles` has a composite unique
  key `(university_id, student_identifier)`, since a student number is
  only guaranteed unique *within* its issuing institution. MySQL treats
  each `NULL` as distinct in a unique index, so any number of students
  without one is fine.
- **Never** in the public serialization tier, the admin student-list
  summary (§14), or search/discovery results.
- Settable **only at profile creation** (an optional field on
  `POST /me/profile`) and then **locked** — the ordinary update endpoint
  (`PUT /me/profile`) excludes it entirely from its Joi schema (stripped
  by `validate`'s `stripUnknown`), per §40 of the brief: changing it
  requires an institutional workflow this chunk does not build.
- Visible only to the profile **owner** and to that university's
  institutional admins (`SUPER_ADMIN`, or the profile's own
  `UNIVERSITY_ADMIN`) when they view the **individual** profile via
  `GET /api/students/:id/profile` (the admin-bypass tier from §10) — a
  deliberately narrower exposure than the admin **list** endpoint, which
  never includes it at all (§14) to minimize the blast radius of any
  single bulk request.

## 13. Skills, interests, research areas, languages — catalog architecture

None of these are comma-separated text fields. Each is a **normalized
catalog** (`skills`, `interests`, `research_areas`, `languages`) plus a
**per-student join table** (`student_skills`, `student_interests`,
`student_research_interests`, `student_languages`):

| Catalog | Join table | Extra join fields |
|---|---|---|
| `skills` (name, slug, category, status) | `student_skills` | `proficiency_level`, `years_experience` |
| `interests` (name, slug, category, status) | `student_interests` | — |
| `research_areas` (name, slug, `parent_id`, description, status) | `student_research_interests` | `interest_level` |
| `languages` (name, code, status) | `student_languages` | `proficiency_level` |

**Catalog tables carry a `uuid`**, unlike `roles`/`permissions` (which
are addressed by `name`) — because these catalogs *are* addressed
directly from a URL (`/api/students/me/skills/:skillId`, etc.), matching
the general rule in `database-guidelines.md` §4: an entity gets a `uuid`
when the API needs to reference it externally. `languages.code` (the ISO
639-1 code, e.g. `en`) is stored and displayed, but the API still
addresses a language by its `uuid` for consistency with the other three
catalogs — see `language.model.js`.

**Catalog tables are never soft-deleted.** They have no `deleted_at`;
retiring an entry is `status: INACTIVE`. A join-table row referencing it
must remain meaningful history, not silently "restorable" alongside the
thing it references.

**Join tables are pure relational facts** (like `user_roles`): no `uuid`,
no soft delete, both foreign keys `CASCADE`. Removing a skill from a
profile just removes the row. Proficiency/interest levels
(`BEGINNER`/.../`EXPERT`, `CURIOUS`/.../`ADVANCED`,
`BASIC`/.../`NATIVE`) are **explicitly self-reported**, never certified
qualifications — a future chunk could add verification, but nothing in
this chunk implies one.

**Duplicate prevention** is a real database constraint, not just an
application check: each join table has a unique key on
`(student_profile_id, catalog_id)`. Adding a skill/interest/research
area/language a student already has returns `409`, and the DB-level
unique constraint is the actual backstop against a race, not merely the
service-layer pre-check.

**Catalog management (admin CRUD) is intentionally not built this
chunk.** §16 of the brief says platform administrators "can manage the
global skill catalog," but the explicit, numbered API list (§27–§34)
only specifies `GET` catalog endpoints plus student-side add/update/
remove — no admin write endpoints. Rather than speculatively building an
unrequested admin surface, the initial catalog is seeded via
[`database/seed_catalog.sql`](../database/seed_catalog.sql) (the same
pattern as `seed_rbac.sql` for roles/permissions): a modest, curated set
— 27 skills, 15 interests, a 3-level research-area hierarchy, 15
languages — not "hundreds," per the brief's own caution. Admin catalog
management is a natural, low-effort extension for a future chunk.

## 14. Certifications, achievements, goals — standalone entities

Unlike the join tables above, `student_certifications`,
`student_achievements`, and `student_goals` are standalone records
addressed by their own id from a URL
(`/api/students/me/certifications/:id`, etc.) — so, consistent with
every other externally-addressable entity in this codebase, each has a
`uuid` and is `paranoid` (soft-deleted). This is a deliberate deviation
from the brief's literal field lists (which didn't list `uuid` for these
three) in favor of matching the established primary-key convention — see
`database-guidelines.md` §4.

- **`student_certifications`**: `issue_date`/`expiry_date` are
  independently optional, but once both are present `expiry_date` cannot
  precede `issue_date` — validated both in Joi
  (`certification.validator.js`) and re-checked at the service layer
  against the row's *persisted* value (`certification.service.js`),
  since a `PUT` that only changes `expiry_date` wouldn't otherwise see
  the existing `issue_date` in the same request payload. External
  credential verification (confirming a credential is real) is
  explicitly out of scope — see §16.
- **`student_achievements`**: hackathon wins, academic awards,
  competition results, scholarships — `title`, `organization`,
  `achievement_date`, `url`.
- **`student_goals`**: `goal_type` (`RESEARCH` / `MENTORSHIP` /
  `INTERNSHIP` / `PROJECT` / `SCHOLARSHIP` / `GRADUATE_STUDY` /
  `CAREER` / `COMPETITION` / `OTHER`) and `status` (`ACTIVE` /
  `COMPLETED` / `PAUSED` / `CANCELLED`, defaulting to `ACTIVE`).

All three `CASCADE` from their `student_profile_id` — they're owned
exclusively by the profile, same reasoning as `refresh_tokens`/
`university_memberships` cascading from their user.

## 15. Profile completeness

Calculated server-side from actual related data
(`calculateProfileCompleteness()`,
`server/src/modules/student/student-profile.serializer.js`) — **never**
a manually editable field, and no endpoint accepts a client-supplied
completeness value at all (not even to ignore it; it's simply not part
of any Joi schema, so it's stripped if sent). One example, documented
weighting (not a fixed law — a different scheme would be equally valid):

| Signal | Weight | Present when... |
|---|---|---|
| Basic academic identity | 20% | a program is selected |
| Headline | 10% | `headline` is non-empty |
| Bio | 10% | `bio` is non-empty |
| Skills | 15% | at least one skill added |
| Interests | 10% | at least one academic interest added |
| Research interests | 15% | at least one research interest added |
| Goals | 10% | at least one academic goal added |
| Achievements or certifications | 10% | at least one of either exists |

Each signal is all-or-nothing (no partial credit within a signal) —
simple, predictable, and easy to explain in the "complete your profile"
UI. The response (`profile_completeness: { score, missing }`) is
included only in the owner/admin serialization tier; `missing` is a list
of `{ label, points }` suggestions the frontend renders directly (§18) —
**the frontend never recomputes this independently**, per the brief's
explicit instruction (§49).

## 16. What this chunk deliberately does not include

Faculty profiles, researcher profiles, research projects, student
projects, project applications, mentorship, connections, messaging,
events, opportunities, AI matching, a recommendation engine, advanced
search, Elasticsearch/OpenSearch, file uploads, a resume builder, a
social feed, or university SSO. Also not built, though the schema is
positioned for it:

- External credential verification for certifications.
- Admin catalog management (create/deactivate a skill, interest,
  research area, or language) — see §13.
- Moving institutional determinations (`GRADUATED`/`SUSPENDED`/
  `WITHDRAWN`) to an admin-only workflow — see §6. Today's self-service
  `PATCH .../status` covers the full enum, matching the brief's explicit
  (and only) status-change endpoint; a future chunk may want to split
  self-declared transitions (e.g. `ACTIVE` ↔ `ON_LEAVE`) from
  institutional ones.
- A path to re-create a student profile after a (currently
  nonexistent) delete — `student_profiles.user_id` is uniquely
  constrained forever, including past a soft delete, since no delete
  endpoint exists yet to have designed around.

## 17. Cross-university discovery & search-indexing preparation

Per §36/§37 of the brief: no advanced search or matching is built this
chunk, and no dedicated search engine (Elasticsearch/OpenSearch) is
introduced. What *is* in place, so a future search layer needs no schema
change:

- Every relationship a future filter would need is a normalized foreign
  key, never a comma-separated field: university, program, skills,
  interests, research areas, languages, availability, degree level (via
  `program.degree_level`) are all queryable joins today.
- Indexes exist on exactly the columns a discovery query would filter or
  join on (§18).
- Reads that support discovery (`GET /api/students/:id/profile`,
  the catalog `GET` endpoints) are already visibility-aware and public
  where appropriate, so a future search layer sits on top of existing
  access rules rather than needing its own.

A dedicated search engine may be introduced later once query patterns
and scale justify it; this chunk deliberately does not anticipate that
by adding infrastructure it doesn't yet need.

## 18. Authorization

### Role vs. context, one more time

Only a user holding the global `STUDENT` role **and** an `ACTIVE`
`STUDENT`-type membership at the specific university being claimed may
create a profile (`assertActiveStudentMembership()`) — role alone is not
enough (a `FACULTY` member cannot create a student profile by calling the
API), and membership alone is not enough (an `ACTIVE` `STAFF` or `ADMIN`
membership doesn't make someone a student). This is the same
architectural discipline as Chunk 04's Role-vs-Membership split, applied
one level down.

### Profile creation transaction (§39, exact order)

`createProfile()` (`student-profile.service.js`) validates, in order:

1. Caller's account `status` is `ACTIVE` (re-checked explicitly —
   `requireAuth` itself also accepts `PENDING` accounts for endpoints
   that don't need to gate on it; profile creation does).
2. No existing profile for this user (`409` if one exists).
3. The target university exists and its `status` is `ACTIVE`.
4. The caller holds the `STUDENT` role.
5. The caller holds an `ACTIVE` `STUDENT`-type membership at that
   university.
6. If a program was supplied: it exists, is `ACTIVE`, and belongs to
   that same university.
7. The row is created inside a `sequelize.transaction()` alongside its
   audit-log entry (`STUDENT_PROFILE_CREATED`).

### Self-service update rules (§40)

Students may freely update: `headline`, `bio`, `program_id` (re-validated
exactly as at creation), `current_semester`, `admission_year`,
`expected_graduation_year`, `availability_status`, `profile_visibility`,
and — through their own dedicated endpoints — skills, interests,
research interests, languages, certifications, achievements, and goals.

Students may **not**, through any self-service endpoint: change
`university_id`, change `student_identifier` after creation, or change
`academic_status` outside the dedicated `PATCH .../status` endpoint. None
of these three appear in `updateProfileSchema`
(`student-profile.validator.js`) at all — they're not merely ignored,
they're absent from the schema, so `validate`'s `stripUnknown` removes
them from the request before the service layer ever sees them.

### University admin oversight (§41)

A `UNIVERSITY_ADMIN` may **view** student profiles at their own
university (both the admin roster, §14, and the individual admin-tier
profile via the discovery endpoint's bypass, §10). They may **not**:
modify a student's personal academic content, view or act on a different
university's students, move a student to another university, or
impersonate a student in any way. There is no endpoint through which an
admin can write to a student's profile in this chunk — administrative
access is read-only by construction, not merely by convention.

## 19. Admin student roster (§35)

`GET /api/universities/:universityId/students` — `SUPER_ADMIN` (any
university) or the scoped `UNIVERSITY_ADMIN` (their own university only,
enforced by reusing Chunk 04's `requireUniversityAccess` middleware
unchanged). Paginated, supports `search` (matches the student's name),
`program_id`, and `academic_status` filters.

The response (`serializeStudentSummary()`,
`admin-student.service.js`) is a lightweight summary — `id`, `user` (name
only), `program`, `headline`, `academic_status`, `availability_status` —
and deliberately **never** includes `student_identifier` (§12) or any
other private field, even though the admin viewing an *individual*
profile through the discovery endpoint's bypass does see the identifier.
This asymmetry is intentional: a single authorized lookup is a normal
administrative action, while minimizing what a *bulk* listing exposes is
a basic precaution against over-broad data exposure from one request.

## 20. API surface

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/students/me/profile` | `requireAuth` | owner tier |
| POST | `/api/students/me/profile` | `requireAuth` | full creation-transaction validation (§18) |
| PUT | `/api/students/me/profile` | `requireAuth` | excludes university_id/student_identifier/academic_status |
| PATCH | `/api/students/me/profile/status` | `requireAuth` | academic_status only; audited |
| GET | `/api/students/:id/profile` | `optionalAuth` | visibility-enforced (§10); 404 when denied |
| GET | `/api/skills` \| `/interests` \| `/research-areas` \| `/languages` | public | ACTIVE-only catalog reads |
| POST/PUT/DELETE | `/api/students/me/skills[/:skillId]` | `requireAuth` | own profile only |
| POST/DELETE | `/api/students/me/interests[/:interestId]` | `requireAuth` | own profile only |
| POST/DELETE | `/api/students/me/research-interests[/:id]` | `requireAuth` | own profile only |
| POST/PUT/DELETE | `/api/students/me/languages[/:id]` | `requireAuth` | own profile only |
| GET/POST/PUT/DELETE | `/api/students/me/certifications[/:id]` | `requireAuth` | own profile only |
| GET/POST/PUT/DELETE | `/api/students/me/achievements[/:id]` | `requireAuth` | own profile only |
| GET/POST/PUT/DELETE | `/api/students/me/goals[/:id]` | `requireAuth` | own profile only |
| GET | `/api/universities/:universityId/students` | `STUDENT_PROFILE_VIEW` + scoped | §19 |

Note the deliberate asymmetry with Chunk 04: skills/interests/research-
interests/languages have **no** separate "list mine" endpoint — they're
embedded directly in the profile GET response — while certifications/
achievements/goals **do** get a full list endpoint, since they're richer
standalone records a UI might reasonably want to page through
independently. This mirrors exactly what the brief's own numbered API
list (§27–§34) specifies, not an arbitrary inconsistency.

Self-service (`/me/...`) endpoints are gated by `requireAuth` alone —
**no RBAC permission** — because "is this the caller's own resource" is
resolved from the token, not a permission check; the same pattern
Chunk 04 used for `/api/users/me/universities`. Only the admin roster
endpoint (§19) is RBAC-gated, via the one new permission this chunk
introduces:

| Permission | Meaning | Granted to |
|---|---|---|
| `STUDENT_PROFILE_VIEW` | View student profiles at institutional-admin level | `SUPER_ADMIN`, `UNIVERSITY_ADMIN` |

**Response shape:** `{ success: true, data, pagination? }` /
`{ success: false, message }`, consistent with every prior chunk.

## 21. Security (see also `tests/student/security.test.js`)

- `student_identifier` is never in the public tier, the admin list, or
  any discovery response — verified directly (a raw string search of the
  response body for a planted identifier value, not just a missing-field
  assertion).
- Email and phone are never in the student-profile response shape at
  all — the profile's user snippet is built from `first_name`/
  `last_name`/`display_name` only, never by reusing `toPublicUser`/
  `toAuthenticatedUser`.
- `/me/...` endpoints always resolve "me" from the authenticated token —
  there is no way to target another user's profile by id through a
  self-service endpoint, because none of them accept one.
- Every visibility mode is independently tested, from every relevant
  viewer context, including the two institutional-oversight overrides
  (`SUPER_ADMIN` and the same-university `UNIVERSITY_ADMIN` both bypass
  a `PRIVATE` profile; a *different* university's `UNIVERSITY_ADMIN`
  does not).
- A `FACULTY` member cannot create a student profile — verified as a
  distinct test from "an unauthenticated request is rejected."
- Authorization is entirely server-side; the frontend's route guards
  (`StudentRoute`) and conditional rendering are UI convenience only,
  identical in spirit to Chunk 04's `Can`/`AdminRoute` — never treated as
  a security control.

## 22. Rate limiting

A dedicated, deliberately generous limiter
(`profileMutationRateLimiter`, `server/src/middleware/rateLimiter.js`,
configured via `PROFILE_RATE_LIMIT_WINDOW_MS`/`PROFILE_RATE_LIMIT_MAX`,
defaults 15 minutes / 120 requests) applies to every mutating
`/api/students/me/...` endpoint. It exists to blunt scripted abuse, not
to get in the way of a student editing several sections of their profile
in one sitting — separate configuration from the stricter
`authRateLimiter` (register/login/etc.), since profile editing is a very
different traffic shape from authentication. Disabled during automated
tests, same as `authRateLimiter`.

## 23. Audit logging

Recorded (via the shared `recordAuditLog()` service, inside the same
transaction as the change):

```
STUDENT_PROFILE_CREATED, STUDENT_PROFILE_STATUS_CHANGED
```

Institutional membership changes were already audited in Chunk 04
(`MEMBERSHIP_CREATED`, `MEMBERSHIP_STATUS_CHANGED`) and are unchanged
here. Per the brief's own instruction, this stays a focused addition —
no password, token, or free-text personal content (bio, certification
descriptions, etc.) is ever written into `audit_logs.metadata`.

## 24. Frontend

New routes, all nested under `StudentRoute`
(`client/src/routes/StudentRoute.jsx` — unauthenticated → `/login`;
authenticated without the `STUDENT` role → `/dashboard`) and shelled by
`StudentProfileLayout` (`client/src/layouts/StudentProfileLayout.jsx`, a
sidebar nested inside `MainLayout`, mirroring `AdminLayout`'s pattern):

```
/student/profile                → StudentProfilePage (read view + profile completeness)
/student/profile/edit           → StudentProfileEditPage (sectioned form, §18/§48)
/student/profile/skills         → StudentSkillsPage
/student/profile/interests      → StudentInterestsPage
/student/profile/research       → StudentResearchPage
/student/profile/certifications → StudentCertificationsPage
/student/profile/achievements   → StudentAchievementsPage
/student/profile/goals          → StudentGoalsPage
```

`MainLayout` shows a "My Profile" nav link only for users whose roles
include `STUDENT`. `StudentProfilePage` shows a create-profile form
(`CreateProfileForm.jsx`) when the caller has no profile yet, resolving
selectable universities from their own `ACTIVE` `STUDENT` memberships
(`GET /api/users/me/universities`, reused from Chunk 04) rather than
accepting a free-text university id.

A shared hook, `useMyProfile()` (`client/src/hooks/useMyProfile.js`),
fetches the caller's own profile once and is reused across every
`/student/profile/*` page (it distinguishes "still loading" from
"confirmed: no profile yet" so each page can render a clear
call-to-action) — pulled into one hook once the third page needed the
same fetch/loading/error dance, per this project's "no premature
abstraction" convention.

**§48 — sectioned editing, not one giant form.** `StudentProfileEditPage`
groups fields into Academic Information / About / Availability / Privacy
cards, plus a separately-submitted Academic Status card (since that's a
distinct, audited action, not part of the ordinary update). Skills,
interests, research interests, certifications, achievements, and goals
each get their own page rather than being crammed into the edit form.

**§49 — profile completeness UI.** `StudentProfilePage` renders the
`profile_completeness.score`/`missing` fields the backend already
computed (§15) as a progress bar and a "complete your profile" checklist
— it does not recompute the score.

**§50 — visibility UI.** `StudentProfileEditPage`'s Privacy section
presents all five visibility options with a one-line explanation each
(including that `CONNECTIONS_ONLY` is "reserved for a future release —
treated as Private for now," matching §8/§16's documented behavior) and
an explicit note that privacy settings never override institutional or
legal access.

**§51 — admin student roster UI.** `UniversityStudentsPage`
(`client/src/pages/admin/UniversityStudentsPage.jsx`), mounted at
`/university/students`, resolves the caller's own administered
university from their `ADMIN`-type membership (the same lookup
`AdminDashboardPage`'s University Admin view already uses), then lists
students with search/program/status filters and pagination — never
rendering `student_identifier` or any other private field. Reachable
from a "My Students" link in `AdminLayout`'s sidebar, shown only to
`UNIVERSITY_ADMIN` users (added alongside this chunk, since a page with
no navigation entry point isn't meaningfully shippable).

State approach: local component state and direct service calls
(`studentService.js`), not new Redux slices — consistent with every
other chunk's convention for state that doesn't need to be shared across
the app.
