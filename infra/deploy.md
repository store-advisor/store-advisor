# Deploying a shared environment

This puts the stack on a machine the team and the supervisor can reach, rather
than on one laptop. It is a development deployment, not production: see the P0
list in [README.md](README.md) for what has to change before this is exposed
without a login in front of it.

Nothing here is specific to a hosting provider. The only step that differs is
"get a machine".

---

## Before anything else

**The API's authentication is a stub.** `curl -H 'Authorization: Bearer x'`
returns any merchant's findings, and the approval endpoint is behind the same
guard. A public URL is a public "pause anyone's campaigns" button.

So this setup puts **Cloudflare Access in front of everything** and publishes
**no ports at all**. That is not belt-and-braces; it is the thing making a
shared deployment safe to do before the auth work lands.

---

## 1. A machine

2 vCPU and 4 GB is the target. 2 GB is too small once all six containers are
up: the AI service alone carries pandas, numpy and scipy.

| Option | Cost | Notes |
|---|---|---|
| Hetzner CX22 | about EUR 4 / month | x86, provisions in a minute |
| Google Compute Engine e2-medium | about USD 25 / month | Sponsor funded, same platform as the Cloud Run target |
| Oracle Ampere A1 | free | 4 ARM cores and 24 GB, when capacity exists. See the ARM note at the bottom |

Ubuntu 24.04 LTS, 30 GB disk. Images come to roughly 3.5 GB and the rest is
volumes and headroom.

**Open no inbound ports.** Not 80, not 443, not 22 if your provider offers a
console. The tunnel dials out.

## 2. Docker

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"   # log out and back in
```

## 3. A tunnel

In the Cloudflare dashboard, under Zero Trust, create a tunnel and copy its
token. Add two public hostnames on it:

| Hostname | Service |
|---|---|
| `app.yourdomain` | `http://web:3001` |
| `api.yourdomain` | `http://api:3000` |

Those are compose service names: cloudflared runs in the same network and
resolves them directly, which is why nothing needs publishing.

Then add an **Access application** covering both hostnames, with a policy
allowing your team's email addresses. This is the login in front of the stub
auth, so do not skip it. A Namecheap domain is free with the GitHub Student
Developer Pack if you do not already have one.

## 4. The stack

```bash
git clone https://github.com/store-advisor/store-advisor.git
cd store-advisor
cp .env.example .env
```

Edit `.env`:

```bash
POSTGRES_PASSWORD=<a long random string>
DATABASE_URL=postgresql://storeadvisor:<that same string>@postgres:5432/storeadvisor
CLOUDFLARE_TUNNEL_TOKEN=<from step 3>
ANTHROPIC_API_KEY=<optional; without it findings have no prose>
NEXT_PUBLIC_API_URL=https://api.yourdomain
```

That last line is the one people get wrong. `NEXT_PUBLIC_*` values are compiled
into the browser bundle when the image is built, not read at run time. Set it to
the address **a browser** will use. Leave it as `localhost:3000` and the
dashboard will look broken to everyone while the API is perfectly healthy.

Then:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose --profile seed run --rm seed
```

The overlay publishes nothing, refuses to start without a password rather than
falling back to `localdev`, and adds the cloudflared container.

## 5. Check it

```bash
docker compose ps                      # five healthy, worker has no port to check
docker compose logs -f worker          # "Check sweep scheduled"
```

Then open `https://app.yourdomain/dashboard` through Cloudflare Access. The
worker sweeps hourly, so set `CHECK_SCHEDULE_CRON='*/1 * * * *'` in `.env` while
demonstrating.

## 6. Updating

```bash
git pull && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Building on the box is fine at this size and keeps the loop short. Move to
building in CI and pushing to a registry when the box starts feeling slow, or
when more than one person is deploying. That is item 6 in
[README.md](README.md).

---

## If the machine is ARM (Oracle Ampere, or any Graviton-class instance)

The images build natively on ARM and run there. What does **not** work is
cross-building them from an x86 laptop under emulation: `prisma generate` fails
with a truncated `getDmmf` response, which is a QEMU artifact rather than an ARM
problem. Prisma publishes `linux-musl-arm64-openssl-3.0.x` engines and the AI
image, pandas and scipy included, has been built and run as `aarch64`.

So on ARM, build on the box, which step 4 already does. Only reach for
`docker buildx --platform linux/arm64` from a laptop if you have a reason to,
and expect that failure if you do.
