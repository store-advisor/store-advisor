-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'FIXED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "merchants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "sku" TEXT,
    "title" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "inventory_qty" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "daily_budget" DECIMAL(10,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_products" (
    "campaign_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_products_pkey" PRIMARY KEY ("campaign_id","product_id")
);

-- CreateTable
CREATE TABLE "ad_spend" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "spend" DECIMAL(10,2) NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ad_spend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "revenue" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "check_id" TEXT NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "evidence" JSONB NOT NULL,
    "estimated_cost" DECIMAL(10,2) NOT NULL,
    "llm_explanation" TEXT,
    "llm_confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "finding_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "response" JSONB,
    "executed_at" TIMESTAMP(3),

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_merchant_id_inventory_qty_idx" ON "products"("merchant_id", "inventory_qty");

-- CreateIndex
CREATE UNIQUE INDEX "products_merchant_id_source_external_id_key" ON "products"("merchant_id", "source", "external_id");

-- CreateIndex
CREATE INDEX "campaigns_merchant_id_status_idx" ON "campaigns"("merchant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_merchant_id_source_external_id_key" ON "campaigns"("merchant_id", "source", "external_id");

-- CreateIndex
CREATE INDEX "campaign_products_product_id_idx" ON "campaign_products"("product_id");

-- CreateIndex
CREATE INDEX "ad_spend_merchant_id_campaign_id_date_idx" ON "ad_spend"("merchant_id", "campaign_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ad_spend_merchant_id_campaign_id_date_key" ON "ad_spend"("merchant_id", "campaign_id", "date");

-- CreateIndex
CREATE INDEX "orders_merchant_id_product_id_created_at_idx" ON "orders"("merchant_id", "product_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_merchant_id_source_external_id_key" ON "orders"("merchant_id", "source", "external_id");

-- CreateIndex
CREATE INDEX "events_merchant_id_entity_type_entity_id_occurred_at_idx" ON "events"("merchant_id", "entity_type", "entity_id", "occurred_at");

-- CreateIndex
CREATE INDEX "findings_merchant_id_status_idx" ON "findings"("merchant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "actions_idempotency_key_key" ON "actions"("idempotency_key");

-- CreateIndex
CREATE INDEX "actions_finding_id_idx" ON "actions"("finding_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_products" ADD CONSTRAINT "campaign_products_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_products" ADD CONSTRAINT "campaign_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_spend" ADD CONSTRAINT "ad_spend_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_spend" ADD CONSTRAINT "ad_spend_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "findings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
