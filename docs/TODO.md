# Open TODOs

Things that are not decided or not owned yet. These are not sprint tickets, they are gaps that
will hurt us if nobody picks them up. Each needs an owner.

## Urgent (has an external deadline or blocks the demo)

- [ ] **Platform developer and sandbox access.** Shopify and Meta developer applications take
      weeks to clear, and nothing can be tested against a real API until they do. This is now
      the only item with a real external deadline. **Owner: Faraj.**
- [ ] **Who writes the thesis / report?** Grad projects are graded on the document too, not
      just the code. Nobody owns this. It needs an owner from week one, documenting as we go,
      not a scramble at the end. **Owner: ?**
- [ ] **Web Push setup.** The demo opens with a phone buzz. Needs a VAPID key pair, a service
      worker, and somewhere to store subscriptions. Not started, and on the critical path.
      **Owner: Faraj.**

## Important (needed before we go past the MVP)

- [ ] **LLM budget.** The provider is settled: Claude via the Anthropic SDK. Still open — what
      does one finding cost to explain, and who pays? Datajar sponsors tools, so ask them.
      **Owner: Khaled.**
- [ ] **Secrets management.** API keys do not go in the repo. GitHub Secrets for CI, something
      for local dev (a `.env` that is gitignored), and managed secret storage once there is a
      deployment. Folded into SEC-3 below. **Owner: Mostafa.**
- [ ] **Environments.** `infra/deploy.md` covers a shared box behind Cloudflare Access, which
      is what we need before the defence; Cloud Run is the production target and waits on SEC-1.
      **Owner: Faraj.**

## Security track

Three tickets for the eighth seat. They are ordered: SEC-1 blocks a public deployment, and the
other two are cheap once it lands. Each one closes a gap between something the proposal states
and something the code does, so the acceptance criterion is always "the claim is now true".

- [ ] **SEC-1. Real authentication, and the merchant read from the token.**
      `AuthStubGuard` checks that the `Authorization` header is shaped like `Bearer <something>`
      and accepts any token that is. The merchant is a query parameter the caller chooses. So
      `curl -H 'Authorization: Bearer x' '/findings?merchant_id=demo_merchant'` returns 200, and
      the approval endpoint is behind the same guard: on a public address anyone can read any
      merchant's findings and pause any merchant's campaigns. That is OWASP API2 and API1 at
      once, and it makes section 13's "every write requires explicit human approval, as a
      property of the architecture rather than a setting" false as built.
      **Done when** a request with an unverified token is rejected, the merchant comes from the
      verified token rather than the query string, and a test proves one merchant cannot read or
      act on another's findings. The tenant-isolation tests in `actions.integration.spec.ts` are
      the pattern to extend. **Owner: Mostafa.**

- [ ] **SEC-2. Make the audit trail answer "who".**
      The `actions` table records the request, the response, the status and the time, which is
      most of what section 13 promises. It does not record which human approved, and with SEC-1
      unbuilt there is no identity to record. Separately, section 13 states that every prompt
      and model response is persisted; the prompt is stored nowhere, and the schema has no
      column for it.
      **Done when** an action row names its approver, an explanation row carries the prompt and
      the raw model response, and section 13 can be read against the schema without a caveat.
      Small, and it is the thing an examiner can check in one query. **Owner: Mostafa.**

- [ ] **SEC-3. Secrets, and hardening the deployment.**
      `ANTHROPIC_API_KEY` lives in a `.env`. Postgres defaults to `storeadvisor:localdev`. The
      AI service allows every origin. Base images are pinned by mutable tag, so the same
      Dockerfile builds different images on different days. `infra/README.md` lists these as P0
      items 2 to 4 and P1 items 5 to 8, with the standard each comes from.
      **Done when** the deployed environment takes its secrets from managed storage rather than
      a file, base images are pinned by digest, and CI scans the built image. **Owner: Mostafa.**

**Why these three and in this order.** Section 14 offers the project as a reference
architecture for safe agentic action under financial authority. SEC-1 makes the authority real,
SEC-2 makes it accountable, SEC-3 keeps the credentials behind it out of the repository. The
connectors are the reason this cannot wait: once a Shopify or Meta token is stored, the cost of
having designed credential handling late is much higher than designing it now, and section 13
already promises those tokens are scoped to the minimum each connector needs.

## Before demo day

- [ ] **LLM eval set.** A handful of hand-written findings with expected explanations, so we
      can tell when a prompt change makes the LLM worse. **Owner: Khaled.**
- [ ] **Demo day plan.** Who presents, on what machine, and what happens if the wifi dies.
      Record a backup video. **Owner: Faraj + Omar.**

## Closed

- [x] **Book the supervisor.** Dr. Gehad Taher, confirmed 8 August 2026.
- [x] **Branch protection.** The blocker was the free tier, which does not protect branches on
      a private repository. Resolved by making the repo public rather than by buying a plan:
      academic integrity and sponsor exposure were both checked first, and a full secret scan
      came back clean. `main` now takes changes only through a pull request whose pipeline is
      green and whose branch is up to date, and it cannot be deleted or force-pushed. Nobody
      bypasses it, the tech lead included. PRs are enforced, not a convention.

      It is configured as a repository **ruleset**, not as classic branch protection, so the
      old `/branches/main/protection` API answers 404 and the classic settings page looks
      empty. Look under Settings, Rules, Rulesets.

## How to use this file

When you take one of these, put your name on it and move it into a Jira ticket. This file is
the parking lot, Jira is the work. Nothing here should sit unowned for more than a sprint.
