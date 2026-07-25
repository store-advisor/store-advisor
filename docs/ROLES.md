# Roles and Ownership

Each service has one owner. The owner is responsible for it working, being tested, and being
reviewed. Owning something does not mean working alone, it means the buck stops with you.

## Who owns what

| Person | Role | Owns | Stack |
|---|---|---|---|
| **Faraj** | Tech lead | Architecture, integration, infra, CI/CD | Docker, GitHub Actions, GCP |
| **Bassem** | Backend | Connectors, the data layer, the schema | NestJS, Prisma, Postgres |
| **Abdallah** | Backend | The check engine (the core service) | NestJS, BullMQ, raw SQL |
| **Khaled** | AI | The AI service: LLM explanation, pricing, ranking | Python, FastAPI, Anthropic SDK |
| **Haggag** | Backend | The API and the finding/action contract | NestJS, Zod |
| **Essam** | Full stack | The web dashboard | Next.js, React Query |
| **Osama** | Mobile | The mobile app (notifications + one-tap approval) | Flutter, Riverpod, FCM |
| **Ahmed Osama** | UI/UX | Design system, the findings screens, the demo flow | Figma |

## What each role means

**Tech lead (Faraj).** Owns the repo, CI, and deploys. Keeps the services fitting together.
Unblocks people. Runs sprint planning. Makes the final call when a decision is stuck.

**Connectors + data (Bassem).** Pulls data from each source into one normalized schema. Owns
the connector interface: every future source implements it. The schema he builds is what
everything else reads, so it comes first.

**Check engine (Abdallah).** The core. Runs checks over the normalized data on a schedule,
joins across sources, emits findings with evidence and a dollar figure. Owns the check
interface: every future check is a module against it. This is the most interesting systems
work in the project.

**AI service (Khaled).** Takes a finding's evidence and returns a plain-language explanation,
a confidence, and a severity. Never invents a number. Owns prompt quality and the eval set
that tells us when the LLM gets worse.

**API (Haggag).** Serves findings to the clients and accepts approvals. Owns the JSON contract
that web and mobile depend on, so freezing it early is his job.

**Web dashboard (Essam).** Where a merchant reviews findings and, later, the savings ledger.
Builds against the frozen contract and fixtures, so he is never blocked on the backend.

**Mobile (Osama).** The demo centerpiece. A notification arrives, the merchant taps Pause, the
campaign pauses. Builds against fixtures first.

**Design (Ahmed Osama).** Not decoration. The doctors grade what they can see, so the demo is
the grade. Owns the findings list and detail screens that both web and mobile consume, and the
flow of the final demo.

## The two interface rules

These are what let the project grow without rewrites:

1. **A new data source is a new connector, never a change to the check engine.**
2. **A new check is a new module, never a change to the engine core.**

If adding a source or a check forces a change to shared code, something is wrong with the
interface.

## Dependencies between people

- Everything waits on **Bassem's schema.** It is first.
- **Abdallah's check engine** reads Bassem's tables. It starts once the schema and one
  connector exist.
- **Khaled's AI service** reads a finding. He can start on hand-written findings before the
  engine is ready.
- **Osama and Essam** read the API contract. Once **Haggag** freezes it with fixtures, they
  build in parallel and are never blocked.
- **Ahmed Osama's** screens feed Osama and Essam. His designs come before their UI work.
