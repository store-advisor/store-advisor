-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "budget_type" TEXT NOT NULL DEFAULT 'daily',
ALTER COLUMN "daily_budget" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "actions_merchant_id_status_idx" ON "actions"("merchant_id", "status");
