/**
 * Tests for pure-logic helpers in src/lib/api/ai.ts
 *
 * We import the exported symbols directly and test them in isolation.
 * fetch-dependent methods (profileDataset, cleanDataset, downloadCleanDataset)
 * are tested with a mocked global fetch.
 */

import {
  aiApi,
  isCleaningReportReady,
  type CleaningReport,
  type CleanDatasetResponse,
} from '@/lib/api/ai';

// ─── isAcceptedFile ────────────────────────────────────────────────────────────

describe('aiApi.isAcceptedFile()', () => {
  function makeFile(name: string): File {
    return new File([''], name);
  }

  it.each(['.csv', '.xlsx', '.xls', '.json'])(
    'accepts a %s file',
    (ext) => {
      expect(aiApi.isAcceptedFile(makeFile(`data${ext}`))).toBe(true);
    },
  );

  it.each(['.txt', '.pdf', '.png', '.docx', '.tsv'])(
    'rejects a %s file',
    (ext) => {
      expect(aiApi.isAcceptedFile(makeFile(`data${ext}`))).toBe(false);
    },
  );

  it('is case-insensitive for extensions', () => {
    expect(aiApi.isAcceptedFile(makeFile('DATA.CSV'))).toBe(true);
    expect(aiApi.isAcceptedFile(makeFile('Sheet.XLSX'))).toBe(true);
  });
});

// ─── isCleaningReportReady ─────────────────────────────────────────────────────

describe('isCleaningReportReady()', () => {
  const baseReport: CleaningReport = {
    pipeline: 'basic',
    operations: [],
  };

  it('returns false when report is null', () => {
    expect(isCleaningReportReady(null)).toBe(false);
  });

  it('returns false when report is undefined', () => {
    expect(isCleaningReportReady(undefined)).toBe(false);
  });

  it('returns false when summary is missing', () => {
    expect(isCleaningReportReady(baseReport)).toBe(false);
  });

  it('returns true when summary is present', () => {
    const report: CleaningReport = {
      ...baseReport,
      summary: { rows_before: 100, rows_after: 90, duplicates_removed: 10 },
    };
    expect(isCleaningReportReady(report)).toBe(true);
  });
});

// ─── aiApi.profileDataset (fetch mock) ────────────────────────────────────────

describe('aiApi.profileDataset()', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Server crashed',
    });

    const file = new File(['a,b\n1,2'], 'data.csv');
    await expect(aiApi.profileDataset(file)).rejects.toThrow('Profile failed (500): Server crashed');
  });

  it('normalizes §3.1 wire format (dataset sub-object)', async () => {
    const wire = {
      filename: 'data.csv',
      dataset: { rows: 200, columns: 3, duplicate_rows: 5 },
      columns: [
        {
          name: 'price',
          dtype: 'float64',
          missing_count: 10,
          missing_percentage: 5,
          unique_count: 150,
          quality_flags: ['some-missing'],
          numerical_stats: { mean: 25.5 },
        },
      ],
      quality_score: 88,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => wire,
    });

    const file = new File([''], 'data.csv');
    const result = await aiApi.profileDataset(file);

    expect(result.filename).toBe('data.csv');
    expect(result.dataset.rows).toBe(200);
    expect(result.dataset.columns).toBe(3);
    expect(result.dataset.duplicate_rows).toBe(5);
    expect(result.quality_score).toBe(88);
    expect(result.columns[0].dtype).toBe('float64');
    expect(result.columns[0].missing_percentage).toBe(5);
    expect(result.columns[0].quality_flags).toEqual(['some-missing']);
  });

  it('normalizes legacy HTTP wire format (shape array)', async () => {
    const wire = {
      filename: 'legacy.csv',
      shape: [500, 4],
      columns: [
        {
          name: 'age',
          type: 'int',
          missing_count: 0,
          missing_percent: 0,
          unique: 80,
          stats: { mean: 35 },
        },
      ],
      quality_score: 95,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => wire,
    });

    const file = new File([''], 'legacy.csv');
    const result = await aiApi.profileDataset(file);

    expect(result.dataset.rows).toBe(500);
    expect(result.dataset.columns).toBe(4);
    expect(result.columns[0].dtype).toBe('int');
    expect(result.columns[0].unique_count).toBe(80);
    expect(result.columns[0].numerical_stats).toEqual({ mean: 35 });
  });

  it('infers quality flags when none provided: high-missing', async () => {
    const wire = {
      filename: 'data.csv',
      shape: [100, 1],
      columns: [
        {
          name: 'col',
          type: 'object',
          missing_count: 60,
          missing_percent: 60,
          unique: 10,
        },
      ],
      quality_score: 40,
    };

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => wire });
    const file = new File([''], 'data.csv');
    const result = await aiApi.profileDataset(file);
    expect(result.columns[0].quality_flags).toContain('high-missing');
  });

  it('infers quality flags: some-missing (21-50%)', async () => {
    const wire = {
      filename: 'data.csv',
      shape: [100, 1],
      columns: [
        {
          name: 'col',
          type: 'object',
          missing_count: 30,
          missing_percent: 30,
          unique: 10,
        },
      ],
      quality_score: 70,
    };

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => wire });
    const result = await aiApi.profileDataset(new File([''], 'data.csv'));
    expect(result.columns[0].quality_flags).toContain('some-missing');
  });

  it('infers quality flags: has-duplicates', async () => {
    const wire = {
      filename: 'data.csv',
      shape: [100, 1],
      columns: [
        {
          name: 'col',
          type: 'object',
          missing_count: 0,
          missing_percent: 0,
          duplicates: 5,
          unique: 50,
        },
      ],
      quality_score: 90,
    };

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => wire });
    const result = await aiApi.profileDataset(new File([''], 'data.csv'));
    expect(result.columns[0].quality_flags).toContain('has-duplicates');
  });

  it('infers quality flags: constant (unique_count === 1)', async () => {
    const wire = {
      filename: 'data.csv',
      shape: [100, 1],
      columns: [
        {
          name: 'col',
          type: 'object',
          missing_count: 0,
          missing_percent: 0,
          unique: 1,
        },
      ],
      quality_score: 60,
    };

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => wire });
    const result = await aiApi.profileDataset(new File([''], 'data.csv'));
    expect(result.columns[0].quality_flags).toContain('constant');
  });
});

