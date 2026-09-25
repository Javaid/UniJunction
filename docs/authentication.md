# Authentication & Authorization (Chunk 03)

This document covers the authentication and RBAC foundation built in
Chunk 03: registration, email verification, login, JWT access tokens,
revocable refresh tokens, logout, role-based access control, and the
initial permission system. Read it alongside
[`architecture.md`](./architecture.md) (system-level placement) and
[`database-guidelines.md`](./database-guidelines.md) (the underlying
schema).

## 1. Architecture

```
React → Axios (apiClient) → Express
                               → requireAuth (authentication middleware)
                               → requireRole / requirePermission (authorization middleware)
                               → auth.service / admin.service
                               → Sequelize models
                               → MySQL
```

Authentication is **stateless at the API layer**: every request carries
its own short-lived JWT access token, verified by signature alone — no
server-side session store. Longer-lived sessions are supported through a
separate, **revocable** refresh token, backed by a database row (not a
JWT), so a compromised or logged-out session can actually be shut off.

Backend code lives in `server/src/modules/auth/` (registration, login,
tokens, verification, the `requireAuth`/RBAC middleware) and
`server/src/modules/admin/` (the user-listing and role-assignment
endpoints), following the existing modular-monolith convention — see
[`development-guidelines.md`](./development-guidelines.md).

## 2. Registration Flow

`POST /api/auth/register` → `{ email, password, first_name, last_name }`

1. Email is normalized (trimmed, lower-cased) before any lookup or
   storage — `User@Example.COM` and `user@example.com` are the same
   account.
2. An application-level duplicate check runs first (fast, friendly 409);
   the database's unique constraint on `users.email` is the backstop for
   the race condition where two requests for the same email land at once
   — that path also produces the same 409, not a 500.
3. Inside a single database transaction: create the `User` (status
   `PENDING`), assign the fixed `STUDENT` role (the *only* role
   self-registration can ever grant — the client cannot request
   `SUPER_ADMIN`, `UNIVERSITY_ADMIN`, `FACULTY`, or `RESEARCHER`; any
   `role` field in the request body is ignored), and create an email
   verification token. If any step fails, the whole transaction rolls
   back — there is no path to a user row that exists without its role or
   its verification token.
4. After the transaction commits, the verification email is "sent" (see
   §3) — deliberately outside the transaction, since sending an email
   should never hold a database transaction open.

Password policy (Joi, `auth.validator.js`): minimum 8 characters, at
least one letter and one digit, maximum 72 (bcrypt ignores bytes beyond
72, so longer inputs are rejected rather than silently truncated).
Deliberately not more complex than that per the chunk brief's "do not
make the password policy unnecessarily complicated."

## 3. Email Verification

