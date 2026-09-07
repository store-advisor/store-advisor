/**
 * The names the producer and the consumer both have to agree on.
 *
 * Kept in one file with no imports so that changing a queue or job name is a
 * single edit that cannot leave the two halves disagreeing — a mismatch here
 * does not fail to compile, it just silently never runs the job.
 */

/** The only queue in the system. */
export const CHECKS_QUEUE = 'checks';

/**
 * The timed job. One instance exists, owned by BullMQ's scheduler, and its
 * whole responsibility is to fan out: enumerate merchants and enqueue one
 * RUN_CHECKS_JOB for each.
 *
 * Why a fan-out rather than one repeatable job per merchant: merchants are
 * rows, not deployments. Onboarding a merchant must not require registering
 * a schedule, and off-boarding one must not leave an orphaned schedule
 * firing against a merchant that no longer exists.
 */
export const SWEEP_JOB = 'sweep';

/** The real work: run every check for one merchant, then explain what fired. */
export const RUN_CHECKS_JOB = 'run_checks';

export interface RunChecksJobData {
  merchantId: string;
}

/**
 * The BullMQ job id for a merchant's run, and the deduplication that keeps a
 * slow merchant from stacking up: while this id exists in the queue, another
 * add for the same merchant is a no-op.
 *
 * Separated by `-`, not `:`. BullMQ rejects a custom id containing a colon
 * because it is the separator in its own Redis keys — a constraint that only
 * shows up against a real Redis, which is why scheduler.integration.spec.ts
 * exists.
 */
export function runChecksJobId(merchantId: string): string {
  return `${RUN_CHECKS_JOB}-${merchantId}`;
}

/**
 * The scheduler's id. Passed to `upsertJobScheduler`, which is an upsert on
 * exactly this string — so a redeploy with a changed cron replaces the
 * schedule instead of adding a second one beside it.
 */
export const CHECK_SWEEP_SCHEDULER_ID = 'hourly-check-sweep';