// ─── aiApi.cleanDataset (fetch mock) ──────────────────────────────────────────

describe('aiApi.cleanDataset()', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
  });

  const wireResponse = {
    report: {
      pipeline: 'basic',
      rows: { before: 1000, after: 950 },
      duplicates: { removed: 50 },
      missing_values: { price: 'Median' },
      dropped_columns: [],
      outliers: { price: 'Remove' },
    },
    cleaned_csv_base64: btoa('a,b\n1,2'),
  };

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      text: async () => 'Validation error',
    });

    await expect(
      aiApi.cleanDataset(new File([''], 'data.csv'), 'basic'),
    ).rejects.toThrow('Clean failed (422): Validation error');
  });

  it('normalizes cleaning report from wire format', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => wireResponse });

    const result: CleanDatasetResponse = await aiApi.cleanDataset(
      new File([''], 'data.csv'),
      'basic',
    );

    expect(result.report.pipeline).toBe('basic');
    expect(result.report.summary?.rows_before).toBe(1000);
    expect(result.report.summary?.rows_after).toBe(950);
    expect(result.report.summary?.duplicates_removed).toBe(50);
    expect(result.cleaned_csv_base64).toBe(btoa('a,b\n1,2'));
  });

  it('builds operations list from wire fields', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => wireResponse });

    const result = await aiApi.cleanDataset(new File([''], 'data.csv'), 'basic');
    const opNames = result.report.operations.map((o) => o.name);

    expect(opNames).toContain('Remove Duplicates');
    expect(opNames.some((n) => n.includes('Missing values: price'))).toBe(true);
    expect(opNames.some((n) => n.includes('Outliers: price'))).toBe(true);
  });

  it('sends manual pipeline params as form fields', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => wireResponse });

    await aiApi.cleanDataset(new File([''], 'data.csv'), 'advanced', {
      mode: 'manual',
      dup_strategy: 'keep',
      missing_strategies: { price: 'Mean' },
      outlier_strategies: { price: 'Cap (Winsorise)' },
    });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('pipeline=manual');

    const body = init.body as FormData;
    expect(body.get('dup_strategy')).toBe('keep');
    expect(body.get('missing_strategies')).toBe(JSON.stringify({ price: 'Mean' }));
    expect(body.get('outlier_strategies')).toBe(JSON.stringify({ price: 'Cap (Winsorise)' }));
  });

  it('does not send strategy fields for auto mode', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => wireResponse });

    await aiApi.cleanDataset(new File([''], 'data.csv'), 'advanced', { mode: 'auto' });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('pipeline=advanced');

    const body = init.body as FormData;
    expect(body.get('dup_strategy')).toBeNull();
    expect(body.get('missing_strategies')).toBeNull();
  });
});
