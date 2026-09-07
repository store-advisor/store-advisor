/**
 * Client for the findings API.
 *
 * Types mirror FindingResponseDto in the backend. They are written by hand
 * for now; once the OpenAPI document at /api-docs is published as a CI
 * artefact these should be generated from it, so the contract cannot drift
 * without the build noticing.
 */

export type FindingStatus = 'OPEN' | 'FIXED' | 'DISMISSED';

/**
 * Evidence is deliberately loose. It is whatever the check proved, and its
 * shape varies per check - ad_spend_on_oos returns different facts than a
 * future dead-stock check will. The UI renders what it recognises and shows
 * the rest generically, so a new check does not require a frontend change.
 */
export type Evidence = Record<string, unknown>;

export interface Finding {
  id: string;
  merchantId: string;
  checkId: string;
  status: FindingStatus;
  evidence: Evidence;
  estimatedCost: number;
  llmExplanation: string | null;
  llmConfidence: number | null;
  llmSeverity: string | null;
  createdAt: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * The API's auth is a stub that only checks the Bearer header's shape, so
 * any token is accepted today. Reading it from the environment rather than
 * inlining a literal means swapping in real auth is a config change, not a
 * code change.
 */
const TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? 'dev-token';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchFindings(merchantId: string): Promise<Finding[]> {
  const url = `${BASE_URL}/findings?merchant_id=${encodeURIComponent(merchantId)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  if (!response.ok) {
    // Surface the distinction the API actually makes: 401 is our problem to
    // fix, 400 is a bad merchant id, anything else is the server.
    throw new ApiError(
      response.status === 401
        ? 'Not authorised. Check NEXT_PUBLIC_API_TOKEN.'
        : `Could not load findings (HTTP ${response.status}).`,
      response.status,
    );
  }

  return (await response.json()) as Finding[];
}

export interface ActionResult {
  id: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  /** True when this key had already been used. Nothing was executed again. */
  replayed: boolean;
}

/**
 * Approves the fix for a finding: stage 5 of the cycle in proposal section 6.1.
 *
 * The idempotency key is generated here, once per approval attempt, and the
 * caller is expected to hold it steady across retries of the same attempt.
 * That is the whole point: a merchant who double-taps, or a network that
 * replays the request, must not pause a campaign twice. The API returns the
 * original result with `replayed: true` instead of acting again.
 *
 * `crypto.randomUUID` is available in every browser this app supports and in
 * Node 19+, which is what the tests run on.
 */
export async function approveFinding(
  findingId: string,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<ActionResult> {
  const response = await fetch(
    `${BASE_URL}/findings/${encodeURIComponent(findingId)}/actions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idempotency_key: idempotencyKey }),
    },
  );

  if (!response.ok) {
    // 400 here is not a bad request in the usual sense: the common cause is a
    // finding whose evidence names no campaign, which is a fact about the
    // finding rather than a bug in this call. Say so.
    const message =
      response.status === 401
        ? 'Not authorised. Check NEXT_PUBLIC_API_TOKEN.'
        : response.status === 400
          ? 'This finding names no campaign to pause.'
          : response.status === 404
            ? 'That finding no longer exists.'
            : `Could not approve the fix (HTTP ${response.status}).`;
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as ActionResult;
}
