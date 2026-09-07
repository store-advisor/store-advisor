/// <reference types="jest" />
import { DEFAULT_CHECK_CRON, loadSchedulerConfig } from './scheduler.config';

describe('loadSchedulerConfig', () => {
  it('falls back to local defaults when nothing is set', () => {
    const config = loadSchedulerConfig({});

    expect(config.redisUrl).toBe('redis://localhost:6379');
    expect(config.cron).toBe(DEFAULT_CHECK_CRON);
    expect(config.concurrency).toBe(5);
    expect(config.scheduleEnabled).toBe(true);
  });

  it('reads every value from the environment', () => {
    const config = loadSchedulerConfig({
      REDIS_URL: 'redis://cache:6380/2',
      CHECK_SCHEDULE_CRON: '*/5 * * * *',
      CHECK_CONCURRENCY: '12',
      SCHEDULER_ENABLED: 'false',
    });

    expect(config.redisUrl).toBe('redis://cache:6380/2');
    expect(config.cron).toBe('*/5 * * * *');
    expect(config.concurrency).toBe(12);
    expect(config.scheduleEnabled).toBe(false);
  });

  // A worker that silently ran at concurrency NaN would accept no jobs at
  // all, which looks exactly like "the schedule never fired".
  it.each(['0', '-1', 'many', '2.5', ''])(
    'ignores the nonsense concurrency %p and uses the default',
    (raw) => {
      expect(loadSchedulerConfig({ CHECK_CONCURRENCY: raw }).concurrency).toBe(
        5,
      );
    },
  );

  // Opt-out, not opt-in: only the exact string disables the schedule.
  it.each(['true', 'TRUE', '1', 'no', ''])(
    'leaves the schedule enabled for SCHEDULER_ENABLED=%p',
    (raw) => {
      expect(
        loadSchedulerConfig({ SCHEDULER_ENABLED: raw }).scheduleEnabled,
      ).toBe(true);
    },
  );
});