- `email_verification_tokens` stores only a SHA-256 hash of the token —
  see [`database-guidelines.md`](./database-guidelines.md#token-hashing-sha-256-not-bcrypt)
  for why SHA-256, not bcrypt, is the correct choice here.
- **No real email provider is wired up.** `auth/email.provider.js` is a
  single, narrow seam (`sendVerificationEmail(user, rawToken)`) — right
  now it logs the token server-side; swapping in SES/SendGrid/Postmark
  later means changing only that one file.
- `POST /api/auth/verify-email` → `{ token }`. Looks up the hash, checks
  it is unused and unexpired, marks it used, sets
  `users.email_verified_at`, and promotes `PENDING` → `ACTIVE`. **Every
  failure mode (unknown token, expired, already used) returns the same
  generic response** — the API never reveals which case occurred, per
  the "do not reveal whether arbitrary tokens exist" requirement.
- `POST /api/auth/resend-verification` → `{ email }`. Always returns the
  same generic message regardless of whether the email exists, is
  already verified, or is mid-cooldown — this is what prevents it from
  becoming an account-enumeration oracle. A cooldown
  (`EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS`, default 60s) silently
  no-ops repeat requests; when a new token is actually issued, any
  previous outstanding one is invalidated first, so at most one
  verification link is ever valid for a user at a time.

## 4. Login

`POST /api/auth/login` → `{ email, password }`

- **No account enumeration:** "unknown email" and "wrong password" both
  produce the exact same `401 { message: "Invalid email or password." }`
  — indistinguishable by design.
- **User status policy** (checked only *after* the password has already
  verified correct — see §7):
  - `ACTIVE` → login succeeds.
  - `PENDING` → login **succeeds**. An unverified user must still be
    able to authenticate — otherwise they could never reach an
    authenticated "resend verification" flow or see their own pending
    state. Full email-verification gating of *specific actions* (not
    login itself) is left to whichever future chunk introduces actions
    that actually require a verified email.
  - `SUSPENDED` / `DEACTIVATED` → login fails with a distinct `403` and
    an honest message ("Your account has been suspended/deactivated.").
    This is deliberately different from the anti-enumeration case: by
    the time status is checked, the caller has already proven they know
    the correct password, so telling *them* their own account's state is
    not an enumeration leak — it's necessary, honest UX.
- On success: `last_login_at` is updated (only now, never on a failed
  attempt), and the response includes an access token, a refresh token,
  and a user/roles summary — never `password_hash` or any other internal
  field (enforced by the shared serializer, §10).

## 5. JWT Access Tokens

Signed with `JWT_ACCESS_SECRET` (HS256, via `jsonwebtoken`), default
lifetime `JWT_ACCESS_EXPIRES_IN=15m` (configurable). Claims are
deliberately minimal:

```json
{ "sub": "<user's public uuid>", "jti": "<random id>", "type": "access", "iat": ..., "exp": ... }
```

- `sub` is the user's `uuid`, never the internal auto-increment `id` —
  consistent with this project's general primary-key strategy (see
  `database-guidelines.md`, "Primary key strategy").
- `type: "access"` stops an access token from ever being usable where a
  refresh token is expected, or vice versa (refresh tokens aren't JWTs
  at all — see §6).
- No email, name, roles, or permissions are embedded — a suspended user's
  still-valid-looking token is caught by `requireAuth` re-checking status
  on every request (§7), not by trusting stale claims.
- The server refuses to start with `JWT_ACCESS_SECRET` unset (outside
  tests) — see `server/src/server.js` — rather than silently signing
  tokens with an empty secret.

## 6. Refresh Tokens

Refresh tokens are **not JWTs**. Each is a 256-bit random value
(`crypto.randomBytes(32)`, hex-encoded); only its SHA-256 hash is ever
stored, in `refresh_tokens`. Default lifetime `JWT_REFRESH_EXPIRES_IN=30d`.

- `POST /api/auth/refresh` → `{ refresh_token }`. Validates existence,
  expiry, and revocation status, and re-checks the owning user's status
  (a `SUSPENDED`/`DEACTIVATED` user's refresh token is also revoked on
  the spot). On success, issues a new access token **and rotates the
  refresh token**: the presented token is revoked and a new one issued.
  Reusing an already-rotated (or otherwise invalid) refresh token fails
  with `401` — this bounds the damage of a stolen-then-reused refresh
  token to a single use before it stops working for everyone, including
  the legitimate owner (who then needs to log in again — an accepted
  tradeoff for detecting reuse).
