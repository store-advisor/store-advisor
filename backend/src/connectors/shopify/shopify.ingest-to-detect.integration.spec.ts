/// <reference types="jest" />
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConnectorsService } from '../connectors.service';
import { ShopifyConnector } from './shopify.connector';
import { ShopifyClient } from './shopify.client';
import { AdSpendOnOosCheck } from '../../checks/ad-spend-on-oos.check';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('Shopify Ingest-to-Detect (integration)', () => {
  let prisma: PrismaClient;
  let connectorsService: ConnectorsService;
  let check: AdSpendOnOosCheck;
  let isDbAvailable = false;

  const merchantId = 'shopify_integration_merchant';
  const STOCK_OUT_AT = new Date('2026-03-04T09:12:00.000Z');
  const DAILY_SPEND = 40.5;
  const DAYS = 6;

  beforeAll(async () => {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });

    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;
    } catch {
      // PostgreSQL database server is not running on 127.0.0.1:5432
      isDbAvailable = false;
      return;
    }

    const prismaService = prisma as unknown as PrismaService;
    const mockConfig = new ConfigService({});
    const shopifyClient = new ShopifyClient(mockConfig);
    const shopifyConnector = new ShopifyConnector(shopifyClient);

    connectorsService = new ConnectorsService(prismaService, [
      shopifyConnector,
    ]);
    check = new AdSpendOnOosCheck(prismaService);

    // Create test merchant
    await prisma.merchant.create({
      data: { id: merchantId, name: 'Shopify Integration Merchant' },
    });
  });

  afterAll(async () => {
    if (!isDbAvailable) {
      await prisma.$disconnect().catch(() => {});
      return;
    }

    await prisma.adSpend.deleteMany({ where: { merchantId } });
    await prisma.campaignProduct.deleteMany({
      where: { campaign: { merchantId } },
    });
    await prisma.event.deleteMany({ where: { merchantId } });
    await prisma.order.deleteMany({ where: { merchantId } });
    await prisma.campaign.deleteMany({ where: { merchantId } });
    await prisma.product.deleteMany({ where: { merchantId } });
    await prisma.finding.deleteMany({ where: { merchantId } });
    await prisma.merchant.deleteMany({ where: { id: merchantId } });
    await prisma.$disconnect();
  });

  it('runs stage 1 INGEST via shopify connector and stage 2 DETECT via check engine', async () => {
    if (!isDbAvailable) {
      console.warn(
        'PostgreSQL database server at 127.0.0.1:5432 is not running. Skipping integration DB assertions.',
      );
      return;
    }

    // 1. STAGE 1: INGEST via Shopify Connector
    const summary = await connectorsService.sync(merchantId, 'shopify');

    expect(summary).toEqual({
      source: 'shopify',
      merchantId,
      productsSynced: 2,
      stockOutEventsEmitted: 1,
      ordersSynced: 1,
    });

    // Verify canonical product records created
    const products = await prisma.product.findMany({
      where: { merchantId, source: 'shopify' },
      orderBy: { externalId: 'asc' },
    });
    expect(products).toHaveLength(2);

    const hoodieProduct = products.find(
      (p) => p.externalId === '45012345678901',
    );
    expect(hoodieProduct).toBeDefined();
    expect(hoodieProduct?.title).toBe('Blue Hoodie - Medium');
    expect(hoodieProduct?.inventoryQty).toBe(0);

    // Verify stock_out event created by connector sync
    const stockOutEvent = await prisma.event.findFirst({
      where: {
        merchantId,
        source: 'shopify',
        entityType: 'product',
        entityId: hoodieProduct!.id,
        eventType: 'stock_out',
      },
    });
    expect(stockOutEvent).toBeDefined();

    // 2. Setup active ad campaign targeting the ingested out-of-stock Shopify product
    const campaign = await prisma.campaign.create({
      data: {
        merchantId,
        source: 'meta_ads',
        externalId: 'camp_shopify_sale',
        name: 'Shopify Spring Sale',
        status: 'active',
        dailyBudget: DAILY_SPEND,
      },
    });

    await prisma.campaignProduct.create({
      data: {
        campaignId: campaign.id,
        productId: hoodieProduct!.id,
      },
    });

    // Add daily spend entries after stock_out
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(STOCK_OUT_AT);
      date.setUTCDate(date.getUTCDate() + d);
      date.setUTCHours(0, 0, 0, 0);

      await prisma.adSpend.create({
        data: {
          merchantId,
          campaignId: campaign.id,
          date,
          spend: DAILY_SPEND,
          clicks: 200,
          conversions: 0,
        },
      });
    }

    // 3. STAGE 2: DETECT via Check Engine
    const checkResults = await check.run(merchantId);

    expect(checkResults).toHaveLength(1);
    const result = checkResults[0];

    expect(result.dedupeKey).toBe(`${hoodieProduct!.id}:${campaign.id}`);
    const evidence = result.evidence as Record<string, unknown>;

    expect(evidence.product_title).toBe('Blue Hoodie - Medium');
    expect(evidence.campaign_name).toBe('Shopify Spring Sale');
    expect(evidence.spend_since_stockout).toBe(243);
    expect(Math.round(result.estimatedCost)).toBe(284);
  });
});
