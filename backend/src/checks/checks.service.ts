import { Inject, Injectable, Logger } from '@nestjs/common';
import { FindingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CHECKS, Check, CheckResult } from './check.interface';

/**
 * The engine core. Runs every registered check for a merchant and persists
 * what they found.
 *
 * This class knows nothing about any individual check, and must stay that
 * way — adding a check is adding a provider, never an edit here (ROLES.md,
 * rule 2).
 */
@Injectable()
export class ChecksService {
  private readonly logger = new Logger(ChecksService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CHECKS) private readonly checks: Check[],
  ) {}

  async runAllForMerchant(merchantId: string): Promise<number> {
    let total = 0;

    for (const check of this.checks) {
      try {
        const results = await check.run(merchantId);
        for (const result of results) {
          await this.persist(merchantId, check.id, result);
        }

        // Stage 6. Anything this check reported before and does not report
        // now has stopped being true — the campaign was paused, the product
        // was restocked, the leak was closed. Marking those fixed is what
        // makes this an agent rather than a dashboard: it does not just say
        // something is wrong, it notices when it is right again.
        const fixed = await this.resolveFixed(
          merchantId,
          check.id,
          results.map((r) => r.dedupeKey),
        );

        total += results.length;
        this.logger.log(
          `${check.id}: ${results.length} finding(s) for ${merchantId}` +
            (fixed > 0 ? `, ${fixed} now fixed` : ''),
        );
      } catch (error) {
        // One failing check must not silence the others. A merchant losing
        // money to leak B should still hear about it when check A is broken.
        this.logger.error(
          `${check.id} failed for ${merchantId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return total;
  }

  /**
   * Close findings this check no longer reports.
   *
   * Only OPEN findings are touched. A dismissed finding stays dismissed, and
   * one already marked fixed does not need marking again.
   */
  private async resolveFixed(
    merchantId: string,
    checkId: string,
    stillFiring: string[],
  ): Promise<number> {
    const open = await this.prisma.finding.findMany({
      where: { merchantId, checkId, status: FindingStatus.OPEN },
    });

    const firing = new Set(stillFiring);
    const resolved = open.filter((finding) => {
      const key = (finding.evidence as Record<string, unknown>)?.dedupe_key;
      // A finding with no dedupe key predates this mechanism. Leaving it open
      // is the safe choice: closing it would silently tell a merchant a
      // problem went away that we never actually rechecked.
      return typeof key === 'string' && !firing.has(key);
    });

    if (resolved.length === 0) {
      return 0;
    }

    await this.prisma.finding.updateMany({
      where: { id: { in: resolved.map((f) => f.id) } },
      data: { status: FindingStatus.FIXED },
    });

    return resolved.length;
  }

  /**
   * Findings are upserted on (check, dedupe key), not inserted. The engine
   * is designed to run hourly, and a merchant should see one finding that
   * stays current — not twenty-four identical cards a day.
   *
   * A finding a merchant already dismissed stays dismissed; re-opening it on
   * the next run would make dismissal useless.
   */
  private async persist(
    merchantId: string,
    checkId: string,
    result: CheckResult,
  ): Promise<void> {
    const existing = await this.prisma.finding.findFirst({
      where: {
        merchantId,
        checkId,
        evidence: {
          path: ['dedupe_key'],
          equals: result.dedupeKey,
        },
      },
    });

    const evidence = {
      ...(result.evidence as Record<string, unknown>),
      dedupe_key: result.dedupeKey,
    } as Prisma.InputJsonValue;

    if (!existing) {
      await this.prisma.finding.create({
        data: {
          merchantId,
          checkId,
          evidence,
          estimatedCost: result.estimatedCost,
          status: FindingStatus.OPEN,
        },
      });
      return;
    }

    if (existing.status === FindingStatus.DISMISSED) {
      return;
    }

    // An explanation describes a specific set of numbers. When those numbers
    // move, the prose stops being true, so it is cleared and the finding
    // becomes eligible to be explained again. The engine is not reaching into
    // stage 3 to do this — it is discarding derived fields that no longer
    // match what they were derived from.
    //
    // Keyed on estimatedCost rather than on the whole evidence blob: it is
    // the headline figure and the one the prose is built around, and jsonb
    // does not preserve key order, so comparing serialised evidence would
    // report a change on every run and re-explain — at cost — hourly.
    const costChanged = Number(existing.estimatedCost) !== result.estimatedCost;

    await this.prisma.finding.update({
      where: { id: existing.id },
      data: {
        evidence,
        estimatedCost: result.estimatedCost,
        // A finding previously marked FIXED that the check has found again
        // is, by definition, not fixed.
        status: FindingStatus.OPEN,
        ...(costChanged
          ? {
              llmExplanation: null,
              llmConfidence: null,
              llmSeverity: null,
            }
          : {}),
      },
    });
  }
}
