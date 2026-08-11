# Store Advisor — Entity Relationship Diagram

## Purpose

This document describes the v1 database schema for Store Advisor: what
entities exist, why each exists, and how they relate. It is the reference
for SCRUM-7 (Database Schema and Migrations) and the basis for
`prisma/schema.prisma`.

See `erd.mmd` for the machine-readable diagram source. Render it at
https://mermaid.live or via any Mermaid-compatible viewer/VS Code extension.

## Entities

### Merchant

The tenant root. Every other table is scoped to a merchant via a real,
database-enforced foreign key rather than a free-floating string. This
lets Postgres reject invalid `merchantId` values outright instead of
relying on application code to always get it right.

### Product

Current, normalized snapshot of a store's catalog/inventory. `inventoryQty`
is the field the first check (`ad_spend_on_oos`) reads directly. Uniquely
identified across sources by `(merchantId, source, externalId)` — the
internal `id` is never the external platform's ID, since external IDs are
not guaranteed unique across different source platforms.

### Campaign

Current, normalized advertising state. Same source/externalId pattern as
Product, for the same reason: new ad platforms require zero schema change.

### CampaignProduct

Resolves the many-to-many relationship between Campaign and Product.
**This is a deliberate deviation from the handbook's literal
`target_product_ids[]` array field** — see `decisions.md` for the
reasoning and required team sign-off.

### AdSpend

Daily time-series fact, intentionally separate from Campaign (which is
current-state only). One row per campaign per day. `date` is
platform-reported daily granularity, distinct from `Event.occurredAt`'s
precise timestamp — see `decisions.md`.

### Order

Normalized sales facts. Proves whether a product actually sold — used both
as finding evidence and for future checks (e.g. dead stock).

### Event

**The most structurally important table in the schema.** Every other table
is a current-state snapshot; only Event records _when_ a state change
happened. The first check cannot function without it — it needs the exact
moment a product went out of stock, compared against ad spend that
occurred after that moment. Append-only. Never updated or deleted.

### Finding

The output of a deterministic check. `estimatedCost` is a stored column —
this is the Golden Rule enforced physically: no service downstream of the
check engine may recompute or restate this number. `llmExplanation` and
`llmConfidence` are nullable, filled in asynchronously after creation.

### Action

A merchant-approved remediation attempt and its real-world result.
`idempotencyKey` is a database-enforced unique constraint, not an
application-level check — this is what actually prevents a retried
"pause campaign" request from firing twice against a live ad account.

## Many-to-many relationships

Only one true many-to-many exists: **Campaign ↔ Product**, resolved by
`CampaignProduct`. Every other relationship is a standard one-to-many via
a foreign key on the child table.

## Non-standard relationship: Event.entityId

`Event.entityId` is a polymorphic reference (its meaning depends on
`entityType`) and is **not** a database-enforced foreign key — Postgres
cannot FK into "whichever table `entityType` names." This is a deliberate
trade-off: flexibility gained, referential integrity lost on that one
column. See `decisions.md`.
