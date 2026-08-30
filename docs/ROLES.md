# Roles and Ownership

Each service has one owner. The owner is responsible for it working, being tested, and being
reviewed. Owning something does not mean working alone, it means the buck stops with you.

## Who owns what

| # | Person | Role | Owns | Stack |
|---|---|---|---|---|
| 1 | **Ahmed Faraj** | Tech lead + frontend + cloud | Architecture, integration, infra, CI/CD, cloud + deployment, the web dashboard | Docker, GitHub Actions, GCP Cloud Run, Next.js |
| 2 | **Ahmed Abdallah** | Backend | The check engine (the core service) | NestJS, BullMQ, raw SQL |
| 3 | **Ahmed Essam** | Backend | The ads connector and service observability | NestJS, Prisma |
| 4 | **Basem Essam** | Backend | The schema and the store connector (the data layer) | NestJS, Prisma, Postgres |
| 5 | **Khaled Ghoniem** | AI | The AI service: LLM explanation, ranking, the eval set. Never pricing | Python, FastAPI, Anthropic SDK |
| 6 | **Mohamed Haggag** | Backend | The API and the finding/action contract | NestJS, Zod |
| 7 | **Omar Ali Abdelrady** | UI/UX | Design system, the findings and dashboard screens, the demo flow | Figma |
| 8 | *To be assigned* | AI/ML | Second engineer on the analytics and ML track, alongside Khaled | Python, scikit-learn, Prophet |

**On the eighth seat.** The analytics and ML track opens in months 7 and 8, so this blocks
nothing before April 2027. Khaled leads that track and already owns the ranking model and the
eval set. If the seat is still empty in October, the work moves to people who need it anyway:
the KPI engine to Faraj, whose dashboard consumes it; the synthetic data generator to
Abdallah, whose check engine cannot be tested without it; forecasting stays with Khaled.

**There is no mobile role.** Mobile was dropped — delivery is one Next.js dashboard,
installable as a PWA, with Web Push. See HANDBOOK section 5.

## What each role means

**Tech lead + frontend + cloud (Faraj).** Owns the repo, CI, and the cloud: all deployment on
GCP Cloud Run, environments, and secrets. Keeps the services fitting together. Unblocks people.
Runs sprint planning. Makes the final call when a decision is stuck. Also builds the web
dashboard against the frozen contract and fixtures.

**Schema + store connector (Basem).** Owns the normalized schema, which everything else reads,
so it comes first. Builds the store connector and, with it, defines the connector interface
that every future source implements.

**Check engine (Abdallah).** The core. Runs checks over the normalized data on a schedule,
joins across sources, emits findings with evidence and a dollar figure. Owns the check
interface: every future check is a module against it. This is the most interesting systems
work in the project.

**AI service (Khaled).** Takes a finding's evidence and returns a plain-language explanation,
a confidence, and a severity. Never invents a number. Owns prompt quality and the eval set
that tells us when the LLM gets worse.

**API (Haggag).** Serves findings to the dashboard and accepts approvals. Owns the JSON
contract the client depends on, so freezing it early is his job.

**Ads connector + observability (Ahmed Essam).** Builds the ads connector against the interface
Basem defines, so he starts once the store connector exists. Also owns observability of our
own services: structured logs and health metrics. Not the merchant's business, our system.

**Design (Omar).** Not decoration. The doctors grade what they can see, so the demo is the
grade. Owns the findings list and detail screens, the shared design system, and the flow of
the final demo. His screens come before any UI work, so his ticket lands early in the sprint,
not late.

## The two interface rules

These are what let the project grow without rewrites:

1. **A new data source is a new connector, never a change to the check engine.**
2. **A new check is a new module, never a change to the engine core.**

If adding a source or a check forces a change to shared code, something is wrong with the
interface.

## Dependencies between people

- Everything waits on **Basem's schema.** It is first.
- **Basem's store connector defines the connector interface.** **Ahmed Essam's ads connector**
  is built against it, so the store connector comes first.
- **Abdallah's check engine** reads Basem's tables. It starts once the schema and one
  connector exist.
- **Khaled's AI service** reads a finding. He can start on hand-written findings before the
  engine is ready.
- **Faraj's dashboard** reads the API contract. Once **Haggag** freezes it with fixtures, the
  client work is never blocked on the backend.
- **Omar's** screens feed the dashboard. His designs come before any UI work.
