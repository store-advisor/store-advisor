import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Schema constraints', () => {
  let merchantId: string;

  beforeAll(async () => {
    const merchant = await prisma.merchant.create({
      data: { name: 'Test Merchant' },
    });
    merchantId = merchant.id;
  });

  afterAll(async () => {
    await prisma.action.deleteMany({});
    await prisma.finding.deleteMany({});
    await prisma.adSpend.deleteMany({});
    await prisma.campaignProduct.deleteMany({});
    await prisma.campaign.deleteMany({});
    await prisma.product.deleteMany({});
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
