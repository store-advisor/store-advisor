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
      for local dev (a `.env` that is gitignored). **Owner: Faraj.**
- [ ] **Environments.** Do we have a staging deploy on Cloud Run, or only local plus the demo
      machine? **Owner: Faraj.**

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
