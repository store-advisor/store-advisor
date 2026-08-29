import { fetchFindings } from '@/lib/api/findings';

describe('fetchFindings', () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('sends the merchant id and a bearer token', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await fetchFindings('demo_merchant');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('merchant_id=demo_merchant');
    expect(init.headers.Authorization).toMatch(/^Bearer /);
  });

  it('encodes a merchant id that needs it', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await fetchFindings('a b&c');
    expect(mockFetch.mock.calls[0][0]).toContain('merchant_id=a%20b%26c');
  });

  it('explains a 401 as our misconfiguration, not a server fault', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    await expect(fetchFindings('m')).rejects.toThrow(/Not authorised/);
  });

  it('carries the status code on the error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchFindings('m')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
    });
  });

  it('returns the parsed findings', async () => {
    const finding = { id: 'f1', estimatedCost: 283.5 };
    mockFetch.mockResolvedValue({ ok: true, json: async () => [finding] });
    await expect(fetchFindings('m')).resolves.toEqual([finding]);
  });
});
