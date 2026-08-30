-- The idempotency key is supplied by the caller, so it is only meaningful
-- within one merchant. A global unique constraint let one merchant's key
-- collide with another's: the second merchant's approval was rejected as a
-- duplicate, they were handed the first merchant's action id and status, and
-- their campaign was never paused. Uniqueness per tenant is the guarantee we
-- actually need.

-- DropIndex
DROP INDEX "actions_idempotency_key_key";

-- CreateIndex
CREATE UNIQUE INDEX "actions_merchant_id_idempotency_key_key" ON "actions"("merchant_id", "idempotency_key");
