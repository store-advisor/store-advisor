ALTER TABLE "ad_spend" ADD CONSTRAINT "spend_non_negative" CHECK ("spend" >= 0);
ALTER TABLE "ad_spend" ADD CONSTRAINT "clicks_non_negative" CHECK ("clicks" >= 0);
ALTER TABLE "ad_spend" ADD CONSTRAINT "conversions_non_negative" CHECK ("conversions" >= 0);

ALTER TABLE "products" ADD CONSTRAINT "inventory_qty_non_negative" CHECK ("inventory_qty" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "price_non_negative" CHECK ("price" >= 0);

ALTER TABLE "orders" ADD CONSTRAINT "qty_positive" CHECK ("qty" > 0);
ALTER TABLE "orders" ADD CONSTRAINT "revenue_non_negative" CHECK ("revenue" >= 0);

ALTER TABLE "findings" ADD CONSTRAINT "estimated_cost_non_negative" CHECK ("estimated_cost" >= 0);

ALTER TABLE "campaigns" ADD CONSTRAINT "daily_budget_non_negative" CHECK ("daily_budget" IS NULL OR "daily_budget" >= 0);