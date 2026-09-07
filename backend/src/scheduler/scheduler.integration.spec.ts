/// <reference types="jest" />
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Job, Queue, Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ChecksService } from '../checks/checks.service';
import { AdSpendOnOosCheck } from '../checks/ad-spend-on-oos.check';
import { ExplainService } from '../explain/explain.service';
import { CheckSchedulerService } from './check-scheduler.service';
import { ChecksHandler } from './checks.handler';
import {
  CHECK_SWEEP_SCHEDULER_ID,
  RUN_CHECKS_JOB,
  SWEEP_JOB,
  runChecksJobId,
} from './queue.constants';
import { loadSchedulerConfig } from './scheduler.config';

/**
 * The scheduler against a real Redis and a real Postgres.
 *
 * This is the proof of the first of the two properties section 5 of the
 * proposal claims: the system is *scheduled rather than prompted*. Mocking
 * BullMQ here would assert that we call a library correctly, which is not
 * the claim. The claim is that a timer fires and a finding appears with
 * nobody typing anything, and only Redis can demonstrate that.
 *
 * The suite runs on its own queue name. `sweep()` is deliberately global —
 * it checks every merchant in the database — so letting a worker consume a
 * real sweep here would run checks against the fixtures the other
 * integration suites are mid-assertion on. The seam is therefore: the timer
 * and the fan-out are exercised with no worker attached, and the worker is
 * exercised on a job scoped to this suite's own merchant.
 */
