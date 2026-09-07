# Infra and deployment

There is no deployment configuration in this directory yet. `docker compose` is
the only orchestration the project has, and it is written for a laptop. This
document is the runbook: what runs today, what has to change before this is
exposed publicly, and which standard each item comes from rather than from
somebody's preference.

## Standards this is measured against

| Reference | Used for |
|---|---|
| [The Twelve-Factor App](https://12factor.net) | Config in the environment (III), build/release/run separation (V), disposability (IX), dev/prod parity (X) |
| [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) | API1 broken object level authorization, API2 broken authentication, API8 security misconfiguration |
| [NIST SP 800-190](https://csrc.nist.gov/pubs/sp/800/190/final), *Application Container Security Guide* | Image, registry, orchestrator and runtime risks |
| [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker) | Non-root users, health checks, no unnecessary published ports |
| [Docker build best practices](https://docs.docker.com/build/building/best-practices/) | Layer ordering, multi-stage builds, `.dockerignore` |
| [SLSA](https://slsa.dev) | Build provenance and supply chain integrity |
| [Cloud Run container contract](https://cloud.google.com/run/docs/container-contract) | Listening on `$PORT` and `0.0.0.0`, SIGTERM handling, statelessness |

---

## Deploying a shared environment

[deploy.md](deploy.md) is the step-by-step: a 4 GB box, no published ports, and
Cloudflare Access in front, which is what makes a shared URL safe to stand up
before the authentication work below has landed.

## Running it today

Two commands, and no local toolchain beyond Docker:

```bash
cp .env.example .env
docker compose up --build

docker compose --profile seed run --rm seed     # the demo fixture
```

Six services: `web` on 3001, `api` on 3000, `ai` on 8000, `worker` with no
port, plus Postgres and Redis. `migrate` runs once and exits.

The worker sweeps hourly on the hour, so the first finding can be up to an hour
away. For a demo, set the cadence before starting:

```bash
CHECK_SCHEDULE_CRON='*/1 * * * *' docker compose up -d
```

## What is already right

- **Multi-stage builds** in all three Dockerfiles, each with a `.dockerignore`
  beside it, so `node_modules` and `.next` stay out of the build context.
- **Non-root at runtime** in all three images (CIS 4.1, NIST 800-190 4.5.2).
- **Health checks** on every long-running service. The worker is the one
  exception, deliberately: it has no port, so CI reads its log for
  `Check sweep scheduled` instead.
- **`restart: unless-stopped`** on everything long-running.
- **Graceful shutdown.** The API and the worker both call
  `enableShutdownHooks()`, so SIGTERM drains in-flight work and closes the
  Prisma pool rather than being killed at the end of the grace period
  (Twelve-Factor IX, and the Cloud Run container contract).
- **Config in the environment**, no secrets in the repository
  (Twelve-Factor III).
- **Migrations as a one-shot** that must exit successfully before the API or
  worker starts: the release stage kept separate from run (Twelve-Factor V).

---

## Before this is exposed publicly

### P0, which block a public deployment

**1. The API has no real authentication.** `AuthStubGuard` checks that the
`Authorization` header is shaped like `Bearer <something>` and accepts any
token that is. It does not verify the token, and it does not derive a merchant
from it: the merchant is a query parameter the caller picks. Verified against a
running stack:

```
curl -H 'Authorization: Bearer x' '/findings?merchant_id=demo_merchant'   -> 200
curl '/findings?merchant_id=demo_merchant'                               -> 401
```

The approval endpoint sits behind the same guard, so on a public address anyone
can read any merchant's findings and pause any merchant's campaigns. That is
OWASP API2 and API1 at once, and API1 has been the top entry in both editions
of that list. What has to land: a verified token, and a merchant identity read
*from* the token rather than from the query string.

**2. Default credentials, and datastore ports published.**
`docker-compose.yml` defaults Postgres to `storeadvisor:localdev` and publishes
5432 and 6379 to the host. Correct for a laptop, wrong anywhere else. A
production overlay removes both `ports:` blocks and takes the password from a
secret (CIS 5.7, NIST 800-190 4.4.2).

**3. `ANTHROPIC_API_KEY` lives in an env file.** It is the only real secret the
project has. On Cloud Run it belongs in Secret Manager, mounted as a secret
rather than set as a plain environment variable, so it stays out of
`gcloud run services describe` output and out of deployment logs.

**4. The AI service allows every origin.** `allow_origins=["*"]` in
`ai/app/main.py`. Narrow it to the dashboard's origin once that origin exists
(OWASP API8).

### P1, release engineering

**5. Pin base images by digest.** `node:26-alpine` and `python:3.12-slim` are
mutable tags: the same Dockerfile builds different images on different days,
which breaks dev/prod parity and makes a rollback ambiguous. Pin
`node:26-alpine@sha256:...` and let Dependabot move the digest, as it already
does for the other ecosystems here (NIST 800-190 4.1.3).

**6. Build images once, in CI, and deploy by digest.** Today CI builds the
images to prove they boot and then throws them away, so a deploy would rebuild
from source. That is one build per environment, and Twelve-Factor V exists
because those builds are not guaranteed to be identical. Publish to GHCR tagged
with the commit SHA, then promote that exact digest through environments.

**7. Scan the image, and attach provenance.** Trivy or `docker scout` in CI
against the built image, plus an SBOM and a build provenance attestation. SLSA
build level 2 is reachable with GitHub Actions OIDC signing and not much else.

**8. OCI labels.** `org.opencontainers.image.source`, `.revision` and
`.created` on each image, so a running container can be traced back to a
commit.

### P2, the one architectural problem

**`NEXT_PUBLIC_API_URL` is baked into the browser bundle at build time.** That
is not a flaw in the Dockerfile, it is how Next.js inlines `NEXT_PUBLIC_*`. The
consequence is that the web image is environment-specific: staging and
production need two different images built from one commit, which is precisely
the build/release/run violation item 6 sets out to fix. Two ways out, and the
choice should be deliberate rather than accidental:

- Serve the dashboard's configuration from the API at runtime, through a small
  `/config` endpoint the client fetches on load, so one image runs anywhere.
- Or accept per-environment builds, and put the environment in the image tag so
  the artifact at least says which environment it belongs to.

The first keeps a single promotable artifact. It costs one endpoint and one
fetch on page load.

---

## Cloud Run, the target named in the proposal

| Component | Shape | Notes |
|---|---|---|
| `api` | Cloud Run service | Already listens on `$PORT` and binds `0.0.0.0` |
| `web` | Cloud Run service | Settle P2 before building the image |
| `ai` | Cloud Run service | Anthropic key from Secret Manager |
| `worker` | Cloud Run service, `--min-instances=1` | **Not** a Cloud Run Job. It holds an open BullMQ consumer and registers a repeatable schedule; scaling it to zero stops the system speaking first, which is the property proposal section 5 claims |
| `migrate` | Cloud Run Job | A deploy step, gated before traffic shifts |
| Postgres | Cloud SQL | Private IP and the Cloud SQL connector, not a public address |
| Redis | Memorystore | Same VPC. It is a queue, not a store: losing it loses queued jobs, and the next sweep replaces them |

An alternative worth weighing for the worker: drop the in-process cron and let
**Cloud Scheduler** POST to an endpoint that enqueues the sweep. The worker
could then scale to zero between sweeps, and the schedule would live somewhere
it can be read and changed without a deploy. The trade is one more moving part,
and an endpoint that has to be authenticated, which is blocked on P0 item 1
either way.

## What is deliberately absent

No Kubernetes. This is four services and two managed datastores; Cloud Run
covers it, and the proposal's timeline has no room for a cluster nobody on the
team has operated.
