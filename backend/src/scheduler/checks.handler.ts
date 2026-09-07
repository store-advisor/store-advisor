import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ChecksService } from '../checks/checks.service';
import { ExplainService } from '../explain/explain.service';
import {
  RUN_CHECKS_JOB,
  RunChecksJobData,
  SWEEP_JOB,
  runChecksJobId,
} from './queue.constants';
import { CHECKS_QUEUE_TOKEN } from './scheduler.tokens';

/** The part of a BullMQ job this handler reads. */
export interface HandledJob {
  id?: string;
  name: string;
  data: unknown;
}

/**
 * What the worker does when a job arrives. Two job names, one handler.
 *
 * Deliberately separate from the BullMQ `Worker` that calls it: this class
 * needs a database and a queue, but no Redis subscription, no lock renewal
 * and no event loop of its own — so it can be tested by handing it a plain
 * object, which is what checks.handler.spec.ts does.
 *
 * Nothing here knows how a check works. It calls exactly the same
 * ChecksService the CLI calls, which is why `run-checks.cli.ts` was written
 * as a standalone entry point in the first place: the engine did not have to
 * change shape to be scheduled, and it did not.
 */
@Injectable()
export class ChecksHandler {
  private readonly logger = new Logger(ChecksHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly checks: ChecksService,
    private readonly explain: ExplainService,
    @Inject(CHECKS_QUEUE_TOKEN) private readonly queue: Queue,
  ) {}

  async handle(job: HandledJob): Promise<unknown> {
    switch (job.name) {
      case SWEEP_JOB:
        return this.sweep();
      case RUN_CHECKS_JOB:
        return this.runChecks(job.data as RunChecksJobData);
      default:
        // Not thrown: a job name this build does not recognise is almost
        // always a leftover from an older deploy sharing the queue, and
        // failing it would retry it forever.
        this.logger.warn(`Ignoring unknown job "${job.name}" (${job.id}).`);
        return { ignored: job.name };
    }
  }

  /**
   * Fan out: one job per merchant.
   *
   * A fan-out rather than one repeatable schedule per merchant, because
   * merchants are rows, not deployments. Onboarding a merchant must not
   * require registering a schedule, and off-boarding one must not leave an
   * orphaned schedule firing against a merchant that no longer exists.
   *
   * Selects ids only. The sweep does not need a merchant's name, and at the
   * point where this list stops fitting comfortably in memory the fix is a
   * cursor here, not a different architecture.
   */
  private async sweep(): Promise<{ enqueued: number }> {
    const merchants = await this.prisma.merchant.findMany({
      select: { id: true },
    });

    for (const { id } of merchants) {
      await this.queue.add(
        RUN_CHECKS_JOB,
        { merchantId: id } satisfies RunChecksJobData,
        {
          // The deduplication that keeps a slow merchant from stacking up.
          // While a merchant's job is waiting or running this id is taken,
          // so the next sweep's add for that merchant is a no-op; once it
          // completes, removeOnComplete frees the id for the next tick.
          //
          // The engine is idempotent anyway — findings upsert on a dedupe
          // key — so a double run would be wasteful rather than wrong. This
          // makes it neither.
          jobId: runChecksJobId(id),
          removeOnComplete: true,
          removeOnFail: 100,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
        },
      );
    }

    this.logger.log(`Sweep enqueued ${merchants.length} merchant run(s).`);
    return { enqueued: merchants.length };
  }

  /**
   * Exactly what `npm run check:run -- <merchantId>` does, in a worker.
   *
   * Detection first and durably, then explanation as a separate pass, so
   * that the AI service being slow, down or unconfigured cannot change what
   * was detected. That ordering is stage 3's contract rather than a detail
   * of this class; see ExplainService.
   */
  private async runChecks({
    merchantId,
  }: RunChecksJobData): Promise<{ found: number; explained: number }> {
    const found = await this.checks.runAllForMerchant(merchantId);

    // Not wrapped in a try that would swallow it: the findings are already
    // written and re-running is idempotent, so an explanation pass that
    // throws should fail the job and be retried. ExplainService does not
    // throw for the expected failures — no key, service down — it reports
    // them and returns 0.
    const explained = await this.explain.explainPending(merchantId);

    this.logger.log(
      `${merchantId}: ${found} finding(s), ${explained} explained.`,
    );
    return { found, explained };
  }
}
