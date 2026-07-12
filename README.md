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
web/        Next.js: dashboard
mobile/     Flutter: notifications and one-tap approval
infra/      Docker, CI, deploy
docs/       The handbook and decisions
```

## Running locally

```bash
docker compose up
```

Postgres, the API, and a worker come up. See the handbook for details.

## The golden rule

**The check finds the problem. The LLM explains it. The LLM never invents a number.**

Every dollar figure traces back to a database row. That is why we can safely let it pause a
real ad campaign.
