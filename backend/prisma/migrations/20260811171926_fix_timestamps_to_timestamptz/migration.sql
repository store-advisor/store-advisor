-- AlterTable
ALTER TABLE "actions" ALTER COLUMN "executed_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "campaign_products" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "campaigns" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "events" ALTER COLUMN "occurred_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "findings" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "merchants" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3);
