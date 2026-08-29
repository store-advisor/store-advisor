import { Prisma } from '@prisma/client';

/**
 * The check contract.
 *
 * Per ROLES.md, rule 2: a new check is a new module implementing this
 * interface, never a change to the engine core. If adding a check forces a
 * change to this file or to ChecksService, the interface is wrong and should
 * be fixed rather than worked around.
 */
export interface CheckResult {
  /**
   * Everything the check proved, as raw facts. This is what the AI service
   * is handed, and it is the only thing it may describe. Per the golden rule
   * the LLM explains these numbers and never produces its own, so every
   * figure here must trace back to a database row.
   */
  evidence: Prisma.InputJsonValue;

  /**
   * Dollars per week, computed by this check from real rows. Stored on the
   * finding so the figure the merchant sees is the figure the check derived,
   * not something recomputed later by different code.
   */
  estimatedCost: number;

  /**
   * Stable identity for this finding within a check, so repeated runs update
   * one finding rather than creating a new one every hour. Scoped to the
   * check, so two checks can use the same key without colliding.
   */
  dedupeKey: string;
}

export interface Check {
  /** Stable identifier, stored on the finding as check_id. Never a foreign key: checks are code, not rows. */
  readonly id: string;

  /** Deterministic. Same rows in, same findings out, no network, no LLM. */
  run(merchantId: string): Promise<CheckResult[]>;
}

/** DI token for the registered set of checks. Adding a check means adding a provider, nothing more. */
export const CHECKS = Symbol('CHECKS');
