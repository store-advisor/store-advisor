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
