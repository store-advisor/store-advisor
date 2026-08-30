/// <reference types="jest" />
import { FindingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Explainer, Explanation } from './explain.interface';
import { ExplainService } from './explain.service';

/**
 * Stage 3 behaviour, with both the model and the database stubbed.
 *
 * The rule under test is the one the whole project rests on: an explanation
 * containing a number the evidence does not account for must never reach a
 * merchant. That is worth testing without a network or an API key, so this
 * suite has neither.
 */
describe('ExplainService', () => {
  const finding = {
    id: 'finding_1',
    checkId: 'ad_spend_on_oos',
    estimatedCost: 283.5,
    evidence: { product_title: 'Blue Hoodie', average_daily_spend: 40.5 },
  };

  function makePrisma(pending: unknown[] = [finding]) {
    return {
      finding: {
        findMany: jest.fn().mockResolvedValue(pending),
        update: jest.fn().mockResolvedValue({}),
      },
    };
  }

  function makeExplainer(over: Partial<Explanation & { available: boolean }>) {
    const result: Explanation = {
      explanation: 'You are spending $40.50 a day on a sold-out product.',
      confidence: 0.9,
      severity: 'high',
      grounded: true,
      ungroundedNumbers: [],
      ...over,
    };
    return {
      available: over.available ?? true,
      explain: jest.fn().mockResolvedValue(result),
    };
  }

  function build(prisma: unknown, explainer: unknown) {
    return new ExplainService(prisma as PrismaService, explainer as Explainer);
  }

  it('writes the explanation, confidence and severity back onto the finding', async () => {
    const prisma = makePrisma();
    const explainer = makeExplainer({});

    const count = await build(prisma, explainer).explainPending('m1');

    expect(count).toBe(1);
    expect(prisma.finding.update).toHaveBeenCalledWith({
      where: { id: 'finding_1' },
      data: {
        llmExplanation: 'You are spending $40.50 a day on a sold-out product.',
        llmConfidence: 0.9,
        llmSeverity: 'high',
      },
    });
  });

  it('hands the check the evidence and cost, and nothing else', async () => {
    const prisma = makePrisma();
    const explainer = makeExplainer({});

    await build(prisma, explainer).explainPending('m1');

    expect(explainer.explain).toHaveBeenCalledWith({
      checkId: 'ad_spend_on_oos',
      estimatedCost: 283.5,
      evidence: finding.evidence,
    });
  });

  it('refuses to store an ungrounded explanation', async () => {
    // The golden rule. The model invented $9,999; the evidence does not
    // account for it; the merchant must never see it. The finding keeps its
    // real numbers and simply has no prose.
    const prisma = makePrisma();
    const explainer = makeExplainer({
      explanation: 'You will lose $9999 this quarter.',
      grounded: false,
      ungroundedNumbers: ['9999'],
    });

    const count = await build(prisma, explainer).explainPending('m1');

    expect(count).toBe(0);
    expect(prisma.finding.update).not.toHaveBeenCalled();
  });

  it('only considers open findings that have no explanation', async () => {
    const prisma = makePrisma();

    await build(prisma, makeExplainer({})).explainPending('m1');

    expect(prisma.finding.findMany).toHaveBeenCalledWith({
      where: {
        merchantId: 'm1',
        status: FindingStatus.OPEN,
        llmExplanation: null,
      },
      orderBy: { estimatedCost: 'desc' },
    });
  });

  it('leaves a finding unexplained when the service fails, and does not throw', async () => {
    // An explanation is an enrichment. A finding with real numbers and no
    // prose is still worth showing, and the next pass retries it.
    const prisma = makePrisma();
    const explainer = {
      available: true,
      explain: jest.fn().mockRejectedValue(new Error('502 Bad Gateway')),
    };

    const count = await build(prisma, explainer).explainPending('m1');

    expect(count).toBe(0);
    expect(prisma.finding.update).not.toHaveBeenCalled();
  });

  it('keeps going after one finding fails', async () => {
    const second = { ...finding, id: 'finding_2' };
    const prisma = makePrisma([finding, second]);
    const explainer = {
      available: true,
      explain: jest
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce({
          explanation: 'Grounded prose.',
          confidence: 0.8,
          severity: 'medium',
          grounded: true,
          ungroundedNumbers: [],
        }),
    };

    const count = await build(prisma, explainer).explainPending('m1');

    expect(count).toBe(1);
    expect(prisma.finding.update).toHaveBeenCalledTimes(1);
  });

  it('does nothing, quietly, when no AI service is configured', async () => {
    const prisma = makePrisma();
    const explainer = makeExplainer({ available: false });

    const count = await build(prisma, explainer).explainPending('m1');

    expect(count).toBe(0);
    // Not even a query: an unconfigured deployment should cost nothing.
    expect(prisma.finding.findMany).not.toHaveBeenCalled();
    expect(explainer.explain).not.toHaveBeenCalled();
  });
});
