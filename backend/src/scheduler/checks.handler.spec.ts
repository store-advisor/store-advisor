/// <reference types="jest" />
import { JobsOptions, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ChecksService } from '../checks/checks.service';
import { ExplainService } from '../explain/explain.service';
import { ChecksHandler } from './checks.handler';
import { RUN_CHECKS_JOB, SWEEP_JOB, runChecksJobId } from './queue.constants';

/** The shape of a `queue.add` call, so its arguments read typed. */
type AddCall = [name: string, data: { merchantId: string }, opts: JobsOptions];

function make(merchantIds: string[] = ['m1', 'm2', 'm3']) {
  const findMany = jest
    .fn()
    .mockResolvedValue(merchantIds.map((id) => ({ id })));
  const runAllForMerchant = jest.fn().mockResolvedValue(2);
  const explainPending = jest.fn().mockResolvedValue(1);
  const add = jest.fn().mockResolvedValue(undefined);

  const handler = new ChecksHandler(
    { merchant: { findMany } } as unknown as PrismaService,
    { runAllForMerchant } as unknown as ChecksService,
    { explainPending } as unknown as ExplainService,
    { add } as unknown as Queue,
  );

  return {
    handler,
    add,
    runAllForMerchant,
    explainPending,
    addCalls: () => add.mock.calls as unknown as AddCall[],
  };
}

describe('ChecksHandler', () => {
  describe(SWEEP_JOB, () => {
    it('enqueues exactly one run per merchant', async () => {
      const { handler, add, addCalls } = make(['m1', 'm2', 'm3']);

      const result = await handler.handle({ name: SWEEP_JOB, data: {} });

      expect(result).toEqual({ enqueued: 3 });
      expect(add).toHaveBeenCalledTimes(3);
      expect(addCalls().map(([, data]) => data)).toEqual([
        { merchantId: 'm1' },
        { merchantId: 'm2' },
        { merchantId: 'm3' },
      ]);
    });

    // The dedupe that keeps a slow merchant from stacking up: while the job
    // is waiting or active this id is taken, so the next sweep's add for
    // that merchant is a no-op.
    it('keys each job on the merchant so a second sweep cannot stack them', async () => {
      const { handler, addCalls } = make(['m1']);

      await handler.handle({ name: SWEEP_JOB, data: {} });

      const opts = addCalls()[0][2];
      expect(opts.jobId).toBe(runChecksJobId('m1'));
      // BullMQ rejects a custom id containing a colon: it is the separator
      // in its own Redis keys.
      expect(opts.jobId).not.toContain(':');
      // removeOnComplete frees the id for the next tick; without it the
      // merchant would be checked once and then never again.
      expect(opts.removeOnComplete).toBe(true);
    });

    it('retries a merchant run with backoff', async () => {
      const { handler, addCalls } = make(['m1']);

      await handler.handle({ name: SWEEP_JOB, data: {} });

      const opts = addCalls()[0][2];
      expect(opts.attempts).toBe(3);
      expect(opts.backoff).toEqual({ type: 'exponential', delay: 5000 });
    });

    it('enqueues nothing when there are no merchants', async () => {
      const { handler, add } = make([]);

      expect(await handler.handle({ name: SWEEP_JOB, data: {} })).toEqual({
        enqueued: 0,
      });
      expect(add).not.toHaveBeenCalled();
    });
  });

  describe(RUN_CHECKS_JOB, () => {
    it('runs the checks, then explains, for that merchant only', async () => {
      const { handler, runAllForMerchant, explainPending } = make();

      const result = await handler.handle({
        name: RUN_CHECKS_JOB,
        data: { merchantId: 'demo_merchant' },
      });

      expect(runAllForMerchant).toHaveBeenCalledWith('demo_merchant');
      expect(explainPending).toHaveBeenCalledWith('demo_merchant');
      expect(result).toEqual({ found: 2, explained: 1 });
    });

    // Stage 3's contract: findings are durable before the model is
    // consulted, so nothing the AI service does can change what was detected.
    it('detects before it explains', async () => {
      const { handler, runAllForMerchant, explainPending } = make();
      const order: string[] = [];
      runAllForMerchant.mockImplementation(() => {
        order.push('detect');
        return Promise.resolve(1);
      });
      explainPending.mockImplementation(() => {
        order.push('explain');
        return Promise.resolve(1);
      });

      await handler.handle({ name: RUN_CHECKS_JOB, data: { merchantId: 'm' } });

      expect(order).toEqual(['detect', 'explain']);
    });

    // The findings are already written and re-running is idempotent, so a
    // failed explanation pass should fail the job and be retried.
    it('fails the job when the explanation pass throws', async () => {
      const { handler, explainPending } = make();
      explainPending.mockRejectedValue(new Error('ai unreachable'));

      await expect(
        handler.handle({ name: RUN_CHECKS_JOB, data: { merchantId: 'm' } }),
      ).rejects.toThrow('ai unreachable');
    });
  });

  // A job name from an older deploy sharing the queue. Throwing would retry
  // it until it exhausted its attempts, every time.
  it('ignores an unknown job rather than failing it forever', async () => {
    const { handler, runAllForMerchant, add } = make();

    expect(
      await handler.handle({ id: '9', name: 'send_push', data: {} }),
    ).toEqual({ ignored: 'send_push' });
    expect(runAllForMerchant).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });
});
