import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { CHECKS_QUEUE } from './queue.constants';
import { ChecksHandler } from './checks.handler';
import { SCHEDULER_CONFIG } from './scheduler.tokens';
import type { SchedulerConfig } from './scheduler.config';

/**
 * Owns the BullMQ `Worker`: the Redis subscription, the concurrency, and the
 * shutdown.
 *
 * All it does with a job is hand it to ChecksHandler. Keeping the transport
 * and the work in separate classes is what lets the work be tested without a
 * Redis, and lets this class be read in one screen.
 */
@Injectable()
export class CheckWorkerService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(CheckWorkerService.name);
  private worker?: Worker;

  constructor(
    private readonly handler: ChecksHandler,
    @Inject(SCHEDULER_CONFIG) private readonly config: SchedulerConfig,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      CHECKS_QUEUE,
      (job: Job) => this.handler.handle(job),
      {
        connection: { url: this.config.redisUrl },
        concurrency: this.config.concurrency,
      },
    );

    // BullMQ emits 'error' on connection trouble. Without a listener Node
    // treats it as an unhandled 'error' event and kills the process, so a
    // brief Redis blip would take the worker down instead of being retried.
    this.worker.on('error', (error) => {
      this.logger.error(`Worker error: ${error.message}`, error.stack);
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Job ${job?.name} (${job?.id}) failed on attempt ${job?.attemptsMade}: ${error.message}`,
      );
    });

    this.logger.log(
      `Consuming "${CHECKS_QUEUE}" at concurrency ${this.config.concurrency}.`,
    );
  }

  /**
   * `close()` waits for jobs already running to finish before returning.
   * Without it, a SIGTERM from Docker or Cloud Run kills the process
   * mid-job: BullMQ never marks the job complete and it sits stalled until
   * its lock expires.
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    if (!this.worker) {
      return;
    }
    this.logger.log(`${signal ?? 'shutdown'}: draining in-flight jobs.`);
    await this.worker.close();
  }
}
