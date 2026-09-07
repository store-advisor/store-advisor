/// <reference types="jest" />
import { JobsOptions, Queue, RepeatOptions } from 'bullmq';
import { CheckSchedulerService } from './check-scheduler.service';
import { CHECK_SWEEP_SCHEDULER_ID, SWEEP_JOB } from './queue.constants';
import { SchedulerConfig } from './scheduler.config';

/** The shape of an `upsertJobScheduler` call, so its arguments read typed. */
type UpsertCall = [
  id: string,
  repeat: RepeatOptions,
  template: { name: string; opts: JobsOptions },
];

function make(overrides: Partial<SchedulerConfig> = {}) {
  const upsertJobScheduler = jest.fn().mockResolvedValue(undefined);
  const config: SchedulerConfig = {
    redisUrl: 'redis://localhost:6379',
    cron: '0 * * * *',
    concurrency: 5,
    scheduleEnabled: true,
    ...overrides,
  };
  const service = new CheckSchedulerService(
    { upsertJobScheduler } as unknown as Queue,
    config,
  );
  const calls = () => upsertJobScheduler.mock.calls as unknown as UpsertCall[];

  return { upsertJobScheduler, calls, service };
}

describe('CheckSchedulerService', () => {
  it('registers the sweep on a constant id so restarts do not multiply it', async () => {
    const { upsertJobScheduler, calls, service } = make({
      cron: '*/10 * * * *',
    });

    await service.onApplicationBootstrap();

    expect(upsertJobScheduler).toHaveBeenCalledTimes(1);
    const [id, repeat, template] = calls()[0];
    expect(id).toBe(CHECK_SWEEP_SCHEDULER_ID);
    expect(repeat).toEqual({ pattern: '*/10 * * * *' });
    expect(template.name).toBe(SWEEP_JOB);
  });

  // Upsert is the whole guarantee. Booting the worker twice — a redeploy, a
  // crash loop, two replicas — must leave one schedule, not one per boot.
  it('uses the same id on every boot', async () => {
    const { calls, service } = make();

    await service.onApplicationBootstrap();
    await service.onApplicationBootstrap();

    expect(calls().map(([id]) => id)).toEqual([
      CHECK_SWEEP_SCHEDULER_ID,
      CHECK_SWEEP_SCHEDULER_ID,
    ]);
  });

  // A sweep retried after failing would fan out against a merchant list read
  // minutes ago. The next tick is the retry.
  it('does not retry the sweep', async () => {
    const { calls, service } = make();

    await service.onApplicationBootstrap();

    expect(calls()[0][2].opts.attempts).toBe(1);
  });

  it('registers nothing when the schedule is disabled', async () => {
    const { upsertJobScheduler, service } = make({ scheduleEnabled: false });

    await service.onApplicationBootstrap();

    expect(upsertJobScheduler).not.toHaveBeenCalled();
  });
});
