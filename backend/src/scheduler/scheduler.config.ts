/**
 * Every knob the scheduler has, resolved from the environment in one place.
 *
 * Read once at boot rather than per job: a worker that changed its cron
 * halfway through a run because someone edited the environment would be
 * impossible to reason about after the fact.
 */

/** Hourly, on the hour. Proposal section 6.1, stage 1. */
export const DEFAULT_CHECK_CRON = '0 * * * *';

export interface SchedulerConfig {
  redisUrl: string;
  cron: string;
  /** How many merchants the worker runs checks for at once. */
  concurrency: number;
  /**
   * Whether this process registers the timed sweep. A worker that only
   * consumes is still useful — several can share the queue — but exactly one
   * schedule should exist, and `upsertJobScheduler` keyed on a constant id
   * makes that true no matter how many register it.
   */
  scheduleEnabled: boolean;
}

export function loadSchedulerConfig(
  env: NodeJS.ProcessEnv = process.env,
): SchedulerConfig {
  return {
    redisUrl: env.REDIS_URL ?? 'redis://localhost:6379',
    cron: env.CHECK_SCHEDULE_CRON ?? DEFAULT_CHECK_CRON,
    concurrency: positiveInt(env.CHECK_CONCURRENCY, 5),
    // Opt-out rather than opt-in: the failure mode of a worker that forgot
    // to schedule is silence, and silence is the one thing this whole
    // feature exists to remove.
    scheduleEnabled: env.SCHEDULER_ENABLED !== 'false',
  };
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
