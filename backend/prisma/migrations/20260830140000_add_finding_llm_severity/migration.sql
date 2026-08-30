-- The AI service already returns a severity ("low" | "medium" | "high" |
-- "critical") and there was nowhere to put it, so the ranking half of that
-- service's job was being discarded on arrival.
--
-- Deliberately TEXT, not an enum. Severity is a judgement the model makes,
-- not an internal state machine the code controls — the same reasoning that
-- keeps `source` and the externally-sourced `status` fields out of enums
-- (see docs/database/schema-notes.md). Widening the model's vocabulary must
-- not require a migration.
ALTER TABLE "findings" ADD COLUMN "llm_severity" TEXT;
