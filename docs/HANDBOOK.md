# Store Advisor: Team Handbook

Read this before writing any code. It explains what we are building, how it works end to end,
and the rules we all follow.

---

## 1. What we are building

**Store Advisor finds the money a merchant's store is leaking, and stops it.**

It connects to a merchant's store and ad accounts, runs checks that join data *across* those
sources, finds problems no single dashboard can see, prices them in dollars, explains them in
plain language, and (with the merchant's approval) fixes them.

Think **AWS Trusted Advisor, but for e-commerce.**

### The one thing to understand

Most analytics tools look at one source at a time. The expensive problems live *between*
sources. Example, and this is our first check:

> The store says "Blue Hoodie" is out of stock.
> The ad account says a campaign is still spending $40.50/day driving traffic to it.
> That traffic hits a dead page. Nobody can buy anything.
> **The merchant is burning $284/week and has no idea.**

Neither the store nor the ad account knows this alone. You need both, joined on a timeline.
**That join is the project.**

---

## 2. What actually makes this different

Read this carefully, because the obvious answer is wrong and someone will test you on it.

The tempting claim is "we join sources and write back to a platform, and nobody else does."
That claim is false. Attribution suites like Triple Whale and Northbeam already unify store
and ad data. And our own sponsor, Datajar, connects a merchant's store and ad accounts,
answers questions in chat, and **its agent will pause an underperforming campaign when told
to.** Joining sources and executing a fix distinguish nothing on their own. Do not build the
pitch on them.

| Capability | Native analytics | Attribution suites | Cloud advisors | Datajar | Store Advisor |
|---|---|---|---|---|---|
| Joins independent sources | No | Yes | n/a | Yes | Yes |
| Explains the cause in plain language | No | No | No | Yes | Yes |
| Prices the problem in currency | No | Partial | Yes | No | Yes |
| Executes the fix on approval | No | No | Partial | Yes | Yes |
| **Speaks without being asked** | No | No | Yes | No | **Yes** |
| **Verifies its own fix worked** | No | No | No | No | **Yes** |

**Two rows survive.** Every system above acts only when addressed, except the cloud advisors
(AWS Trusted Advisor, Google Cloud Recommender), which speak first but never check their own
work. None of them re-observes the source to confirm a remediation actually landed.

So the contribution is exactly two properties:

1. **Scheduled, not prompted.** A check fires on a timer and tells the merchant something they
   never thought to ask.
2. **It verifies its own fix.** A finding is not marked fixed until a *later* cycle has
   independently re-observed the sources and seen the spend stop.

That is stage 6 in section 4, and it is why the demo ends the way it does. Everything else in
this system is table stakes that someone else already ships.

---

## 3. The golden rule

**The check finds the problem. The LLM explains it. The LLM never invents a number.**

This is the most important rule in the project. Everyone must understand it.

- A **check** is plain, deterministic code (basically SQL). It looks at real rows and either
  fires or does not. `$284/week` is computed by code from actual `ad_spend` rows.
- The **LLM** receives the evidence the check already proved, and writes the human explanation,
  a confidence, and a severity ranking.

If someone asks *"how do you know the AI isn't hallucinating the numbers?"* the answer is:
**it never touches the numbers.** Every figure traces back to a database row. That is exactly
why we can safely let it pause a real ad campaign.

If you ever find yourself writing "ask the LLM to find problems in this data", stop. That is
not our architecture.

---

## 4. End to end: how one finding happens

This is the whole system. Learn these six stages.

### Stage 1: INGEST (connectors)
- A scheduler fires (hourly).
- Connectors pull from each source: store products, inventory, orders; ad campaigns, daily
  spend.
- Data is written **twice**:
  - **Current state** into normalized tables (`products`, `campaigns`, `ad_spend`, `orders`)
  - **What changed, and when** into the `events` table (append-only)

**Why the events table matters:** without it you only know "stock is 0 *now*" and "the campaign
is on *now*". With it you know **stock hit zero at 09:12 on Mar 4, and the spending continued
after that.** Time is what makes the check possible. Never drop the events table to
"simplify".

### Stage 2: DETECT (check engine)
- A check job is queued per merchant.
- The check engine loads state + events and runs every registered check.
- Our first check, `ad_spend_on_oos`:
  - Find products where `inventory_qty = 0`
  - Get the `stock_out` event timestamp
  - Find active campaigns targeting that product
  - Sum `ad_spend` since the stock-out timestamp
  - If it exceeds a threshold, **emit a finding** with the raw evidence and a dollar figure
- A finding is a row in `findings`, containing the evidence JSON and `estimated_cost`.

### Stage 3: EXPLAIN (AI service)
- The finding is queued to the Python AI service.
- The LLM is handed the evidence and returns: a plain-language cause, a confidence, a
  severity.
- The finding row is updated. Status becomes `open`.

### Stage 4: DELIVER (API, web)
- A Web Push notification hits the merchant's phone, with email as the fallback.
- The card opens in the dashboard: *"You're burning $284/week on ads for a sold-out product."*
- Tap it: the evidence and the explanation.

**There is no native app.** Delivery is one Next.js dashboard, installable as a PWA, and Web
Push (VAPID) reaches the phone without a separate mobile codebase. See section 5.

### Stage 5: ACT (action executor)
- The merchant taps **Pause campaign**.
- The API writes an `actions` row: `pause_campaign`, `status = pending`, with an
  **idempotency key**.
- The executor calls the real ad API and pauses the campaign. The response is logged.

**Idempotency matters:** if the request is retried, or the merchant double-taps, we must
never pause twice or double-charge an action. The idempotency key guarantees one effect.

### Stage 6: VERIFY (this is what makes it an agent)
- The **next** check run sees the campaign is now paused and the spend has stopped.
- The finding moves to **"Fixed. Saved $284/week"** and is recorded in the savings ledger.

**Nobody else builds stage 6.** A dashboard tells you something is wrong. An agent fixes it
and proves it worked. That is our differentiator, and it is what we demo.

---

## 5. Services and who owns them

| Service | What it does | Stack | Owner |
|---|---|---|---|
| **Store connector** | Pull store data, normalize, write state + events | NestJS | Basem Essam |
| **Ads connector** | Pull ad data against the same interface; observability | NestJS | Ahmed Essam |
| **Check engine** | Run checks, emit findings. **The core.** | NestJS | Ahmed Abdallah |
| **AI service** | LLM explains, prices, ranks findings | Python | Khaled Ghoniem |
| **API** | Serve findings, accept approvals | NestJS | Mohamed Haggag |
| **Web dashboard** | Findings, approval, savings ledger. **The demo.** | Next.js (PWA) | Ahmed Faraj |
| **Design** | Design system, the findings screens, the demo flow | Figma | Omar Ali Abdelrady |
| **Infra** | Repo, Docker, CI/CD, deploys, logging | Docker/GCP | Ahmed Faraj |

**The dashboard is the demo.** There is no separate mobile app and no Flutter. The Next.js
client is installable as a PWA and receives Web Push, so the notification still arrives on a
phone — one codebase instead of two. If you find a ticket or a doc that says Flutter or FCM,
it predates this decision and it is wrong.

**The connector interface is a contract.** Basem defines it once. Every future source
(Shopify, Salla, WooCommerce) implements the same interface. Adding a source must never
require changing the check engine.

**A check is a module.** Abdallah defines the check interface once. Every future check
(dead stock, ROAS drop, sync failure) is a new module reading the same tables. Adding a check
must never require changing the engine.

Those two rules are what let this project grow without rewrites.

---

## 6. Data model (v1)

Everything is keyed by `merchant_id`. Postgres.

```
products    id, merchant_id, source, external_id, sku, title,
            price, inventory_qty, status, updated_at

campaigns   id, merchant_id, source, external_id, name, status,
            daily_budget, target_product_ids[], updated_at

ad_spend    id, merchant_id, campaign_id, date, spend, clicks, conversions

orders      id, merchant_id, source, external_id, product_id, qty,
            revenue, created_at

events      id, merchant_id, source, entity_type, entity_id,
            event_type,        -- stock_out | campaign_started | price_changed
            payload jsonb,
            occurred_at        -- APPEND ONLY. This is what enables correlation.

findings    id, merchant_id, check_id,
            status,            -- open | approved | applied | fixed | dismissed
            evidence jsonb,    -- the raw facts the check proved
            estimated_cost,    -- dollars per week
            llm_explanation, llm_confidence,
            created_at

actions     id, finding_id, action_type,   -- pause_campaign
            status,                        -- pending | success | failed
            idempotency_key UNIQUE,
            request, response, executed_at
```

### Three data layers (important)

Do not dump raw API responses straight into these tables.

1. **Raw** — exactly what the API returned, as JSON, with a timestamp. Never deleted. If a
   connector has a bug, we replay from here instead of re-pulling.
2. **Clean / canonical** — deterministic code maps raw into the tables above. This is where
   the real work is: type coercion, **timezones normalized to UTC**, currency normalized,
   dedupe, and **ID resolution** (a Shopify product ID must be linkable to the product a Meta
   campaign targets).
3. **Features** — precomputed values the checks need (`days_since_stockout`,
   `spend_since_stockout`, `rolling_7d_roas`). Computed on a schedule, stored, not recalculated
   per query.

**Checks read layer 3. The LLM reads a check's output. Nobody reads raw except to debug.**

Cleaning is not a "nice to have we do later". **If IDs, timezones, and currencies are not
normalized, our flagship check silently joins nothing and finds zero leaks.** Layer 2 is a
core deliverable, not a chore.

---

## 7. The hard parts (know these, they will bite)

1. **Normalization.** Shopify and Meta model products and campaigns completely differently.
   Mapping them into one schema without losing meaning is the first real problem.
2. **Time alignment.** Ad spend is daily. Stock changes are per-second. Timezones differ.
   Getting the join right is subtle, and the whole check depends on it.
3. **Cost attribution.** "This cost you $284" needs a model we can defend in the viva. Our v1:
   *all ad spend on a product after its stock-out timestamp.* Simple and defensible. Write down
   why.
4. **Idempotent writes.** A retry must never pause a campaign twice.
5. **LLM trust.** See the golden rule. Log every prompt and every response.

---

## 8. How we work

- **Sprints:** 2 weeks. Planning at the start, updates through the week.
- **Board:** Jira, `storeadvisor.atlassian.net`. Every task is a ticket. No ticket, no work.
- **Repo:** one monorepo. `/backend`, `/web`, `/ai`, `/infra`.
- **Branches:** `feature/<short-desc>-<ticket>`, branched off `main`.
- **PRs:** required. No direct pushes to `main`. Branch protection enforces this.
- **CI:** must be green. A red build does not merge. This is the gate, and nobody bypasses it.
- **Docs:** Notion. Every decision we make gets written down with the reason.

### Merging

**Green CI is what authorises a merge.** A PR whose required checks pass may be merged by its
author without waiting for a human approval.

This is a deliberate change from the "one approval before merge" rule we started with. The
reason: approvals were becoming a queue rather than a quality gate. Work sat finished and
unmerged for days waiting on someone to click a button, and a rule that mostly produces
waiting is not buying the review it promises.

What replaces it is a CI pipeline that actually checks something. `Backend` runs lint, build,
the full test suite against a real Postgres, and a migration-drift check. `Image builds and
boots` builds the production image and asserts the API serves traffic — that job exists
because two defects reached `main` that no human reviewer had caught, and that no unit test
could catch. Those checks are required and have no bypass actors.

**Review has not stopped mattering, it has stopped blocking.** Still expected:

- Request a reviewer on anything touching a contract others depend on — the schema, the API
  response shape, the connector or check interfaces. Merge when it is green; take the feedback
  in a follow-up if it arrives after.
- CODEOWNERS still auto-requests the owner of every path you touch. Read what they say.
- If you are merging into someone else's area, say so in the PR and tag them.

**The honest trade-off:** we have chosen speed over a second pair of eyes, on a team where
the second pair of eyes was often not available. That is a reasonable call for a project this
size with CI this thorough. It would be a bad call on a system handling real money or real
customer data, and if this project ever does either, this rule should be the first thing we
change back.

### Definition of done
A ticket is done when: the code is merged, CI is green, and the acceptance criteria in the
ticket are all true.

Note what is no longer in that list: "someone other than the author has seen it work." The
burden that requirement carried now falls on the tests. If a ticket's acceptance criteria are
not checked by something automated, they are not really checked at all — so write the test
rather than relying on a reviewer to notice.

---

## 9. What we are NOT building

Say no to these, loudly, whenever they come up:

- Real merchant data. Everything is synthetic or public.
- Anything inside Datajar's codebase. We are standalone.
- Auto-applying risky actions without approval.
- A second check before the first one works end to end.
- Any feature that does not serve the demo in section 4.

**Scope creep is the number one way this project fails.** One check, all the way through, then
we widen.

---

## 10. What is still missing (gaps we must close)

Being honest about what we have not decided yet:

- [ ] **Who writes the thesis / report?** Grad projects are graded on the document too, not
      just the code. **Nobody owns this yet.** It needs an owner from week one, not month ten.
- [x] **Supervisor booked.** Dr. Gehad Taher, confirmed 8 August 2026.
- [ ] **LLM budget.** The model is Claude via the Anthropic SDK. Still open: what does one
      finding cost to explain, and who pays? (Datajar sponsors tools, so ask them.)
- [ ] **Secrets management.** Where do API keys live? Not in the repo. GitHub Secrets for CI,
      and something for local dev.
- [ ] **Push notifications.** Web Push needs a VAPID key pair, a service worker, and a
      subscription store. Nobody has done this yet and it is on the demo path.
- [ ] **Environments.** Do we have a staging deploy, or only local + demo?
- [ ] **How do we know the LLM is any good?** We need a small eval set: hand-written findings
      with expected explanations, so we can tell when we make it worse.
- [ ] **Demo day plan.** Who presents? What machine? What if the wifi dies? (Record a backup
      video.)

---

## 11. The demo (memorize this)

Everything above exists to make this happen:

1. A phone buzzes — Web Push to the installed dashboard: **"You're burning $284/week on ads
   for a sold-out product."**
2. Open it: Blue Hoodie, out of stock Mar 4 at 09:12. Spring Sale campaign, still spending
   $40.50/day. 1,200 clicks to a dead page. Zero sales in six days.
3. The AI explains the cause in plain language.
4. Tap **Pause campaign.** It actually calls the ad API and pauses it.
5. **On the next cycle** the check re-observes the sources, sees the spend has stopped, and
   the card turns green: **"Fixed. Saved $284/week."**

Step 5 is the one that matters and the one people skip. The card does not turn green because
we paused something — it turns green because a later run independently confirmed the money
stopped. That is the whole argument in section 2.

If we build that, the project is done. Everything else is bonus.
