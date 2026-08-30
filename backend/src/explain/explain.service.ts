import { Inject, Injectable, Logger } from '@nestjs/common';
import { FindingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EXPLAINER } from './explain.interface';
// `import type` is required here, as in actions.controller.ts: isolatedModules
// with emitDecoratorMetadata rejects a value import used only as a type in a
// decorated constructor signature.
import type { Explainer } from './explain.interface';

/**
 * Stage 3: give findings a plain-language cause.
 *
 * Runs as a pass over findings that lack an explanation, not as a step
 * inside detection. Three things follow from that, and they are the reason
 * it is built this way:
 *
 * 1. A check run cannot be broken, slowed or made non-deterministic by the
 *    LLM, because the check engine does not call it.
 * 2. Failure recovery is free. A finding that could not be explained — the
 *    service was down, the key was missing, Anthropic rate-limited us — is
 *    simply still unexplained, so the next pass picks it up. That is what a
 *    retry queue would buy, obtained from the scheduler we already have.
 * 3. Cost is bounded by findings, not by runs. The engine is meant to run
 *    hourly; re-explaining an unchanged finding twenty-four times a day
 *    would be money spent to produce the same paragraph.
 *
 * HANDBOOK section 4 describes this as a queue hop out of the check engine.
 * A queue is the right shape eventually — it buys concurrency and backoff —
 * but nothing here needs it yet, and the interface it would sit behind is
 * already in place.
 */
@Injectable()
export class ExplainService {
  private readonly logger = new Logger(ExplainService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EXPLAINER) private readonly explainer: Explainer,
  ) {}

  /**
   * Explain every open finding for this merchant that has no explanation.
   *
   * Returns how many were written. Never throws: an explanation is an
   * enrichment, and a finding with real numbers and no prose is still a
   * finding worth showing.
   */
  async explainPending(merchantId: string): Promise<number> {
    if (!this.explainer.available) {
      // Once per pass, not once per finding. A deployment with no AI service
      // is a legitimate configuration — the check engine and the API work
      // without it — so this is a fact to state, not a failure to report.
      this.logger.log('No AI service configured; findings left unexplained.');
      return 0;
    }

    const pending = await this.prisma.finding.findMany({
      where: {
        merchantId,
        status: FindingStatus.OPEN,
        llmExplanation: null,
      },
      orderBy: { estimatedCost: 'desc' },
    });

    if (pending.length === 0) {
      return 0;
    }

    let explained = 0;

    for (const finding of pending) {
      try {
        const result = await this.explainer.explain({
          checkId: finding.checkId,
          estimatedCost: Number(finding.estimatedCost),
          evidence: finding.evidence as Record<string, unknown>,
        });

        // The golden rule, enforced rather than trusted.
        //
        // The AI service already detects when the model has written a number
        // the evidence does not account for. Storing that text anyway would
        // put an invented figure in front of a merchant and destroy the one
        // claim this project rests on — that every number traces to a row.
        // So an ungrounded explanation is dropped, loudly. The finding keeps
        // its deterministic numbers and simply has no prose.
        if (!result.grounded) {
          this.logger.error(
            `Refused ungrounded explanation for finding ${finding.id} ` +
              `(${finding.checkId}): invented ${result.ungroundedNumbers.join(', ')}`,
          );
          continue;
        }

        await this.prisma.finding.update({
          where: { id: finding.id },
          data: {
            llmExplanation: result.explanation,
            llmConfidence: result.confidence,
            llmSeverity: result.severity,
          },
        });
        explained += 1;
      } catch (error) {
        // Left unexplained on purpose. The next pass retries it, and until
        // then the merchant sees the finding with its evidence.
        this.logger.warn(
          `Could not explain finding ${finding.id}: ` +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    }

    if (explained > 0) {
      this.logger.log(
        `Explained ${explained} of ${pending.length} finding(s) for ${merchantId}.`,
      );
    }

    return explained;
  }
}
