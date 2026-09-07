# Infra

There is no deployment configuration here yet. `docker compose` is the only
orchestration the project has, and it is written for a laptop. What follows is
what someone deploying this needs to know before they do.

## Read this before deploying publicly

**The API has no real authentication.** `AuthStubGuard` checks that an
`Authorization` header is shaped like `Bearer <something>`, and accepts any
token that is. It does not verify the token, and it does not derive a merchant
from it: the merchant is a query parameter the caller chooses.

Verified against a running stack:

```
curl -H 'Authorization: Bearer x' '/findings?merchant_id=demo_merchant'   -> 200
curl '/findings?merchant_id=demo_merchant'                               -> 401
```

The approval endpoint is behind the same guard. On a public address that means
anyone can read any merchant's findings and pause any merchant's campaigns.
This is fine for a demo on a laptop and for the defence. It is not fine on the
open internet, and real auth plus merchant scoping derived from the token is
the work that has to land before a public deployment.

**The AI service allows every origin.** `allow_origins=["*"]` in
`ai/app/main.py`. Narrow it to the dashboard's origin when that origin is
known.

## Build arguments that are not runtime configuration

`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_AI_URL` are compiled into the browser
bundle when `web/Dockerfile` runs `npm run build`. Setting them in the
environment of a running container does nothing. They have to be passed at
build time, and they name addresses **the browser** can reach, so they are
public hostnames rather than container names:

```bash
docker compose build web \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
  --build-arg NEXT_PUBLIC_AI_URL=https://ai.example.com
```

## Everything else

| | |
|---|---|
| `ANTHROPIC_API_KEY` | Optional. Without it `/api/explain` answers 503 and findings are served with no prose. Nothing else changes |
| `DATABASE_URL` | Postgres. `migrate` applies migrations on start and exits |
| `REDIS_URL` | The BullMQ queue the scheduler runs on. Not a data store; losing it loses queued jobs, which the next sweep replaces |
| `CHECK_SCHEDULE_CRON` | Defaults to hourly on the hour. `*/1 * * * *` for a demo |
| `SCHEDULER_ENABLED` | Set `false` on additional workers so several consume one schedule |

Ports: web 3001, API 3000, AI 8000.

The target in the proposal is Cloud Run. Nothing here targets it yet.
