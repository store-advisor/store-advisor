/// <reference types="jest" />
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

describe('Schema constraints', () => {
  let merchantId: string;

  beforeAll(async () => {
    const merchant = await prisma.merchant.create({
      data: { name: 'Test Merchant' },
    });
    merchantId = merchant.id;
  });

  afterAll(async () => {
    // Scoped to this suite's merchant. These deletes were unfiltered, which
    // emptied the tables outright - including rows belonging to whichever
    // other suite happened to be running at the same time, since Jest runs
    // suites in parallel against one database. That surfaced as a foreign
    // key violation in an unrelated spec, intermittently, depending on which
    // suite finished first.
    await prisma.action.deleteMany({ where: { merchantId } });
    await prisma.finding.deleteMany({ where: { merchantId } });
    await prisma.adSpend.deleteMany({ where: { merchantId } });
    await prisma.campaignProduct.deleteMany({
      where: { campaign: { merchantId } },
    });
    await prisma.campaign.deleteMany({ where: { merchantId } });
    await prisma.product.deleteMany({ where: { merchantId } });
    await prisma.merchant.deleteMany({ where: { id: merchantId } });
    await prisma.$disconnect();
  });

  it('rejects duplicate actions.idempotency_key', async () => {
    const finding = await prisma.finding.create({
      data: {
        merchantId,
        checkId: 'test_check',
        evidence: {},
        estimatedCost: 10,
      },
    });

    await prisma.action.create({
      data: {
        merchantId,
        findingId: finding.id,
        actionType: 'pause_campaign',
        idempotencyKey: 'dup-key-test',
        request: {},
      },
    });

    await expect(
      prisma.action.create({
        data: {
          merchantId,
          findingId: finding.id,
          actionType: 'pause_campaign',
          idempotencyKey: 'dup-key-test',
          request: {},
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects duplicate products for (merchantId, source, externalId)', async () => {
    await prisma.product.create({
      data: {
        merchantId,
        source: 'mock',
        externalId: 'dup-product-1',
        title: 'Test Product',
        price: 10,
        inventoryQty: 5,
        status: 'active',
      },
    });

    await expect(
      prisma.product.create({
        data: {
          merchantId,
          source: 'mock',
          externalId: 'dup-product-1',
          title: 'Duplicate',
          price: 20,
          inventoryQty: 1,
          status: 'active',
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects negative ad spend', async () => {
    const campaign = await prisma.campaign.create({
      data: {
        merchantId,
        source: 'mock',
        externalId: 'check-campaign-1',
        name: 'Test Campaign',
        status: 'active',
        dailyBudget: 50,
      },
    });

    await expect(
      prisma.adSpend.create({
        data: {
          merchantId,
          campaignId: campaign.id,
          date: new Date('2026-01-01'),
          spend: -5,
        },
      }),
    ).rejects.toThrow();
  });
});