describe('Scheduler (integration)', () => {
  const merchantId = 'scheduler_spec_merchant';
  // A queue name unique to the run, so that a developer's own worker — or a
  // previous run's leftovers — cannot consume these jobs.
  const queueName = `checks_spec_${process.pid}_${Date.now()}`;
  const connection = { url: loadSchedulerConfig().redisUrl };

  const HOOK_TIMEOUT_MS = 30_000;
  const STOCK_OUT_AT = new Date('2026-03-04T09:12:00.000Z');
  const DAILY_SPEND = 40.5;
  const DAYS = 6;

  let prisma: PrismaClient;
  let queue: Queue;
  let handler: ChecksHandler;
  let worker: Worker | undefined;

  beforeAll(async () => {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });
    await cleanupDb();

    const asService = prisma as unknown as PrismaService;
    queue = new Queue(queueName, { connection });

    handler = new ChecksHandler(
      asService,
      new ChecksService(asService, [new AdSpendOnOosCheck(asService)]),
      // An explainer that reports itself unavailable — the same path a
      // deployment with no ANTHROPIC_API_KEY takes. Stage 3 is not what this
      // suite proves, and a real model call would make it slow and
      // non-deterministic.
      new ExplainService(asService, {
        available: false,
        explain: jest.fn(),
      }),
      queue,
    );

    // The leak: an out-of-stock product with a live campaign still spending
    // on it. The same fixture the demo tells, so the figure asserted at the
    // bottom of this file is the figure on the demo card.
    const merchant = await prisma.merchant.create({
      data: { id: merchantId, name: 'Scheduler Spec Merchant' },
    });

    const hoodie = await prisma.product.create({
      data: {
        merchantId: merchant.id,
        source: 'spec_store',
        externalId: 'p_hoodie',
        title: 'Blue Hoodie',
        price: 59,
        inventoryQty: 0,
        status: 'active',
      },
    });

    await prisma.event.create({
      data: {
        merchantId: merchant.id,
        source: 'spec_store',
        entityType: 'product',
        entityId: hoodie.id,
        eventType: 'stock_out',
        payload: {},
        occurredAt: STOCK_OUT_AT,
      },
    });

    const campaign = await prisma.campaign.create({
      data: {
        merchantId: merchant.id,
        source: 'spec_ads',
        externalId: 'c_spring_sale',
        name: 'Spring Sale',
        status: 'active',
        dailyBudget: DAILY_SPEND,
      },
    });

    await prisma.campaignProduct.create({
      data: { campaignId: campaign.id, productId: hoodie.id },
    });

    for (let d = 0; d < DAYS; d++) {
      const date = new Date(STOCK_OUT_AT);
      date.setUTCDate(date.getUTCDate() + d);
      date.setUTCHours(0, 0, 0, 0);
      await prisma.adSpend.create({
        data: {
          merchantId: merchant.id,
          campaignId: campaign.id,
          date,
          spend: DAILY_SPEND,
          clicks: 200,
          conversions: 0,
        },
      });
    }
  }, HOOK_TIMEOUT_MS);

  afterAll(async () => {
    await worker?.close();
    // obliterate rather than close alone: the queue name is unique to this
    // run, so leaving its keys behind would grow Redis by one dead queue per
    // run forever.
    await queue.obliterate({ force: true });
    await queue.close();
    await cleanupDb();
    await prisma.$disconnect();
  }, HOOK_TIMEOUT_MS);

  async function cleanupDb() {
    await prisma.adSpend.deleteMany({ where: { merchantId } });
    await prisma.campaignProduct.deleteMany({
      where: { campaign: { merchantId } },
    });
    await prisma.event.deleteMany({ where: { merchantId } });
    await prisma.campaign.deleteMany({ where: { merchantId } });
    await prisma.product.deleteMany({ where: { merchantId } });
    await prisma.finding.deleteMany({ where: { merchantId } });
    await prisma.merchant.deleteMany({ where: { id: merchantId } });
  }

  async function waitFor<T>(
    what: string,
    probe: () => Promise<T | undefined>,
    timeoutMs = 15_000,
  ): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const value = await probe();
      if (value !== undefined) {
        return value;
      }
      if (Date.now() > deadline) {
        throw new Error(`Timed out after ${timeoutMs}ms waiting for ${what}.`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  function schedulerWith(cron: string) {
    return new CheckSchedulerService(queue, {
      ...loadSchedulerConfig(),
      cron,
      scheduleEnabled: true,
    });
  }

  describe('the timer', () => {
    afterEach(async () => {
      // A per-second schedule left running would keep producing jobs into
      // the tests below and make their queue assertions meaningless.
      await queue.removeJobScheduler(CHECK_SWEEP_SCHEDULER_ID).catch(() => {});
      await queue.drain(true);
    });

    // The whole contribution, reduced to one assertion: a job appears that
    // nobody enqueued.
    it('produces a sweep job on its own, with no caller', async () => {
      // Six fields, because BullMQ reads seconds when they are given. Hourly
      // is the production cadence; waiting an hour is not a test.
      await schedulerWith('*/1 * * * * *').onApplicationBootstrap();

      const produced = await waitFor('a sweep job to be produced', async () => {
        const jobs = await queue.getJobs(['waiting', 'delayed', 'prioritized']);
        return jobs.find((job) => job.name === SWEEP_JOB);
      });

      expect(produced.name).toBe(SWEEP_JOB);
      // No request, no CLI and no test enqueued this. BullMQ's scheduler put
      // it there, which is what "speaks without being asked" means.
      expect(produced.opts.repeat).toBeDefined();
    }, 30_000);

    it('registers one schedule however many times it boots', async () => {
      const scheduler = schedulerWith('*/1 * * * * *');

      await scheduler.register();
      await scheduler.register();
      await scheduler.register();

      const ids = (await queue.getJobSchedulers()).map((s) => s.key ?? s.id);
      expect(ids.filter((id) => id === CHECK_SWEEP_SCHEDULER_ID)).toHaveLength(
        1,
      );
    }, 30_000);
  });

  describe('the fan-out', () => {
    beforeEach(async () => {
      await queue.drain(true);
    });

    it('enqueues a run for this merchant, keyed so a second sweep cannot stack it', async () => {
      await handler.handle({ name: SWEEP_JOB, data: {} });
      await handler.handle({ name: SWEEP_JOB, data: {} });

      const waiting = await queue.getJobs(['waiting', 'delayed']);
      const mine = waiting.filter(
        (job) =>
          job.name === RUN_CHECKS_JOB &&
          (job.data as { merchantId: string }).merchantId === merchantId,
      );

      // Two sweeps, one job: the second add hit an id that was already
      // taken. That is the guarantee a slow merchant cannot stack up.
      expect(mine).toHaveLength(1);
      expect(mine[0].id).toBe(runChecksJobId(merchantId));
    }, 30_000);
  });

  describe('the full chain', () => {
    // Real Redis, real worker, real check, real database. The only thing
    // scoped down is which merchant the job names.
    it('turns a queued job into a persisted finding with the demo numbers', async () => {
      // obliterate, not drain: this is the only test that attaches a worker,
      // and a sweep job surviving from the tests above would fan out across
      // every merchant in the database — including the fixtures the other
      // integration suites are mid-assertion on. drain leaves active and
      // completed jobs behind; obliterate leaves nothing.
      await queue.obliterate({ force: true });
      expect(await prisma.finding.count({ where: { merchantId } })).toBe(0);

      worker = new Worker(queueName, (job: Job) => handler.handle(job), {
        connection,
        concurrency: 1,
      });

      await queue.add(RUN_CHECKS_JOB, { merchantId });

      const finding = await waitFor(
        'the finding to be written',
        async () =>
          (await prisma.finding.findFirst({ where: { merchantId } })) ??
          undefined,
      );

      expect(finding.checkId).toBe('ad_spend_on_oos');
      expect(finding.status).toBe('OPEN');
      // 6 days x $40.50 as a weekly run rate: the "$284/week" on the demo
      // card, computed by the check from ad_spend rows rather than written
      // down here.
      expect(Number(finding.estimatedCost)).toBe(283.5);
      // The golden rule, visible in the row: nothing invented an
      // explanation, because no explainer was available.
      expect(finding.llmExplanation).toBeNull();
    }, 45_000);
  });
});
