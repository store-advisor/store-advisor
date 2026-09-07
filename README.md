# Store Advisor

An agent that finds the money a merchant's store is leaking, and stops it.

It connects to a merchant's store and ad accounts, runs checks that join data **across** those
sources, finds problems no single dashboard can see, prices them in dollars, explains them in
plain language, and with the merchant's approval, fixes them.

Trusted Advisor, for e-commerce.

## The example

> The store says "Blue Hoodie" is out of stock.
> The ad account is still spending $40.50/day driving traffic to it.
> That traffic hits a dead page. Nobody can buy anything.
> **The merchant is burning $284/week and has no idea.**

Neither source knows this alone. You need both, joined on a timeline. That join is the
project.

## Read this first

**[docs/HANDBOOK.md](docs/HANDBOOK.md)** explains the architecture end to end, who owns what,
and the rules we follow. Read it before writing any code.

## Structure

```
backend/    NestJS: connectors, check engine, API
ai/         Python: the LLM layer that explains and prices findings
web/        Next.js: the dashboard, installable as a PWA, Web Push
infra/      Docker, CI, deploy
docs/       The handbook and decisions
```

## Running locally

```bash
cp .env.example .env          # ANTHROPIC_API_KEY may stay empty; see below
docker compose up --build
```

Postgres, Redis, the API (`:3000`), the AI service (`:8000`) and the worker come up. The worker
is the scheduler: it registers an hourly sweep and runs every check for every merchant without
anyone asking it to.

To watch that happen rather than wait an hour, seed the demo fixture and set a faster cadence:

```bash
cd backend && npm ci && npm run db:seed        # DATABASE_URL must point at localhost:5432
CHECK_SCHEDULE_CRON='*/1 * * * *' docker compose up -d worker
docker compose logs -f worker
```

Within a minute the log says `ad_spend_on_oos: 1 finding(s)`, and
`GET /findings?merchant_id=demo_merchant` serves it. Nobody ran a check.

`npm run check:run -- <merchantId>` does the same work once, in the foreground, which is the
easier thing to attach a debugger to.

**Without an `ANTHROPIC_API_KEY` everything above still works.** The AI service boots and
answers `/health`, findings are detected, priced and served — they simply have no prose. An
explanation is an enrichment, and nothing in the pipeline waits on it.

## The golden rule

**The check finds the problem. The LLM explains it. The LLM never invents a number.**

Every dollar figure traces back to a database row. That is why we can safely let it pause a
real ad campaign.
