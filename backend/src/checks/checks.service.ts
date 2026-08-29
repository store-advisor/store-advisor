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
        total += results.length;
        this.logger.log(
          `${check.id}: ${results.length} finding(s) for ${merchantId}`,
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
        } as Prisma.JsonFilter,
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

    await this.prisma.finding.update({
      where: { id: existing.id },
      data: {
        evidence,
        estimatedCost: result.estimatedCost,
        // A finding previously marked FIXED that the check has found again
        // is, by definition, not fixed.
        status: FindingStatus.OPEN,
      },
    });
  }
}
