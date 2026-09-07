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
backend/    NestJS: connectors, check engine, scheduler, API
ai/         Python: explains findings, and profiles and cleans tabular data
web/        Next.js: the dashboard, the cleaning tool, the API docs
infra/      Docker, CI, deploy
docs/       The handbook and decisions
```

## New here?

Read [docs/HANDBOOK.md](docs/HANDBOOK.md) first: it explains the six stages, who
owns what, and the one rule that matters. Then run the thing below and press the
button. Fifteen minutes and you will understand the project better than any
description of it.

If you are picking up a task, it is in [docs/TODO.md](docs/TODO.md) or on the
Jira board. Handbook section 8: no ticket, no work.

## Running locally

```bash
cp .env.example .env          # ANTHROPIC_API_KEY may stay empty; see below
docker compose up --build
```

Docker is the only thing you need installed. See
[infra/README.md](infra/README.md) for the deployment runbook and what has to
change before this is exposed publicly.

That is the whole setup. Six services come up and nothing else is required:

| | Where | What |
|---|---|---|
| Dashboard | http://localhost:3001 | Findings at `/dashboard`, data cleaning at `/tool`, API reference at `/api-docs` |
| API | http://localhost:3000 | Findings, actions, `/health` |
| AI service | http://localhost:8000 | `/api/explain`, `/api/profile`, `/api/clean`, `/docs` |
| Worker | no port | The scheduler. Registers the sweep and runs every check for every merchant, unprompted |
| Postgres, Redis | 5432, 6379 | State, and the queue the scheduler runs on |

### Seeing a finding appear on its own

The worker sweeps hourly. To watch it happen rather than wait, seed the demo
fixture and run it on a one-minute cadence:

```bash
docker compose --profile seed run --rm seed
CHECK_SCHEDULE_CRON='*/1 * * * *' docker compose up -d worker
docker compose logs -f worker
```

No local Node needed: the seed runs in the image Docker has already built.

Within a minute the log says `ad_spend_on_oos: 1 finding(s)`, and the card is
on http://localhost:3001/dashboard. Nobody ran a check.

Press **Pause campaign** on the card. The campaign is paused through the ad
platform, and the card stays open: it turns green on the *next* sweep, when
the check re-observes the sources and sees the spend has actually stopped.
That second step is the point, and it is why the button does not colour the
card itself.

`npm run check:run -- <merchantId>` does the same work once, in the
foreground, which is the easier thing to attach a debugger to.

### If something is wrong

```bash
docker compose ps                  # five healthy; worker has no port to check
docker compose logs -f worker      # the scheduler talking
docker compose down -v             # wipe the database and start over
```

`down -v` deletes the volume, so re-run the seed afterwards. That is the fix
for almost anything odd in a development database.

**Without an `ANTHROPIC_API_KEY` everything above still works.** The AI
service boots, answers `/health`, and profiles and cleans data as normal;
findings are detected, priced and served. They simply have no prose. An
explanation is an enrichment, and nothing in the pipeline waits on it.

### Running the tests

Each service is tested on its own. All three need nothing but the containers
already running.

```bash
cd backend && cp .env.example .env && npm ci && npm test   # 76 tests, needs Postgres and Redis
cd ai      && pip install -r requirements.txt && python -m pytest   # 53 tests
cd web     && npm ci && npm test                            # 112 tests
```

## The golden rule

**The check finds the problem. The LLM explains it. The LLM never invents a number.**

Every dollar figure traces back to a database row. That is why we can safely let it pause a
real ad campaign.
