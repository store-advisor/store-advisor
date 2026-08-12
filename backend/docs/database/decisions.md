# Store Advisor — Backend Data Layer: Architecture Decisions

Running log of non-obvious schema decisions made while implementing
SCRUM-7, and the reasoning behind them. New entries append to the bottom.

---

## 1. Real `Merchant` table, not a free-floating `merchant_id` string

**Decision:** Add a `merchants` table; every `merchantId` elsewhere is a
real foreign key.

**Why:** Guarantees referential integrity at the database level — Postgres
rejects an insert with an invalid `merchantId` outright, rather than
trusting every write path (7+ tables, multiple future connectors) to get
it right independently. Also gives us one place to add merchant-level
config later (timezone, currency, notification prefs) without polluting
every child table.

**Alternative considered:** treat `merchant_id` as an unvalidated string
column on every table (matches the handbook's literal minimal wording).
Rejected — costs almost nothing to do properly now, expensive to retrofit
once 7 tables are populated with unvalidated values.

---

## 2. Campaign ↔ Product: join table, not the handbook's literal array field

**Decision:** `CampaignProduct` join table instead of `target_product_ids[]`
on Campaign.

**Why:** A join table gives referential integrity (Postgres can enforce
both FKs), is properly indexable, and leaves room for future per-pairing
metadata (e.g. bid amount, primary-target flag) that an array column has
no natural place for.

**⚠️ This is a deviation from the handbook's stated conceptual schema.**
Handbook section 31 explicitly requires team agreement before changing
this relationship. **Status: needs confirmation from Abdallah (Check
Engine, queries this relationship) and ideally Faraj before this is
considered final.**

---

## 3. Event table is generic and polymorphic, not per-event-type tables

**Decision:** Single `events` table with `entityType` + `entityId` +
`eventType` + JSON `payload`, rather than dedicated tables like
`stock_out_events`.

**Why:** This is what makes "new check = new module, never modify the
check engine" actually achievable (handbook Rule 2). A proliferation of
type-specific event tables would require schema changes for every new
check that needs new historical data.

**Trade-off accepted:** `entityId` cannot be a strict foreign key, since
`entityType` varies which table it points at. We lose DB-enforced
referential integrity on that one column in exchange for extensibility.

---

## 4. `Finding.estimatedCost` is a stored column, computed once

**Decision:** The check engine writes `estimatedCost` directly onto the
Finding row at creation time. No other service (API, AI, mobile) may
compute or restate this value.

**Why:** This is the Golden Rule (handbook section 4) made physical. If
cost isn't a single stored value, some downstream service will eventually
be tempted to recompute it — creating two sources of truth for a number
the merchant is being asked to trust and act on.

---

## 5. `actions.idempotencyKey` is a database-enforced UNIQUE constraint

**Decision:** Unique constraint at the schema level, not an
application-level "check before insert."

**Why:** Actions trigger real external side effects (e.g. pausing a live
paid ad campaign). Retries happen for mundane reasons — network flakiness,
double-taps. A DB constraint is airtight regardless of what any calling
code does or forgets to do; an application-level check has a race
condition a DB constraint doesn't.

---

## 6. `merchantId` is duplicated onto `AdSpend`, `Order`, and `Action`

even though it's derivable via a join

**Decision:** Every table gets `merchantId` directly, even where it's
technically reachable through a parent relation (e.g. `AdSpend` via
`Campaign`, `Action` via `Finding`).

**Why:** Matches the explicit acceptance criteria ("merchant_id on every
table"). Also keeps every query and every future safety/authorization
check simple and independent of a join always being correct — a query
filtering `WHERE merchantId = ?` doesn't have to trust that a foreign
table's join chain is intact.

---

## 7. IDs are `cuid()`, not auto-increment integers

**Decision:** All primary keys use Prisma's `cuid()` default rather than
`autoincrement()` integers.

**Why:** Multi-tenant, multi-connector systems often need to generate IDs
before a row is inserted (e.g. constructing idempotency keys, or
client-side ID generation in future distributed scenarios). CUIDs are
collision-resistant without a database round-trip. Auto-increment integers
are simpler but expensive to migrate away from later if a distributed
scenario ever arises — cuid costs nothing extra now.

---

## 8. Database column names are snake_case via Prisma `@map`, not camelCase

**Decision:** TypeScript/Prisma layer uses camelCase (`merchantId`); actual
Postgres columns use snake_case (`merchant_id`) via `@map`/`@@map`.

**Why:** Abdallah's Check Engine explicitly uses raw SQL through Prisma
(handbook section 23). Unquoted camelCase identifiers get silently
lowercased by Postgres, forcing every raw-SQL query to use quoted
identifiers (`"merchantId"`) — a persistent, easy-to-forget footgun. Fixing
this once at the schema level avoids it entirely for every future raw
query.

---

## 9. Timestamp columns fixed to `Timestamptz`, not plain `Timestamp`

**Decision:** every `DateTime` field explicitly annotated with `@db.Timestamptz(3)`
(except `AdSpend.date`, which stays `@db.Date` — daily granularity, not an instant).

**Why:** the initial migration generated plain `timestamp(3) without time zone`
columns — Prisma's default mapping, not what we intended. This silently
reintroduces the exact timezone ambiguity handbook section 39 requires the
canonical layer to eliminate: a naive timestamp doesn't say whether it's
UTC, server-local, or client-local. Caught before any real data existed,
fixed via a second forward migration (`fix_timestamps_to_timestamptz`)
rather than hand-editing the database — this also served as our concrete
proof that "rollback works" (SCRUM-7 acceptance criteria) means fixing
forward with a new reviewed migration, not rewinding in place.

---

## 10. Migrations run via a dedicated one-shot `migrate` service, not baked into `api`

**Decision:** `docker-compose.yml` includes a `migrate` service
(`prisma migrate deploy`, run via `docker compose run --rm migrate`)
rather than embedding migration logic directly in the (still
not-yet-built) `api` service's startup command.

**Why:** the `api` service doesn't exist yet — Haggag hasn't built it.
A standalone `migrate` service lets this ticket's acceptance criterion
("docker compose runs migrations automatically") be satisfied and
verified today, independent of API work landing.

**Open follow-up, flagged to Faraj/Haggag:** once `api` is real, it
should depend on `migrate: condition: service_completed_successfully`
(already wired into the commented-out `api`/`worker` blocks) rather than
running migrations twice or independently. Whether `migrate` stays a
permanent separate service or gets folded into `api`'s own startup
sequence long-term is an open question for whoever builds `api`.

---

## 11. Dockerfile is multi-stage (deps / build / runtime)

**Decision:** `backend/Dockerfile` uses three stages rather than one flat
`COPY . .` + `RUN npm ci` image.

**Why:**
- `deps` isolates dependency installation so Docker's layer cache only
  invalidates when `package.json`/`package-lock.json` actually change,
  not on every source edit.
- `build` has devDependencies (Prisma CLI, TypeScript, Nest CLI) — this
  is the stage the `migrate` service targets specifically
  (`target: build`), since `prisma migrate deploy` needs the Prisma CLI,
  which the lean runtime image deliberately excludes.
- `runtime` reinstalls production-only dependencies fresh, copies over
  only compiled output and the generated Prisma client, and runs as the
  non-root `node` user rather than root — standard container hardening,
  not optional once this image is anything other than a throwaway.

A `.dockerignore` (`node_modules`, `dist`, `.env`, `.git`, `docs`) was
added alongside this — without it, `COPY . .` would pull the host's
Windows-built `node_modules` into a Linux Alpine container, which
would not work correctly.

---

## 12. Two separate `.env.example` files (root and `backend/`), not one

**Decision:** `.env.example` exists both at the repo root and inside
`backend/`, with different `DATABASE_URL` hostnames.

**Why:** they serve genuinely different execution contexts.
`backend/.env.example` uses `localhost` — for running NestJS/Prisma
directly on a developer's machine (`npm run start:dev`) against the
Dockerized Postgres via its exposed port. The root `.env.example` uses
`postgres` — the Docker Compose service name — for containers (like
`migrate`) running *inside* the Compose network, where `localhost`
would incorrectly refer to the container itself, not the Postgres
container.

---

## 13. Package manager confirmed as npm — CI workflow corrected accordingly

**Decision:** `backend`'s CI job in `.github/workflows/ci.yml` uses
`npm ci` / `package-lock.json`, matching the handbook and the backend's
actual committed lockfile.

**Why this needed fixing:** the CI workflow, as originally scaffolded,
assumed pnpm project-wide (`pnpm/action-setup`, `pnpm-lock.yaml` cache
path) — but the handbook specifies npm, and `backend/` has always had a
`package-lock.json`, not a pnpm lockfile. Running the original workflow
as committed would have failed immediately on `npm ci`'s missing
lockfile equivalent. Confirmed with Faraj: npm is correct.

**Note:** the `web` job in the same workflow still references pnpm as of
this writing — out of scope for this ticket (owned by web, not backend),
but flagged to Faraj since the same inconsistency likely applies there.