- `POST /api/auth/logout` → `{ refresh_token }`. Revokes it if found;
  responds the same way either way (already revoked, unknown, expired —
  there's nothing useful in distinguishing those to the caller). This
  endpoint does **not** require a valid access token — a client with an
  expired access token but a still-valid refresh token must still be able
  to log out. Stateless JWT access tokens already issued are **not**
  invalidated by logout; they simply expire on their own short schedule.
  This is the explicit tradeoff of "short-lived access token + revocable
  refresh token" instead of a fully stateful session.

## 7. User Status Policy

| Status        | Login | Already-issued access token (via `requireAuth`) |
|---------------|-------|---------------------------------------------------|
| `ACTIVE`      | ✅ allowed | ✅ allowed |
| `PENDING`     | ✅ allowed | ✅ allowed |
| `SUSPENDED`   | ❌ 403 (after password check) | ❌ 401 |
| `DEACTIVATED` | ❌ 403 (after password check) | ❌ 401 |

`requireAuth` re-resolves the user and re-checks status **on every
request**, not just at login/token-issue time — an admin suspending a
user mid-session takes effect on that user's very next request, even
though their existing access token is still cryptographically valid
until it expires. This is the practical reason access tokens are kept
short-lived (§5): it bounds how long a just-suspended user can keep
acting on a stale token.

## 8. Authentication Middleware (`requireAuth`)

`server/src/modules/auth/auth.middleware.js`. For every protected route:

1. Reads `Authorization: Bearer <token>`.
2. Verifies the JWT signature and `type: "access"` claim.
3. Resolves the user by `uuid` (the JWT's `sub`), eager-loading roles and
   their permissions.
4. Checks status is `ACTIVE` or `PENDING` (§7).
5. Attaches `req.user = { id, internalId, email, status, roles: string[],
   permissions: string[] }`.

**Every failure mode collapses to the same `401 { message: "Authentication
required." }`** — missing header, malformed header, invalid signature,
expired token, unknown user, inactive user. The response never reveals
which of these happened, and never echoes back anything from the
underlying `jsonwebtoken` error (no "jwt malformed", no hint about the
secret or algorithm).

## 9. RBAC — Roles and Permissions

**Roles** (`roles`) are broad identities: `SUPER_ADMIN`,
`UNIVERSITY_ADMIN`, `FACULTY`, `RESEARCHER`, `STUDENT`. A user can hold
several at once (`user_roles`, many-to-many) — e.g. a faculty member who
is also a university admin.

**Permissions** (`permissions`) are individual actions, mapped to roles
through `role_permissions` (many-to-many). The initial, deliberately
small set:

| Permission | Meaning |
|---|---|
| `USER_VIEW` | View user records |
| `USER_UPDATE` | Update user records |
| `UNIVERSITY_VIEW` | View university records |
| `UNIVERSITY_CREATE` | Create university records |
| `UNIVERSITY_UPDATE` | Update university records |
| `ROLE_VIEW` | View role assignments |
| `ROLE_ASSIGN` | Assign or remove a user's roles |
| `SYSTEM_ADMIN` | Full system administration |

Initial role → permission mapping (`database/seed_rbac.sql`, mirrored in
`server/tests/helpers/testDb.js` for tests):

| Role | Permissions |
|---|---|
| `SUPER_ADMIN` | `SYSTEM_ADMIN`, `USER_VIEW`, `USER_UPDATE`, `UNIVERSITY_VIEW`, `UNIVERSITY_CREATE`, `UNIVERSITY_UPDATE`, `ROLE_VIEW`, `ROLE_ASSIGN` |
| `UNIVERSITY_ADMIN` | `USER_VIEW`, `UNIVERSITY_VIEW`, `UNIVERSITY_UPDATE` |
| `STUDENT` | `USER_VIEW` |
| `FACULTY` | `USER_VIEW` |
| `RESEARCHER` | `USER_VIEW` |

This mapping is centralized in one place (the seed script + the models'
associations) — no controller hard-codes "if role is X, allow Y."

### Authorization middleware

`server/src/modules/auth/rbac.middleware.js`, used after `requireAuth`:

```js
router.get('/users', requireAuth, requirePermission('USER_VIEW'), controller.listUsers);
router.get('/reports', requireAuth, requireAnyPermission(['SYSTEM_ADMIN', 'REPORT_VIEW']), controller.reports);
router.post('/x', requireAuth, requireRole('SUPER_ADMIN'), controller.x);
```

`401` (no/invalid authentication) and `403` (authenticated, but missing
the required role/permission) are kept strictly distinct throughout.

### University-scoped authorization (future)

Not implemented in this chunk. The role/permission check above is
**global** — a `UNIVERSITY_ADMIN` with `UNIVERSITY_UPDATE` can act on
*any* university, not just their own, because there is currently no
`user ↔ university` relationship to scope against (that lands with the
University Management chunk, once `university_id` is attached to a
user's profile). The intended future shape:

```
Platform Admin (SUPER_ADMIN)  → all universities
University Admin              → own university only
Faculty                       → own academic context
Student                       → own profile + permitted public network
```

This is intentionally not faked with a half-working scoping check before
the underlying relationships exist.

## 10. Safe User Serialization

`server/src/utils/userSerializer.js` (`toPublicUser`) is the single place
a `User` model instance becomes API JSON. Every endpoint that returns
user data (`/auth/register`, `/auth/login`, `/auth/me`,
`/api/admin/users`) goes through it:

```json
{ "id": "<uuid>", "email": "...", "first_name": "...", "last_name": "...",
  "display_name": null, "status": "ACTIVE", "roles": ["STUDENT"] }
```

Never included: `password_hash`, refresh/verification token data, or the
internal auto-increment `id`. `User`'s Sequelize `defaultScope` already
excludes `passwordHash` at the query layer (see
`database-guidelines.md`), so this is defense in depth, not the only
safeguard.

**Deviation from the brief's `/auth/me` example, noted explicitly:** the
brief's illustrative response for `/auth/me` shows the user object
unwrapped at the top level. This implementation instead returns
`{ success: true, user: {...} }`, consistent with every other endpoint in
this API (including `/api/health` from Chunk 01/02). One consistent
envelope across the whole API was judged more valuable than matching one
example literally.

## 11. Role Assignment (Admin)

- `POST /api/admin/users/:userId/roles` → `{ role: "FACULTY" }`.
  Requires `requireAuth` + `ROLE_ASSIGN`. Validates the role exists
  (404 if not), rejects a duplicate assignment (409), and returns the
  user's updated role list. `:userId` is the public `uuid`, never the
  internal id.
- `DELETE /api/admin/users/:userId/roles/:role`. Same permission.
  Refuses to remove a user's **only** remaining role (409) — the
  intent being that a role-less account has no basis for any
  authorization decision elsewhere in the platform.
- The client can never pick its own role at registration (§2); this
  endpoint, gated by `ROLE_ASSIGN`, is the only way roles change after
  that.

### Known limitation — `GET /api/admin/users` and `USER_VIEW`

The chunk brief specifies both "grant `USER_VIEW` to `STUDENT`/`FACULTY`/
`RESEARCHER`" (§21) *and* "gate the admin user-listing endpoint on
`USER_VIEW`, and do not expose it to normal students" (§27). Taken
literally and together, those two instructions conflict: any
authenticated user (including a plain `STUDENT`) ends up able to call
`GET /api/admin/users` today, because they hold `USER_VIEW`.

This implementation follows the explicit, itemized role/permission table
in §21 exactly rather than silently narrowing it, and gates the listing
endpoint on `USER_VIEW` exactly as §27 states — and flags the resulting
gap here rather than hiding it. The likely long-term fix is splitting
`USER_VIEW` into two permissions once there's a concrete reason to: a
narrow one for "view a user's own/public profile" (future, non-admin
endpoint) and a separate one for "list all users platform-wide." This
chunk does not invent that second permission on its own initiative,
since the brief's initial permission set (§20) does not include it.

### Bootstrapping the first `SUPER_ADMIN`

No user starts with `ROLE_ASSIGN`, so the very first `SUPER_ADMIN` cannot
be created through the API (nothing yet holds the permission to grant
it). This is a standard, expected bootstrap step: assign it directly in
the database once, e.g.:

```sql
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'the-first-admin@example.com' AND r.name = 'SUPER_ADMIN';
```

After that, the `SUPER_ADMIN` account can grant `ROLE_ASSIGN`-gated roles
to anyone else through the normal API.

## 12. Rate Limiting

`server/src/middleware/rateLimiter.js` applies a shared limiter
(`express-rate-limit`) to `POST /api/auth/register`,
`POST /api/auth/login`, `POST /api/auth/resend-verification`, and
`POST /api/auth/refresh` — the four endpoints most attractive to
brute-force/enumeration/spam abuse. Configurable via
`AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX` (defaults: 15 minutes
/ 20 requests). Disabled automatically when `NODE_ENV=test`, since the
test suite intentionally makes many rapid requests that have nothing to
do with rate-limiting behavior.

## 13. Token Storage (Frontend)

- **Access token:** kept in Redux state only (`authSlice.accessToken`) —
  memory, never `localStorage`/`sessionStorage`.
- **Refresh token:** kept in a small in-memory module
  (`client/src/services/tokenStore.js`), **not** in Redux — per the
  chunk brief, "do not put refresh tokens into Redux state if the chosen
  storage strategy does not require it."
- **Neither survives a full page reload.** This is an accepted,
  documented limitation of this chunk: a reload currently requires
  logging in again. The chunk brief's endpoint contracts
  (`POST /api/auth/login` / `refresh` returning `refresh_token` in the
  JSON body, not a cookie) are what's implemented; the brief's general
  cookie guidance ("if using cookies, use HttpOnly, Secure, SameSite")
  applies if a future chunk moves the refresh token to an HttpOnly
  cookie set by the server, which would let a reload survive without
  ever exposing the token to JavaScript. Given the explicit JSON
  request/response shapes in this chunk's brief, that migration is left
  for later rather than mixing both transports in one chunk.
- Either way, `localStorage`/`sessionStorage` are never used for tokens —
  the one thing the brief rules out unconditionally.

## 14. Axios Client

`client/src/services/apiClient.js` is the single Axios instance for the
whole app (unchanged from Chunk 01 in that respect). It:

- Attaches `Authorization: Bearer <accessToken>` to every request via a
  request interceptor.
- On a `401` from any non-auth endpoint, attempts exactly one silent
  refresh (`POST /auth/refresh`) and retries the original request once;
  a `_retry` flag prevents ever retrying the same request twice, and
  concurrent 401s share a single in-flight refresh call rather than each
  triggering their own (which would rotate the refresh token multiple
  times and invalidate one another).
- Clears authentication state if the refresh attempt itself fails.

It deliberately does **not** `import { store }` directly — see the
comment in `apiClient.js`. Doing so would close an import cycle
(`apiClient → store → authSlice → authService → apiClient`) that, in
testing, produced Redux Toolkit's "No reducer provided for key 'auth'"
warning (an undefined reducer at `configureStore` time, depending on
which module happened to evaluate first). Instead, `apiClient.js`
exposes `setAuthHandlers({ getAccessToken, onTokenRefreshed,
onAuthFailure })`, and `store/index.js` wires these to real Redux
state/dispatch once the store exists — dependency injection instead of a
static circular import.

## 15. API Behavior Summary — 401 vs 403

- **401 Unauthorized:** no `Authorization` header, malformed header,
  invalid/expired/wrong-secret JWT, unknown user, or a user whose status
  is `SUSPENDED`/`DEACTIVATED` on a protected route. Also used for a
  rejected login (generic "Invalid email or password.") and a rejected
  refresh (generic "Invalid or expired refresh token.").
- **403 Forbidden:** the caller is authenticated, but lacks the required
  role/permission (`requireRole`/`requirePermission`), or a login attempt
  whose password was correct but whose account is `SUSPENDED`/
  `DEACTIVATED` (§4 — a deliberate exception to the 401-for-login
  default, since the password has already proven identity at that
  point).

## 16. Security Model Summary

- Passwords: `bcryptjs`, cost configurable via `BCRYPT_SALT_ROUNDS`
  (default 12); never logged, never returned, excluded from `User`'s
  default Sequelize scope.
- Refresh/verification tokens: SHA-256 hash only, ever stored; excluded
  from their models' default scopes as defense-in-depth even though no
  endpoint ever returns one.
- No account enumeration on login, resend-verification, or verify-email
  (§2–4, §15).
- JWT errors never leak the signing secret, algorithm, or library
  internals to the client.
- All queries are parameterized through Sequelize — no raw
  string-concatenated SQL anywhere in the auth module.
- Rate limiting on the four most abuse-prone auth endpoints (§12).
- Helmet, CORS, and body-size limits from Chunks 01–02 are unchanged and
  still in effect (`server/src/app.js`).

## 17. Environment Variables (New in Chunk 03)

See the root `.env.example` for the full, current list. Added this
chunk: `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`,
`JWT_REFRESH_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`,
`EMAIL_VERIFICATION_EXPIRES_IN_HOURS`,
`EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS`, `AUTH_RATE_LIMIT_WINDOW_MS`,
`AUTH_RATE_LIMIT_MAX`. The Chunk 01 placeholders `JWT_SECRET`/
`JWT_EXPIRES_IN` are removed (they were never used by any code) in favor
of the more precise `JWT_ACCESS_*` names now that access vs. refresh
tokens are distinct concepts.
