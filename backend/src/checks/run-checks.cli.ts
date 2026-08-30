/**
 * Runs every registered check for a merchant and persists the findings.
 *
 * A standalone entry point rather than an HTTP route: this is the work a
 * scheduler will trigger hourly (HANDBOOK.md section 4, stage 2). Wiring it
 * as a CLI now means the queue can call the same code later without the
 * engine having to change shape.
 *
 *   npm run check:run -- <merchantId>
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ChecksService } from './checks.service';
import { ExplainService } from '../explain/explain.service';

async function main() {
  const merchantId = process.argv[2];
  if (!merchantId) {
    console.error('Usage: npm run check:run -- <merchantId>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const checks = app.get(ChecksService);
    const count = await checks.runAllForMerchant(merchantId);
    console.log(`Persisted ${count} finding(s) for ${merchantId}.`);

    // Stage 3, as a second pass rather than a step inside detection. By the
    // time this runs the findings are already durable, so nothing the AI
    // service does — being slow, being down, being unconfigured — can change
    // what was detected. It also picks up anything a previous run failed to
    // explain, which is the retry.
    const explained = await app.get(ExplainService).explainPending(merchantId);
    console.log(`Explained ${explained} finding(s).`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
