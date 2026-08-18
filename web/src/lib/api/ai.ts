/**
 da el gz2 bta3 khaled 
 m3mol 7ba 7lwen mn ai so if there any bs just let claude know :|
 ana m3dl shwya 3la code el ai bta3 khaled 3shan yb2a compatible m3 el frontend
 */
const BASE_URL = process.env.NEXT_PUBLIC_AI_URL || 'http://127.0.0.1:8000';

// ─── Internal types matching §3.1 spec ───────────────────────────────────────

export interface ColumnProfile {
  name: string;
  dtype: string;
  missing_count: number;
  missing_percentage: number;
  unique_count: number;
  quality_flags: string[];
  numerical_stats?: Record<string, number>;
}

export interface DatasetSummary {
  rows: number;
  columns: number;
  duplicate_rows: number;
}

export interface DatasetProfile {
  filename: string;
  dataset: DatasetSummary;
  columns: ColumnProfile[];
  quality_score: number;
}

export interface CleaningReportSummary {
  rows_before: number;
  rows_after: number;
  duplicates_removed: number;
}

export interface CleaningOperation {
  name: string;
  rows_affected: number;
  timestamp: string;
}

/** Normalized report shape consumed by the UI after wire-format mapping. */
export interface CleaningReport {
  filename?: string;
  pipeline: string;
  operations: CleaningOperation[];
  /** Present after normalization; absent on raw/partial API payloads. */
  summary?: CleaningReportSummary;
}

export interface CleanDatasetResponse {
  report: CleaningReport;
  cleaned_csv_base64: string;
}

/** Type guard — use before rendering CleaningReport. */
export function isCleaningReportReady(
  report: CleaningReport | undefined | null,
): report is CleaningReport & { summary: CleaningReportSummary } {
  return !!report?.summary;
}

// Advanced pipeline strategy params (passed as form data when API supports it)
export interface AdvancedCleaningParams {
  mode: 'auto' | 'manual';
  dup_strategy?: 'remove' | 'keep';
  missing_strategies?: Record<string, string>;
  outlier_strategies?: Record<string, string>;
}

// ─── Wire-format types (what the HTTP API actually returns) ───────────────────
// The API may return either the documented HTTP shape (shape:[rows,cols]) or
// the §3.1 shape that the FastAPI profiler module produces directly.

interface WireColumnProfile {
  // Documented HTTP API fields
  name: string;
  type?: string;                // HTTP wire name
  missing_count: number;
  missing_percent?: number;     // HTTP wire name
  duplicates?: number;
  unique?: number;
  stats?: Record<string, number>;
  // §3.1 field names (FastAPI profiler module returns these directly)
  dtype?: string;
  missing_percentage?: number;
  unique_count?: number;
  quality_flags?: string[];
  numerical_stats?: Record<string, number>;
}

interface WireProfileResponse {
  filename: string;
  // Documented HTTP API — array shape
  shape?: [number, number];
  // §3.1 direct — dataset sub-object
  dataset?: { rows: number; columns: number; duplicate_rows: number };
  columns: WireColumnProfile[];
  quality_score: number;
}

/** Actual FastAPI /api/clean report body (report.to_dict()). */
interface WireCleanReport {
  pipeline: string;
  // FastAPI wire format (what the server actually returns)
  rows?: { before: number; after: number };
  duplicates?: { removed: number };
  missing_values?: Record<string, string>;
  dropped_columns?: string[];
  outliers?: Record<string, string>;
  type_changes?: Record<string, unknown>;
  validation?: {
    rows_before?: number;
    rows_after?: number;
    [key: string]: unknown;
  };
  // Documented API shape (not currently returned by FastAPI)
  filename?: string;
  operations?: CleaningOperation[];
  summary?: CleaningReportSummary;
}

interface WireCleanDatasetResponse {
  report: WireCleanReport;
  cleaned_csv_base64: string;
}

// ─── Normalization helpers ────────────────────────────────────────────────────

function normalizeProfile(wire: WireProfileResponse): DatasetProfile {
  // Resolve dataset dimensions — handle both wire shapes
  const rows = wire.dataset?.rows ?? wire.shape?.[0] ?? 0;
  const cols = wire.dataset?.columns ?? wire.shape?.[1] ?? wire.columns.length;
  const dupRows =
    wire.dataset?.duplicate_rows ??
    wire.columns.reduce((sum, c) => sum + (c.duplicates ?? 0), 0);

  return {
    filename: wire.filename,
    quality_score: wire.quality_score ?? 0,
    dataset: { rows, columns: cols, duplicate_rows: dupRows },
    columns: wire.columns.map((c) => ({
      name: c.name,
      // dtype: prefer §3.1 field name, fall back to HTTP wire name
      dtype: c.dtype ?? c.type ?? 'unknown',
      missing_count: c.missing_count ?? 0,
      // missing_percentage: prefer §3.1, fall back to HTTP wire
      missing_percentage: c.missing_percentage ?? c.missing_percent ?? 0,
      unique_count: c.unique_count ?? c.unique ?? 0,
      // quality_flags: use if already present, otherwise infer
      quality_flags: c.quality_flags?.length ? c.quality_flags : buildQualityFlags(c),
      numerical_stats:
        c.numerical_stats ?? (c.stats && Object.keys(c.stats).length > 0 ? c.stats : undefined),
    })),
  };
}

