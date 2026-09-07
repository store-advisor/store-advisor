import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { ChecksModule } from '../checks/checks.module';
import { ExplainModule } from '../explain/explain.module';
import { CHECKS_QUEUE } from './queue.constants';
import { CheckSchedulerService } from './check-scheduler.service';
import { CheckWorkerService } from './check-worker.service';
import { ChecksHandler } from './checks.handler';
import { loadSchedulerConfig } from './scheduler.config';
import { CHECKS_QUEUE_TOKEN, SCHEDULER_CONFIG } from './scheduler.tokens';
import type { SchedulerConfig } from './scheduler.config';

/**
 * Stage 1's timer and stage 2's consumer.
 *
 * Deliberately NOT imported by AppModule. The API process serves HTTP and
 * must not also process jobs: a slow check run would compete with request
 * handling for the same event loop, and scaling the API for traffic would
 * silently scale the number of check workers with it. They are separate
 * processes because they have separate reasons to scale.
 *
 * Entry point: `npm run start:worker` (src/scheduler/worker.main.ts).
 */
@Module({
  imports: [
    // This process has its own composition root, so it needs its own global
    // config: ExplainModule's AiExplainClient injects ConfigService, and
    // AppModule is the only other place that registers it. Without this the
    // worker fails dependency resolution at boot rather than at the first
    // job, which is at least the good kind of failure — but it fails.
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ChecksModule,
    ExplainModule,
  ],
  providers: [
    { provide: SCHEDULER_CONFIG, useFactory: () => loadSchedulerConfig() },
    {
      provide: CHECKS_QUEUE_TOKEN,
      inject: [SCHEDULER_CONFIG],
      useFactory: (config: SchedulerConfig) =>
        new Queue(CHECKS_QUEUE, {
          connection: { url: config.redisUrl },
          defaultJobOptions: {
            // Bounded history. Without a cap Redis keeps every completed job
            // forever, and an hourly sweep across a growing merchant list is
            // exactly the shape that quietly fills a disk.
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        }),
    },
    ChecksHandler,
    CheckSchedulerService,
    CheckWorkerService,
  ],
  exports: [CheckSchedulerService, CHECKS_QUEUE_TOKEN],
})
export class SchedulerModule implements OnApplicationShutdown {
  // A factory provider gets no lifecycle hooks of its own, so the module
  // closes the queue. Left open, its Redis connection keeps the event loop
  // alive and the process never exits.
  constructor(@Inject(CHECKS_QUEUE_TOKEN) private readonly queue: Queue) {}

  async onApplicationShutdown(): Promise<void> {
    await this.queue.close();
  }
}
