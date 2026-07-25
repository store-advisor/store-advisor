# Tech Stack

The specific libraries we use. Not just languages: the actual tools. Pick these, do not
re-litigate per service. If you want to change one, raise it, do not just use something else.

## Backend (NestJS, TypeScript)

| Concern | Choice | Notes |
|---|---|---|
| Framework | NestJS | |
| ORM + migrations | **Prisma** | Type-safe. Migrations via `prisma migrate`. |
| Check queries | **Raw SQL** via `prisma.$queryRaw` | The cross-source joins are too complex for an ORM. Drop to SQL here on purpose. |
| Queue | **BullMQ** (Redis-backed) | Not RabbitMQ. See note below. |
| Tests | Jest | Nest default. |
| Payload validation | Zod | Runtime-check every API input and every connector output. |

## AI service (Python)

| Concern | Choice | Notes |
|---|---|---|
| Framework | FastAPI | |
| LLM SDK | **Anthropic SDK (Claude)** | Strong at structured explanation. Matches DataJar's stack. |
| Tests | pytest | |

The AI service explains findings. It never computes a number. See the golden rule in the
handbook.

## Mobile (Flutter)

| Concern | Choice | Notes |
|---|---|---|
| Framework | Flutter | |
| State | **Riverpod** | Simpler than Bloc for a team. |
| HTTP | dio | |
| Push notifications | **Firebase Cloud Messaging** | The demo opens with a phone buzz. This is how. |

## Web (Next.js)

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | |
| Data fetching | React Query | |
| Styling | Tailwind | |

## Infra

| Concern | Choice | Notes |
|---|---|---|
| Containers | Docker | |
| CI | GitHub Actions | Runs on every PR. |
| Deploy | **GCP Cloud Run** | Cheapest container path. Sponsored by DataJar. |
| Local dev | `docker compose up` | Postgres + Redis. |

## Database

- **Postgres.** Everything relational. This whole project is joins across sources over time,
  which is exactly what Postgres is for.
- Not Mongo. A document store makes the core of the project harder for no benefit.

## Note on the queue

The kickoff meeting said RabbitMQ. This overrides that to **BullMQ**. Reason: for a Node team
building an MVP, RabbitMQ is a separate broker to run, learn, and deploy. We already run Redis
locally, and BullMQ rides on it with a fraction of the setup. Revisit RabbitMQ only if we
outgrow BullMQ, which will not happen this year.

## Why library-level decisions are written down

"Use NestJS" is not enough. If one person picks Prisma and another picks TypeORM, they collide
in week two. This file removes that ambiguity. When a ticket says "schema and migrations", it
means Prisma, because this file says so.
