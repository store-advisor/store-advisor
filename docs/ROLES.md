# Roles and Ownership

Each service has one owner. The owner is responsible for it working, being tested, and being
reviewed. Owning something does not mean working alone, it means the buck stops with you.

## Who owns what

| Person | Role | Owns | Stack |
|---|---|---|---|
| **Faraj** | Tech lead + frontend | Architecture, integration, infra, CI/CD, the web dashboard | Docker, GitHub Actions, GCP, Next.js |
| **Bassem** | Backend | The schema and the store connector (the data layer) | NestJS, Prisma, Postgres |
| **Abdallah** | Backend | The check engine (the core service) | NestJS, BullMQ, raw SQL |
| **Khaled** | AI | The AI service: LLM explanation, pricing, ranking | Python, FastAPI, Anthropic SDK |
| **Haggag** | Backend | The API and the finding/action contract | NestJS, Zod |
| **Essam** | Backend | The ads connector and service observability | NestJS, Prisma |
| **Osama** | Mobile | The mobile app (notifications + one-tap approval) | Flutter, Riverpod, FCM |
| **Ahmed Osama** | UI/UX | Design system, the findings screens, the demo flow | Figma |

## What each role means

**Tech lead + frontend (Faraj).** Owns the repo, CI, and deploys. Keeps the services fitting
together. Unblocks people. Runs sprint planning. Makes the final call when a decision is stuck.
Also builds the web dashboard against the frozen contract and fixtures.

**Schema + store connector (Bassem).** Owns the normalized schema, which everything else reads,
so it comes first. Builds the store connector and, with it, defines the connector interface
that every future source implements.

**Check engine (Abdallah).** The core. Runs checks over the normalized data on a schedule,
joins across sources, emits findings with evidence and a dollar figure. Owns the check
interface: every future check is a module against it. This is the most interesting systems
work in the project.

**AI service (Khaled).** Takes a finding's evidence and returns a plain-language explanation,
a confidence, and a severity. Never invents a number. Owns prompt quality and the eval set
that tells us when the LLM gets worse.

**API (Haggag).** Serves findings to the clients and accepts approvals. Owns the JSON contract
that web and mobile depend on, so freezing it early is his job.

**Ads connector + observability (Essam).** Builds the ads connector against the interface
Bassem defines, so he starts once the store connector exists. Also owns observability of our
own services: structured logs and health metrics. Not the merchant's business, our system.

**Mobile (Osama).** The demo centerpiece. A notification arrives, the merchant taps Pause, the
campaign pauses. Builds against fixtures first.

**Design (Ahmed Osama).** Not decoration. The doctors grade what they can see, so the demo is
the grade. Owns the findings list and detail screens that both web and mobile consume, the
shared design system, and the flow of the final demo. His screens come before any UI work, so
his ticket lands early in the sprint, not late.

## The two interface rules

These are what let the project grow without rewrites:

1. **A new data source is a new connector, never a change to the check engine.**
2. **A new check is a new module, never a change to the engine core.**

If adding a source or a check forces a change to shared code, something is wrong with the
interface.

## Dependencies between people

- Everything waits on **Bassem's schema.** It is first.
- **Bassem's store connector defines the connector interface.** **Essam's ads connector** is
  built against it, so the store connector comes first.
- **Abdallah's check engine** reads Bassem's tables. It starts once the schema and one
  connector exist.
- **Khaled's AI service** reads a finding. He can start on hand-written findings before the
  engine is ready.
- **Osama (mobile) and Faraj (web)** read the API contract. Once **Haggag** freezes it with
  fixtures, they build in parallel and are never blocked.
- **Ahmed Osama's** screens feed Osama and Faraj. His designs come before their UI work.
