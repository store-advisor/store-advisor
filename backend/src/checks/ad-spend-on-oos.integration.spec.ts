/// <reference types="jest" />
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { AdSpendOnOosCheck } from './ad-spend-on-oos.check';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Runs the real query against a real Postgres. Mocking Prisma here would
 * test nothing: the entire check IS the SQL, and the subtle parts (the date
 * comparison, the active-campaign filter, the aggregate) only exist in the
 * database.
 */
describe('AdSpendOnOosCheck (integration)', () => {
  let prisma: PrismaClient;
  let check: AdSpendOnOosCheck;
  const merchantId = 'check_spec_merchant';

  const STOCK_OUT_AT = new Date('2026-03-04T09:12:00.000Z');
  const DAILY_SPEND = 40.5;
  const DAYS = 6;

  let oosProductId: string;
  let activeCampaignId: string;

  beforeAll(async () => {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });
    check = new AdSpendOnOosCheck(prisma as unknown as PrismaService);

    await prisma.merchant.create({
      data: { id: merchantId, name: 'Check Spec Merchant' },
    });

    // Out of stock, advertised by a live campaign. Should fire.
    const hoodie = await prisma.product.create({
      data: {
        merchantId,
        source: 'spec_store',
        externalId: 'p_hoodie',
        title: 'Blue Hoodie',
        price: 59,
        inventoryQty: 0,
        status: 'active',
      },
    });
    oosProductId = hoodie.id;

    // In stock, advertised. Must NOT fire.
    const tee = await prisma.product.create({
      data: {
        merchantId,
        source: 'spec_store',
        externalId: 'p_tee',
        title: 'White Tee',
        price: 25,
        inventoryQty: 42,
        status: 'active',
      },
    });

    await prisma.event.create({
      data: {
        merchantId,
        source: 'spec_store',
        entityType: 'product',
        entityId: hoodie.id,
        eventType: 'stock_out',
        payload: {},
        occurredAt: STOCK_OUT_AT,
      },
    });

    const active = await prisma.campaign.create({
      data: {
        merchantId,
        source: 'spec_ads',
        externalId: 'c_active',
        name: 'Spring Sale',
        status: 'active',
        dailyBudget: DAILY_SPEND,
      },
    });
    activeCampaignId = active.id;

    // Paused, also targeting the out-of-stock product. Must NOT fire.
    const paused = await prisma.campaign.create({
      data: {
        merchantId,
        source: 'spec_ads',
        externalId: 'c_paused',
        name: 'Winter Clearance',
        status: 'paused',
        dailyBudget: 12,
      },
    });

    await prisma.campaignProduct.createMany({
      data: [
        { campaignId: active.id, productId: hoodie.id },
        { campaignId: paused.id, productId: hoodie.id },
        { campaignId: active.id, productId: tee.id },
      ],
    });

    for (let d = 0; d < DAYS; d++) {
      const date = new Date(STOCK_OUT_AT);
      date.setUTCDate(date.getUTCDate() + d);
      date.setUTCHours(0, 0, 0, 0);
      await prisma.adSpend.createMany({
        data: [
          {
            merchantId,
            campaignId: active.id,
            date,
            spend: DAILY_SPEND,
            clicks: 200,
            conversions: 0,
          },
          {
            merchantId,
            campaignId: paused.id,
            date,
            spend: 12,
            clicks: 5,
            conversions: 0,
          },
        ],
      });
    }

    // Spend from before the stock-out. Must be excluded: the product was
    // buyable then, so that money was not wasted.
    const before = new Date('2026-03-01T00:00:00.000Z');
    await prisma.adSpend.create({
      data: {
        merchantId,
        campaignId: active.id,
        date: before,
        spend: 999,
        clicks: 500,
        conversions: 3,
      },
    });
  });

  afterAll(async () => {
    await prisma.adSpend.deleteMany({ where: { merchantId } });
    await prisma.campaignProduct.deleteMany({
      where: { campaign: { merchantId } },
    });
    await prisma.event.deleteMany({ where: { merchantId } });
    await prisma.campaign.deleteMany({ where: { merchantId } });
    await prisma.product.deleteMany({ where: { merchantId } });
    await prisma.finding.deleteMany({ where: { merchantId } });
    await prisma.merchant.deleteMany({ where: { id: merchantId } });
    await prisma.$disconnect();
  });

  it('fires exactly once: the out-of-stock product on the active campaign', async () => {
    const results = await check.run(merchantId);
    expect(results).toHaveLength(1);
    expect(results[0].dedupeKey).toBe(`${oosProductId}:${activeCampaignId}`);
  });

  it('computes the demo numbers from the seeded rows', async () => {
    const [result] = await check.run(merchantId);
    const evidence = result.evidence as Record<string, unknown>;

    expect(evidence.product_title).toBe('Blue Hoodie');
    expect(evidence.campaign_name).toBe('Spring Sale');
    expect(evidence.days_with_spend).toBe(DAYS);

    // 6 days x $40.50, and nothing from before the stock-out.
    expect(evidence.spend_since_stockout).toBe(243);
    expect(evidence.average_daily_spend).toBe(40.5);
    expect(evidence.clicks_since_stockout).toBe(1200);
    expect(evidence.conversions_since_stockout).toBe(0);

    // The headline: $40.50/day as a weekly run rate. This is the "$284/week"
    // on the demo card, and it is derived here rather than written down.
    expect(result.estimatedCost).toBe(283.5);
    expect(Math.round(result.estimatedCost)).toBe(284);
  });

  it('excludes spend from before the stock-out', async () => {
    const [result] = await check.run(merchantId);
    const evidence = result.evidence as Record<string, unknown>;
    // The $999 pre-stockout row would dominate if the date filter were wrong.
    expect(evidence.spend_since_stockout).toBe(243);
  });

  it('stays silent when the product is back in stock', async () => {
    await prisma.product.update({
      where: { id: oosProductId },
      data: { inventoryQty: 5 },
    });
    await expect(check.run(merchantId)).resolves.toHaveLength(0);
    await prisma.product.update({
      where: { id: oosProductId },
      data: { inventoryQty: 0 },
    });
  });

  it('stays silent once the campaign is paused: this is what stage 6 verifies', async () => {
    await prisma.campaign.update({
      where: { id: activeCampaignId },
      data: { status: 'paused' },
    });
    await expect(check.run(merchantId)).resolves.toHaveLength(0);
    await prisma.campaign.update({
      where: { id: activeCampaignId },
      data: { status: 'active' },
    });
  });
});