function buildQualityFlags(col: WireColumnProfile): string[] {
  const flags: string[] = [];
  const missingPct = col.missing_percentage ?? col.missing_percent ?? 0;
  const dupes = col.duplicates ?? 0;
  const uniqueCount = col.unique_count ?? col.unique ?? 0;
  if (missingPct > 50) flags.push('high-missing');
  else if (missingPct > 20) flags.push('some-missing');
  if (dupes > 0) flags.push('has-duplicates');
  if (uniqueCount === 1) flags.push('constant');
  return flags;
}

function buildOperationsFromWire(wire: WireCleanReport): CleaningOperation[] {
  const timestamp = new Date().toISOString();
  const ops: CleaningOperation[] = [];

  const dupRemoved = wire.duplicates?.removed ?? wire.summary?.duplicates_removed ?? 0;
  if (dupRemoved > 0) {
    ops.push({ name: 'Remove Duplicates', rows_affected: dupRemoved, timestamp });
  }

  for (const [col, strategy] of Object.entries(wire.missing_values ?? {})) {
    ops.push({
      name: `Missing values: ${col} (${strategy})`,
      rows_affected: 0,
      timestamp,
    });
  }

  for (const col of wire.dropped_columns ?? []) {
    ops.push({ name: `Drop column: ${col}`, rows_affected: 0, timestamp });
  }

  for (const [col, action] of Object.entries(wire.outliers ?? {})) {
    ops.push({ name: `Outliers: ${col} — ${action}`, rows_affected: 0, timestamp });
  }

  return ops;
}

function normalizeCleaningReport(wire: WireCleanReport): CleaningReport {
  const rowsBefore =
    wire.summary?.rows_before ??
    wire.rows?.before ??
    wire.validation?.rows_before ??
    0;
  const rowsAfter =
    wire.summary?.rows_after ??
    wire.rows?.after ??
    wire.validation?.rows_after ??
    0;
  const duplicatesRemoved =
    wire.summary?.duplicates_removed ?? wire.duplicates?.removed ?? 0;

  return {
    filename: wire.filename,
    pipeline: wire.pipeline,
    operations: wire.operations?.length ? wire.operations : buildOperationsFromWire(wire),
    summary: {
      rows_before: rowsBefore,
      rows_after: rowsAfter,
      duplicates_removed: duplicatesRemoved,
    },
  };
}

function normalizeCleanResponse(wire: WireCleanDatasetResponse): CleanDatasetResponse {
  return {
    report: normalizeCleaningReport(wire.report),
    cleaned_csv_base64: wire.cleaned_csv_base64,
  };
}

/** Accepted file MIME types and extensions — matches FastAPI's supported formats */
export const ACCEPTED_FILE_TYPES = '.csv,.xlsx,.xls,.json';
export const ACCEPTED_MIME_TYPES = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/json',
];

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith('.csv') ||
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    name.endsWith('.json')
  );
}

// ─── API client ───────────────────────────────────────────────────────────────

export const aiApi = {
  async profileDataset(file: File): Promise<DatasetProfile> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`Profile failed (${response.status}): ${text}`);
    }

    const wire: WireProfileResponse = await response.json();
    return normalizeProfile(wire);
  },

  async cleanDataset(
    file: File,
    pipeline: 'basic' | 'advanced',
    params?: AdvancedCleaningParams,
  ): Promise<CleanDatasetResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // For manual mode: attach strategy params AND use pipeline=manual
    // so the backend routes to manual_pipeline() instead of advanced_pipeline()
    let effectivePipeline: string = pipeline;
    if (params?.mode === 'manual') {
      effectivePipeline = 'manual';
      formData.append('dup_strategy', params.dup_strategy ?? 'remove');
      if (params.missing_strategies && Object.keys(params.missing_strategies).length > 0) {
        formData.append('missing_strategies', JSON.stringify(params.missing_strategies));
      }
      if (params.outlier_strategies && Object.keys(params.outlier_strategies).length > 0) {
        formData.append('outlier_strategies', JSON.stringify(params.outlier_strategies));
      }
    }

    const response = await fetch(`${BASE_URL}/api/clean?pipeline=${effectivePipeline}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`Clean failed (${response.status}): ${text}`);
    }

    const wire: WireCleanDatasetResponse = await response.json();
    return normalizeCleanResponse(wire);
  },

  async downloadCleanDataset(
    file: File,
    pipeline: 'basic' | 'advanced',
    params?: AdvancedCleaningParams,
  ): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', file);

    let effectivePipeline: string = pipeline;
    if (params?.mode === 'manual') {
      effectivePipeline = 'manual';
      formData.append('dup_strategy', params.dup_strategy ?? 'remove');
      if (params.missing_strategies && Object.keys(params.missing_strategies).length > 0) {
        formData.append('missing_strategies', JSON.stringify(params.missing_strategies));
      }
      if (params.outlier_strategies && Object.keys(params.outlier_strategies).length > 0) {
        formData.append('outlier_strategies', JSON.stringify(params.outlier_strategies));
      }
    }

    const response = await fetch(`${BASE_URL}/api/clean/download?pipeline=${effectivePipeline}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`Download failed (${response.status}): ${text}`);
    }

    return response.blob();
  },

  isAcceptedFile,
};
