/**
 * The contract for whatever turns a finding's evidence into prose.
 *
 * This exists so the check engine never learns that a language model is
 * involved. Detection produces findings; something else, later, explains
 * them. That separation is the golden rule made structural rather than
 * conventional — code that cannot reach the LLM cannot be talked into
 * letting it compute a number.
 */
export interface Explanation {
  explanation: string;
  confidence: number;
  severity: string;

  /**
   * Whether every number in `explanation` traces back to the evidence.
   *
   * The AI service computes this and its own schema says an ungrounded
   * explanation must not be shown to a merchant — but it returns the text
   * regardless, and until now nothing downstream looked. Carrying the flag
   * this far is what lets the write boundary enforce it.
   */
  grounded: boolean;
  ungroundedNumbers: string[];
}

export interface ExplainRequest {
  checkId: string;
  estimatedCost: number;
  evidence: Record<string, unknown>;
}

export interface Explainer {
  /**
   * False when the explainer cannot run at all — no AI service configured,
   * queue unreachable. Checked once per pass rather than per finding, so a
   * deployment without an AI service logs one line instead of one per
   * finding. Distinct from a call that fails: that is worth retrying, this
   * is not.
   */
  readonly available: boolean;

  /** Throws on transport or service failure. The caller decides what that means. */
  explain(request: ExplainRequest): Promise<Explanation>;
}

/** DI token. Swapping the HTTP client for a queue producer is a provider change, nothing more. */
export const EXPLAINER = Symbol('EXPLAINER');
