import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { CHECK_SWEEP_SCHEDULER_ID, SWEEP_JOB } from './queue.constants';
import { CHECKS_QUEUE_TOKEN, SCHEDULER_CONFIG } from './scheduler.tokens';
// `import type`, as in actions.controller.ts and explain.service.ts:
// isolatedModules with emitDecoratorMetadata rejects a value import used
// only as a type in a decorated constructor signature.
import type { SchedulerConfig } from './scheduler.config';

/**
 * Registers the timed sweep.
 *
 * This is the smallest piece of the scheduler and the one the proposal is
 * actually about. Section 5 claims the system is *scheduled rather than
 * prompted*: until this class ran, every finding in the database existed
 * because a person typed `npm run check:run`. A merchant cannot be told
 * about a problem they never thought to ask about by a system that only
 * speaks when asked.
 */
@Injectable()
export class CheckSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CheckSchedulerService.name);

  constructor(
    @Inject(CHECKS_QUEUE_TOKEN) private readonly queue: Queue,
    @Inject(SCHEDULER_CONFIG) private readonly config: SchedulerConfig,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.scheduleEnabled) {
      this.logger.warn(
        'SCHEDULER_ENABLED=false — this process consumes jobs but registers no schedule.',
      );
      return;
    }

    await this.register();
  }

  /**
   * Upsert, not add. Keyed on a constant id, so restarting the worker
   * twenty times leaves one schedule, and changing CHECK_SCHEDULE_CRON
   * replaces the old one rather than running both.
   */
  async register(): Promise<void> {
    await this.queue.upsertJobScheduler(
      CHECK_SWEEP_SCHEDULER_ID,
      { pattern: this.config.cron },
      {
        name: SWEEP_JOB,
        opts: {
          // A sweep that failed is not worth replaying: the next tick is
          // along shortly and will read the merchant list fresh. Retrying a
          // stale sweep would fan out against a list that has since changed.
          attempts: 1,
          removeOnComplete: 50,
          removeOnFail: 50,
        },
      },
    );

    this.logger.log(
      `Check sweep scheduled: ${this.config.cron} (id ${CHECK_SWEEP_SCHEDULER_ID}).`,
    );
  }
}
