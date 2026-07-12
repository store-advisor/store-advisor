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

## 2. Why this is not a copy of DataJar

DataJar is an AI analytics platform. You ask it a question in chat, an agent writes Python,
runs it, and streams you an answer. I read their codebase: **every tool their agent has is a
read tool, and every entry point is a user question.** Their only scheduled jobs are data
sync. Nothing in DataJar ever speaks first.

| | DataJar | Store Advisor |
|---|---|---|
| Trigger | User asks a question | A schedule fires |
| Direction | Pull | Push |
| Output | An answer in chat | A priced finding + an action |
| Nature | Reactive | Proactive |
| Speaks first? | No | **Yes** |

They have the connectors, the data, the action executors, and the notification channels. They
have **nothing in the middle** that runs a check and tells you something you did not ask for.
That missing middle is us.

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

### Stage 4: DELIVER (API, mobile, web)
- A push notification hits the merchant's phone.
- The app shows the card: *"You're burning $284/week on ads for a sold-out product."*
- Tap it: the evidence and the explanation.

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
| **Connectors** | Pull from sources, normalize, write state + events | NestJS | Bassem |
| **Check engine** | Run checks, emit findings. **The core.** | NestJS | Abdallah |
| **AI service** | LLM explains, prices, ranks findings | Python | Khaled |
| **API** | Serve findings, accept approvals | NestJS | Haggag |
| **Web dashboard** | Review findings, savings ledger | Next.js | Essam |
| **Mobile app** | Notifications + one-tap approval. **The demo.** | Flutter | Osama |
| **Design** | Design system, the findings screens, the demo flow | Figma | Ahmed Osama |
| **Infra** | Repo, Docker, CI/CD, deploys, logging | Docker/GCP | Faraj |

**The connector interface is a contract.** Bassem defines it once. Every future source
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
- **Repo:** one monorepo. `/backend`, `/web`, `/mobile`, `/ai`, `/infra`.
- **Branches:** `feature/<short-desc>-<ticket>`, branched off `main`.
- **PRs:** required. No direct pushes to `main`. **One approval before merge.**
- **CI:** must be green. A red build does not merge.
- **Docs:** Notion. Every decision we make gets written down with the reason.

### Definition of done
A ticket is done when: the code is merged, CI is green, the acceptance criteria in the ticket
are all true, and someone other than the author has seen it work.

---

## 9. What we are NOT building

Say no to these, loudly, whenever they come up:

- Real merchant data. Everything is synthetic or public.
- Anything inside DataJar's codebase. We are standalone.
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
- [ ] **Supervisor not booked.** People from our year are already reserving. This is the only
      thing with an external deadline.
- [ ] **LLM provider and budget.** Which model? What does one finding cost to explain? Who
      pays? (DataJar sponsors tools, so ask them.)
- [ ] **Secrets management.** Where do API keys live? Not in the repo. GitHub Secrets for CI,
      and something for local dev.
- [ ] **Push notifications.** Mobile needs FCM (Firebase) set up. Nobody has done this yet and
      it is on the demo path.
- [ ] **Environments.** Do we have a staging deploy, or only local + demo?
- [ ] **How do we know the LLM is any good?** We need a small eval set: hand-written findings
      with expected explanations, so we can tell when we make it worse.
- [ ] **Demo day plan.** Who presents? What machine? What if the wifi dies? (Record a backup
      video.)

---

## 11. The demo (memorize this)

Everything above exists to make this happen:

1. A phone buzzes: **"You're burning $284/week on ads for a sold-out product."**
2. Open it: Blue Hoodie, out of stock Mar 4 at 09:12. Spring Sale campaign, still spending
   $40.50/day. 1,200 clicks to a dead page. Zero sales in six days.
3. The AI explains the cause in plain language.
4. Tap **Pause campaign.** It actually calls the ad API and pauses it.
5. The card turns green: **"Fixed. Saved $284/week."**

If we build that, the project is done. Everything else is bonus.
