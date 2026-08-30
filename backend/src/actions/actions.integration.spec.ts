/// <reference types="jest" />
import { PrismaClient, ActionStatus, FindingStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ActionsService } from './actions.service';
import { DemoAdPlatform } from './demo-ad-platform';
import { AdSpendOnOosCheck } from '../checks/ad-spend-on-oos.check';
import { ChecksService } from '../checks/checks.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Stages 5 and 6 against a real database.
 *
 * The idempotency guarantee is a UNIQUE constraint and the verification pass
 * is a SQL query. Neither exists anywhere a mock could observe them.
 */
describe('Actions: approve, execute, verify (integration)', () => {
  let prisma: PrismaClient;
  let actions: ActionsService;
  let checks: ChecksService;

  const merchantId = 'actions_spec_merchant';
  // This hook makes a dozen sequential round-trips to a real database.
  // Jest's 5s default is a unit-test budget, and exceeding it here fails a
  // suite that is working, just slowly - on a loaded CI runner or a laptop
  // running several suites at once.
  const HOOK_TIMEOUT_MS = 30_000;
  const STOCK_OUT_AT = new Date('2026-03-04T09:12:00.000Z');

  let productId: string;
  let campaignId: string;

  beforeAll(async () => {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });
    await cleanup();
    const asService = prisma as unknown as PrismaService;

    actions = new ActionsService(asService, [new DemoAdPlatform(asService)]);
    checks = new ChecksService(asService, [new AdSpendOnOosCheck(asService)]);

    await prisma.merchant.create({
      data: { id: merchantId, name: 'Actions Spec Merchant' },
    });

    const product = await prisma.product.create({
      data: {
        merchantId,
        source: 'demo_store',
        externalId: 'p_hoodie',
        title: 'Blue Hoodie',
        price: 59,
        inventoryQty: 0,
        status: 'active',
      },
    });
    productId = product.id;

    await prisma.event.create({
      data: {
        merchantId,
        source: 'demo_store',
        entityType: 'product',
        entityId: product.id,
        eventType: 'stock_out',
        payload: {},
        occurredAt: STOCK_OUT_AT,
      },
    });

    const campaign = await prisma.campaign.create({
      data: {
        merchantId,
        source: 'demo_ads',
        externalId: 'c_spring_sale_actions',
        name: 'Spring Sale',
        status: 'active',
        dailyBudget: 40.5,
      },
    });
    campaignId = campaign.id;

    await prisma.campaignProduct.create({
      data: { campaignId: campaign.id, productId: product.id },
    });

    for (let d = 0; d < 6; d++) {
      const date = new Date(STOCK_OUT_AT);
      date.setUTCDate(date.getUTCDate() + d);
      date.setUTCHours(0, 0, 0, 0);
      await prisma.adSpend.create({
        data: {
          merchantId,
          campaignId: campaign.id,
          date,
          spend: 40.5,
          clicks: 200,
          conversions: 0,
        },
      });
    }
  }, HOOK_TIMEOUT_MS);

  /**
   * Ordered by foreign key, children first.
   *
   * Called before seeding as well as after, so a run that died partway
   * through - a timeout, a killed process - does not leave rows that make
   * every later run fail on a duplicate key. One flake should stay one flake
   * rather than turning the suite permanently red.
   */
  async function cleanup() {
    await prisma.action.deleteMany({ where: { merchantId } });
    await prisma.finding.deleteMany({ where: { merchantId } });
    await prisma.adSpend.deleteMany({ where: { merchantId } });
    await prisma.campaignProduct.deleteMany({
      where: { campaign: { merchantId } },
    });
    await prisma.event.deleteMany({ where: { merchantId } });
    await prisma.campaign.deleteMany({ where: { merchantId } });
    await prisma.product.deleteMany({ where: { merchantId } });
    await prisma.merchant.deleteMany({ where: { id: merchantId } });
  }

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  }, HOOK_TIMEOUT_MS);

  function findingForCheck() {
    return prisma.finding.findFirstOrThrow({
      where: { merchantId, checkId: 'ad_spend_on_oos' },
    });
  }

  it('the check produces an open finding to act on', async () => {
    await checks.runAllForMerchant(merchantId);
    const finding = await findingForCheck();
    expect(finding.status).toBe(FindingStatus.OPEN);
    expect(Number(finding.estimatedCost)).toBe(283.5);
  });

  it('approving pauses the campaign and records the response', async () => {
    const finding = await findingForCheck();
    const result = await actions.approve(finding.id, 'key-first-approval');

    expect(result.status).toBe(ActionStatus.SUCCEEDED);
    expect(result.replayed).toBe(false);

    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    });
    expect(campaign.status).toBe('paused');

    const action = await prisma.action.findUniqueOrThrow({
      where: { id: result.id },
    });
    expect(action.actionType).toBe('pause_campaign');
    expect(action.executedAt).not.toBeNull();
    expect(action.response).toMatchObject({ status: 'paused' });
  });

  it('a repeated request with the same key does not act twice', async () => {
    const finding = await findingForCheck();
    const replay = await actions.approve(finding.id, 'key-first-approval');

    expect(replay.replayed).toBe(true);
    expect(replay.status).toBe(ActionStatus.SUCCEEDED);

    // The guarantee that matters: one effect, one row. A merchant who
    // double-taps must not pay for two pauses.
    const count = await prisma.action.count({
      where: { idempotencyKey: 'key-first-approval' },
    });
    expect(count).toBe(1);
  });

  it('stage 6: the next check run marks the finding fixed', async () => {
    // Nothing here tells the engine the problem is solved. It re-runs the
    // same query, the paused campaign no longer matches, and the finding
    // closes itself. That is the difference between an agent and a dashboard.
    await checks.runAllForMerchant(merchantId);

    const finding = await findingForCheck();
    expect(finding.status).toBe(FindingStatus.FIXED);
    // The figure survives: it is what we claim to have saved.
    expect(Number(finding.estimatedCost)).toBe(283.5);
  });

  it('a dismissed finding is not reopened or closed by a later run', async () => {
    const dismissed = await prisma.finding.create({
      data: {
        merchantId,
        checkId: 'ad_spend_on_oos',
        status: FindingStatus.DISMISSED,
        evidence: { dedupe_key: 'gone:forever' },
        estimatedCost: 10,
      },
    });

    await checks.runAllForMerchant(merchantId);

    const after = await prisma.finding.findUniqueOrThrow({
      where: { id: dismissed.id },
    });
    expect(after.status).toBe(FindingStatus.DISMISSED);
  });

  it('rejects an approval for a finding that names no campaign', async () => {
    const orphan = await prisma.finding.create({
      data: {
        merchantId,
        checkId: 'some_future_check',
        status: FindingStatus.OPEN,
        evidence: { note: 'no campaign here' },
        estimatedCost: 5,
      },
    });

    await expect(
      actions.approve(orphan.id, 'key-orphan-finding'),
    ).rejects.toThrow(/no campaign/i);
  });

  it('rejects an approval for a finding that does not exist', async () => {
    await expect(
      actions.approve('does-not-exist', 'key-missing-finding'),
    ).rejects.toThrow(/No finding/);
  });

  it('pausing an already-paused campaign still succeeds', async () => {
    // The campaign was paused by an earlier test. A second, differently keyed
    // approval must not error: the merchant asked for it paused, and it is.
    const finding = await prisma.finding.create({
      data: {
        merchantId,
        checkId: 'ad_spend_on_oos',
        status: FindingStatus.OPEN,
        evidence: {
          dedupe_key: `${productId}:${campaignId}`,
          campaign_id: campaignId,
        },
        estimatedCost: 100,
      },
    });

    const result = await actions.approve(finding.id, 'key-second-pause');
    expect(result.status).toBe(ActionStatus.SUCCEEDED);
  });

  /**
   * Two merchants, deliberately colliding.
   *
   * Everything above runs as a single tenant, which is exactly why both bugs
   * these tests cover survived: with one merchant in the database, an
   * unscoped lookup and a scoped one return the same row. The collisions
   * below are the cheapest thing that tells them apart.
   */
  describe('tenant isolation', () => {
    // The same external id on both sides. Real platforms hand out ids that
    // are unique within an account, not across our whole database.
    const SHARED_EXTERNAL_ID = 'c_shared_external_id';
    const merchantA = 'isolation_merchant_a';
    const merchantB = 'isolation_merchant_b';

    let campaignA: string;
    let campaignB: string;
    let findingA: string;
    let findingB: string;

    async function seedMerchant(id: string) {
      await prisma.merchant.create({ data: { id, name: `Merchant ${id}` } });
      const campaign = await prisma.campaign.create({
        data: {
          merchantId: id,
          source: 'demo_ads',
          externalId: SHARED_EXTERNAL_ID,
          name: 'Spring Sale',
          status: 'active',
          dailyBudget: 40.5,
        },
      });
      const finding = await prisma.finding.create({
        data: {
          merchantId: id,
          checkId: 'ad_spend_on_oos',
          status: FindingStatus.OPEN,
          evidence: { campaign_id: campaign.id, dedupe_key: `x:${id}` },
          estimatedCost: 100,
        },
      });
      return { campaignId: campaign.id, findingId: finding.id };
    }

    beforeAll(async () => {
      ({ campaignId: campaignA, findingId: findingA } =
        await seedMerchant(merchantA));
      ({ campaignId: campaignB, findingId: findingB } =
        await seedMerchant(merchantB));
    });

    afterAll(async () => {
      const both = { in: [merchantA, merchantB] };
      await prisma.action.deleteMany({ where: { merchantId: both } });
      await prisma.finding.deleteMany({ where: { merchantId: both } });
      await prisma.campaign.deleteMany({ where: { merchantId: both } });
      await prisma.merchant.deleteMany({ where: { id: both } });
    });

    it('pauses only the approving merchant’s campaign', async () => {
      const result = await actions.approve(findingB, 'key-isolation-b');
      expect(result.status).toBe(ActionStatus.SUCCEEDED);

      const b = await prisma.campaign.findUniqueOrThrow({
        where: { id: campaignB },
      });
      expect(b.status).toBe('paused');

      // The one that matters. Resolving the campaign on (source, externalId)
      // alone would have found A's row first and paused a campaign nobody
      // approved.
      const a = await prisma.campaign.findUniqueOrThrow({
        where: { id: campaignA },
      });
      expect(a.status).toBe('active');
    });

    it('does not let one merchant’s idempotency key block another’s', async () => {
      // Keys are caller-supplied, so a collision needs no bad faith: two
      // clients numbering their requests from one is enough.
      const shared = 'key-both-merchants-picked-this';

      const first = await actions.approve(findingA, shared);
      expect(first.replayed).toBe(false);
      expect(first.status).toBe(ActionStatus.SUCCEEDED);

      const second = await actions.approve(findingB, shared);
      expect(second.replayed).toBe(false);
      expect(second.id).not.toBe(first.id);

      // Each merchant gets their own row under the same key, and A's action
      // is not handed back to B.
      const rows = await prisma.action.findMany({
        where: { idempotencyKey: shared },
        orderBy: { merchantId: 'asc' },
      });
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.merchantId)).toEqual([merchantA, merchantB]);
    });

    it('still replays a repeat from the same merchant', async () => {
      // Scoping the key must not weaken the actual guarantee it exists for.
      const key = 'key-isolation-double-tap';
      const first = await actions.approve(findingA, key);
      const again = await actions.approve(findingA, key);

      expect(again.replayed).toBe(true);
      expect(again.id).toBe(first.id);

      const count = await prisma.action.count({
        where: { merchantId: merchantA, idempotencyKey: key },
      });
      expect(count).toBe(1);
    });
  });
});
