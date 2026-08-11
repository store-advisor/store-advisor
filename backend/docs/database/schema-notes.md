# Store Advisor — Prisma Schema Field Notes

Field-level rationale for `prisma/schema.prisma`, so anyone reading the
schema doesn't have to reverse-engineer the reasoning. High-level
architectural decisions live in `decisions.md`; this file is closer to the
metal.

## Naming conventions

- **TypeScript/Prisma layer:** camelCase (`merchantId`, `inventoryQty`).
- **Database layer:** snake_case (`merchant_id`, `inventory_qty`), via
  `@map` on fields and `@@map` on models.
- Reason: raw SQL (used extensively by the Check Engine per the handbook)
  is far less error-prone against unquoted snake_case identifiers than
  camelCase, which Postgres silently lowercases unless quoted.

## Primary keys

- All models use `@id @default(cuid())`, not `@default(autoincrement())`.
- Reason: collision-resistant ID generation without a DB round-trip;
  avoids a costly migration if any future component needs to generate IDs
  client-side or across services before insert.

## Source/externalId pattern

- Applies to: `Product`, `Campaign`, `Order`.
- Each has `source` (which external platform) and `externalId` (that
  platform's ID for the record), plus a composite unique constraint on
  `(merchantId, source, externalId)`.
- The internal `id` is never the external platform's ID — external IDs
  are not guaranteed unique across different source platforms (Shopify
  product `8842` and Salla product `8842` are different records).
- This composite unique constraint is also the natural upsert target for
  connector sync logic.

## Timestamps

- All timestamp columns are `DateTime` (Postgres `timestamptz`), never
  naive/local timestamps.
- Reason: handbook section 39 requires UTC normalization at the canonical
  layer; naive timestamps make cross-timezone correlation (store timezone
  vs. ad platform reporting timezone) silently unreliable.

## Indexes (to be finalized during implementation, tracked here as built)

Principles guiding index design — not applied speculatively, only where a
known query pattern needs them:

- Every table leads its indexes with `merchantId`, since every query in a
  multi-tenant system filters by tenant first.
- `Event` needs a composite index on
  `(merchantId, entityType, entityId, occurredAt)` — this is the literal
  shape of the first check's query ("events for this product, in order,
  to find the stockout time").
- `AdSpend` needs `(merchantId, campaignId, date)`, both for query
  performance and as a unique constraint to prevent double-ingesting the
  same day's spend on re-sync.
- `actions.idempotencyKey` requires a unique index — this is an explicit
  acceptance criterion, not a performance optimization.
- No index is added defensively "just in case" — only for query patterns
  the first check or known API access patterns actually require.
