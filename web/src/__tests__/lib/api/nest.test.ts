/**
 * Unit tests for src/lib/api/nest.ts
 * Mocks global fetch to avoid real network calls.
 */

import { nestApi } from '@/lib/api/nest';

const mockFetch = jest.fn();

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockClear();
});

// ─── nestApi.uploadFile ────────────────────────────────────────────────────────

describe('nestApi.uploadFile()', () => {
  const mockUploadResponse = {
    id: 'upload-1',
    sessionId: 'sess-abc',
    filename: 'data.csv',
    sizeBytes: 1024,
    storageRef: '/uploads/data.csv',
    createdAt: '2026-08-18T10:00:00Z',
  };

  it('POSTs to /uploads with Authorization header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUploadResponse,
    });

    const file = new File(['a,b\n1,2'], 'data.csv');
    await nestApi.uploadFile(file, 'sess-abc');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/uploads');
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer any-token');
  });

  it('sends the file and sessionId in FormData', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUploadResponse,
    });

    const file = new File(['a,b\n1,2'], 'data.csv');
    await nestApi.uploadFile(file, 'sess-xyz');

    const body: FormData = mockFetch.mock.calls[0][1].body;
    expect(body.get('sessionId')).toBe('sess-xyz');
    expect(body.get('file')).toBe(file);
  });

  it('returns the parsed upload response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUploadResponse,
    });

    const result = await nestApi.uploadFile(new File([''], 'data.csv'), 'sess-1');
    expect(result).toEqual(mockUploadResponse);
  });

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
    });

    await expect(
      nestApi.uploadFile(new File([''], 'data.csv'), 'sess-1'),
    ).rejects.toThrow('NestJS upload failed: Unauthorized');
  });
});

// ─── nestApi.recordSelection ───────────────────────────────────────────────────

describe('nestApi.recordSelection()', () => {
  const mockSelectionResponse = {
    id: 'sel-1',
    uploadId: 'upload-1',
    sessionId: 'sess-abc',
    pipelineUsed: 'basic',
    createdAt: '2026-08-18T10:01:00Z',
  };

  it('POSTs to /selections with JSON body and auth header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSelectionResponse,
    });

    await nestApi.recordSelection('upload-1', 'sess-abc', 'basic');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/selections');
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer any-token');
    expect(init.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(init.body);
    expect(body).toEqual({
      uploadId: 'upload-1',
      sessionId: 'sess-abc',
      pipelineUsed: 'basic',
    });
  });

  it('returns the parsed selection response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSelectionResponse,
    });

    const result = await nestApi.recordSelection('upload-1', 'sess-abc', 'basic');
    expect(result).toEqual(mockSelectionResponse);
  });

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Forbidden',
    });

    await expect(
      nestApi.recordSelection('upload-1', 'sess-abc', 'advanced'),
    ).rejects.toThrow('NestJS selection record failed: Forbidden');
  });
});
