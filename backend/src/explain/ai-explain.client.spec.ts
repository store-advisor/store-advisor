/// <reference types="jest" />
import { ConfigService } from '@nestjs/config';
import { AiExplainClient } from './ai-explain.client';

/**
 * The wire contract with ai/app/explain/schemas.py.
 *
 * Two services in two languages agreeing on field names is exactly the kind
 * of thing that breaks silently, so the snake_case boundary is asserted in
 * both directions.
 */
describe('AiExplainClient', () => {
  const config = (url?: string) =>
    ({ get: () => url }) as unknown as ConfigService;

  const body = {
    check_id: 'ad_spend_on_oos',
    explanation: 'You are spending $40.50 a day on a sold-out product.',
    confidence: 0.9,
    severity: 'high',
    grounded: true,
    ungrounded_numbers: [],
  };

  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    });
    global.fetch = fetchMock;
  });

  const request = {
    checkId: 'ad_spend_on_oos',
    estimatedCost: 283.5,
    evidence: { product_title: 'Blue Hoodie' },
  };

  it('sends the snake_case body the Python service expects', async () => {
    await new AiExplainClient(config('http://ai:8000')).explain(request);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://ai:8000/api/explain');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      check_id: 'ad_spend_on_oos',
      estimated_cost: 283.5,
      evidence: { product_title: 'Blue Hoodie' },
    });
  });

  it('maps ungrounded_numbers across the naming boundary', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ...body,
          grounded: false,
          ungrounded_numbers: ['9999'],
        }),
    });

    const result = await new AiExplainClient(config('http://ai:8000')).explain(
      request,
    );

    // If this mapping is ever dropped, `grounded` silently becomes undefined
    // and every ungrounded explanation gets stored. Worth pinning.
    expect(result.grounded).toBe(false);
    expect(result.ungroundedNumbers).toEqual(['9999']);
  });

  it('surfaces the service detail on an error status', async () => {
    // 503 means no API key, 502 means Anthropic is down. Collapsing them
    // sends whoever is on call to the wrong service.
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('{"detail":"No Anthropic credentials"}'),
    });

    await expect(
      new AiExplainClient(config('http://ai:8000')).explain(request),
    ).rejects.toThrow(/503.*No Anthropic credentials/);
  });

  it('is unavailable when no URL is configured', () => {
    expect(new AiExplainClient(config(undefined)).available).toBe(false);
    expect(new AiExplainClient(config('http://ai:8000')).available).toBe(true);
  });

  it('tolerates a trailing slash on the configured URL', () => {
    expect(new AiExplainClient(config('http://ai:8000/')).baseUrl).toBe(
      'http://ai:8000',
    );
  });
});
