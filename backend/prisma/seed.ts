/**
 * Seeds the demo fixture from HANDBOOK.md section 11.
 *
 * These are not arbitrary numbers. They are the exact figures the demo
 * script says out loud, so that what a reviewer sees on screen and what the
 * check computes from real rows are the same thing:
 *
 *   Blue Hoodie, out of stock Mar 4 at 09:12. Spring Sale campaign, still
 *   spending $40.50/day. 1,200 clicks to a dead page. Zero sales in six days.
 *
 * The point of seeding rather than hardcoding: the $284 on the demo card is
 * computed by the check from the ad_spend rows below, not typed into a
 * fixture. That is the golden rule made testable.
 *
 * Idempotent — safe to run repeatedly against the same database.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// The moment the story turns. Every spend row after this is wasted money,
// and the check's whole job is to notice that.
const STOCK_OUT_AT = new Date('2026-03-04T09:12:00.000Z');
const DAILY_SPEND = 40.5;
const DAYS_BURNING = 6;
const TOTAL_CLICKS = 1200;

const SOURCE_STORE = 'demo_store';
const SOURCE_ADS = 'demo_ads';

async function main() {
  const merchant = await prisma.merchant.upsert({
    where: { id: 'demo_merchant' },
    update: {},
    create: { id: 'demo_merchant', name: 'Demo Merchant' },
  });

  // Out of stock. inventoryQty = 0 is what the check keys on.
  const hoodie = await prisma.product.upsert({
    where: {
      merchantId_source_externalId: {
        merchantId: merchant.id,
        source: SOURCE_STORE,
        externalId: 'prod_blue_hoodie',
      },
    },
    update: { inventoryQty: 0, status: 'active' },
    create: {
      merchantId: merchant.id,
      source: SOURCE_STORE,
      externalId: 'prod_blue_hoodie',
      sku: 'HOODIE-BLUE-M',
      title: 'Blue Hoodie',
      price: 59.0,
      inventoryQty: 0,
      status: 'active',
    },
  });

  // A control: in stock, also advertised. The check must NOT fire on this one.
  // A check that fires on everything is worth nothing, so the fixture has to
  // contain something it should stay quiet about.
  const tee = await prisma.product.upsert({
    where: {
      merchantId_source_externalId: {
        merchantId: merchant.id,
        source: SOURCE_STORE,
        externalId: 'prod_white_tee',
      },
    },
    update: { inventoryQty: 42 },
    create: {
      merchantId: merchant.id,
      source: SOURCE_STORE,
      externalId: 'prod_white_tee',
      sku: 'TEE-WHITE-L',
      title: 'White Tee',
      price: 25.0,
      inventoryQty: 42,
      status: 'active',
    },
  });

  // The events table is what makes the join possible. Without this row we
  // only know stock is zero *now*; with it we know exactly when it hit zero,
  // and therefore which spend came after.
  const existingStockOut = await prisma.event.findFirst({
    where: {
      merchantId: merchant.id,
      entityType: 'product',
      entityId: hoodie.id,
      eventType: 'stock_out',
    },
  });
  if (!existingStockOut) {
    await prisma.event.create({
      data: {
        merchantId: merchant.id,
        source: SOURCE_STORE,
        entityType: 'product',
        entityId: hoodie.id,
        eventType: 'stock_out',
        payload: { previousQty: 3, newQty: 0 },
        occurredAt: STOCK_OUT_AT,
      },
    });
  }

  const campaign = await prisma.campaign.upsert({
    where: {
      merchantId_source_externalId: {
        merchantId: merchant.id,
        source: SOURCE_ADS,
        externalId: 'camp_spring_sale',
      },
    },
    update: { status: 'active', dailyBudget: DAILY_SPEND },
    create: {
      merchantId: merchant.id,
      source: SOURCE_ADS,
      externalId: 'camp_spring_sale',
      name: 'Spring Sale',
      status: 'active',
      dailyBudget: DAILY_SPEND,
      budgetType: 'daily',
    },
  });

  // A paused campaign also targeting the hoodie. The check must not count
  // its spend — pausing is exactly the fix we recommend, so counting a
  // paused campaign would mean the finding never clears in stage 6.
  const pausedCampaign = await prisma.campaign.upsert({
    where: {
      merchantId_source_externalId: {
        merchantId: merchant.id,
        source: SOURCE_ADS,
        externalId: 'camp_winter_clearance',
      },
    },
    update: { status: 'paused' },
    create: {
      merchantId: merchant.id,
      source: SOURCE_ADS,
      externalId: 'camp_winter_clearance',
      name: 'Winter Clearance',
      status: 'paused',
      dailyBudget: 12.0,
      budgetType: 'daily',
    },
  });

  for (const [c, p] of [
    [campaign, hoodie],
    [pausedCampaign, hoodie],
    [campaign, tee],
  ] as const) {
    await prisma.campaignProduct.upsert({
      where: { campaignId_productId: { campaignId: c.id, productId: p.id } },
      update: {},
      create: { campaignId: c.id, productId: p.id },
    });
  }

  // Spend for each day after the stock-out. This is the money the merchant
  // is losing, and the rows the dollar figure is computed from.
  const clicksPerDay = Math.round(TOTAL_CLICKS / DAYS_BURNING);
  for (let day = 0; day < DAYS_BURNING; day++) {
    const date = new Date(STOCK_OUT_AT);
    date.setUTCDate(date.getUTCDate() + day);
    date.setUTCHours(0, 0, 0, 0);

    for (const [c, spend, clicks] of [
      [campaign, DAILY_SPEND, clicksPerDay],
      [pausedCampaign, 0, 0],
    ] as const) {
      await prisma.adSpend.upsert({
        where: {
          merchantId_campaignId_date: {
            merchantId: merchant.id,
            campaignId: c.id,
            date,
          },
        },
        update: { spend, clicks },
        create: {
          merchantId: merchant.id,
          campaignId: c.id,
          date,
          spend,
          clicks,
          // Zero conversions is the other half of the story: the traffic
          // arrived and nobody could buy anything.
          conversions: 0,
        },
      });
    }
  }

  // Deliberately no orders for the hoodie since the stock-out. "Zero sales
  // in six days" in the demo script is the absence of rows, not a flag.

  console.log('Seeded the demo fixture:');
  console.log(`  merchant   ${merchant.id}`);
  console.log(`  product    ${hoodie.title} (inventoryQty=0)`);
  console.log(`  stock out  ${STOCK_OUT_AT.toISOString()}`);
  console.log(`  campaign   ${campaign.name} @ $${DAILY_SPEND}/day, active`);
  console.log(`  ad_spend   ${DAYS_BURNING} days after the stock-out`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
