/**
 * The worker process.
 *
 *   npm run start:worker
 *
 * An application *context*, not an HTTP server: this process listens on no
 * port and answers no requests. It connects to Redis, registers the hourly
 * sweep, and consumes what the sweep enqueues.
 *
 * This is the process that makes the proposal's first claim true. Section 5
 * argues the system is scheduled rather than prompted; before this file
 * existed, every finding in the database was there because someone typed a
 * command.
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SchedulerModule } from './scheduler.module';
import { loadSchedulerConfig } from './scheduler.config';

async function bootstrap() {
  const logger = new Logger('Worker');
  const config = loadSchedulerConfig();

  const app = await NestFactory.createApplicationContext(SchedulerModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Without this, a SIGTERM from Docker or Cloud Run kills the process while
  // a job is mid-flight: BullMQ never marks it complete, and it sits stalled
  // until the lock expires. Nest's shutdown hooks close the worker, which
  // waits for the active job to finish first.
  app.enableShutdownHooks();

  logger.log(
    `Worker up. Cron ${config.cron}, concurrency ${config.concurrency}, redis ${redact(config.redisUrl)}.`,
  );
}

/** Never log a Redis URL as given — it may carry a password. */
function redact(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return '<unparseable REDIS_URL>';
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
