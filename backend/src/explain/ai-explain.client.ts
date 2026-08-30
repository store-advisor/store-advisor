import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Explainer, Explanation, ExplainRequest } from './explain.interface';

/** Response shape of POST /api/explain. Mirrors ExplainResponse in ai/app/explain/schemas.py. */
interface ExplainResponseBody {
  explanation: string;
  confidence: number;
  severity: string;
  grounded: boolean;
  ungrounded_numbers: string[];
}

/**
 * HTTP client for the Python AI service.
 *
 * Uses the global fetch built into Node 22 rather than adding an HTTP
 * library. One POST to one endpoint does not justify a dependency.
 */
@Injectable()
export class AiExplainClient implements Explainer {
  private readonly logger = new Logger(AiExplainClient.name);

  /**
   * Explaining is not free and not fast, but it is also not allowed to hold
   * a check run open indefinitely. A finding that times out here keeps its
   * numbers and gets explained on the next pass.
   */
  private static readonly TIMEOUT_MS = 30_000;

  constructor(private readonly config: ConfigService) {}

  /** Unset when there is no AI service to talk to — that is how it is switched off. */
  get baseUrl(): string | undefined {
    return this.config.get<string>('AI_SERVICE_URL')?.replace(/\/+$/, '');
  }

  get available(): boolean {
    return Boolean(this.baseUrl);
  }

  async explain(request: ExplainRequest): Promise<Explanation> {
    const url = `${this.baseUrl}/api/explain`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        check_id: request.checkId,
        estimated_cost: request.estimatedCost,
        evidence: request.evidence,
      }),
      signal: AbortSignal.timeout(AiExplainClient.TIMEOUT_MS),
    });

    if (!response.ok) {
      // The body carries FastAPI's `detail`, which distinguishes "no API key
      // configured" (503) from "Anthropic is down" (502). Losing that would
      // send someone debugging the wrong service.
      const body = await response.text().catch(() => '');
      throw new Error(
        `AI service returned ${response.status}${body ? `: ${body}` : ''}`,
      );
    }

    const body = (await response.json()) as ExplainResponseBody;

    return {
      explanation: body.explanation,
      confidence: body.confidence,
      severity: body.severity,
      grounded: body.grounded,
      ungroundedNumbers: body.ungrounded_numbers ?? [],
    };
  }
}
