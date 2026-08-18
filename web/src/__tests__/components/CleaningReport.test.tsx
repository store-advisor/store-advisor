/**
 * Component tests for CleaningReport
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { CleaningReport } from '@/components/CleaningReport';
import type { CleaningReport as CleaningReportType } from '@/lib/api/ai';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseReport: CleaningReportType = {
  pipeline: 'basic_pipeline',
  operations: [],
  summary: {
    rows_before: 1000,
    rows_after: 900,
    duplicates_removed: 50,
  },
};

// Helper: build a tiny valid base64-encoded CSV
function makeCsvBase64(rows = ['a,b', '1,2', '3,4']): string {
  return btoa(rows.join('\n'));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('<CleaningReport />', () => {
  it('renders nothing when report has no summary', () => {
    const { container } = render(
      <CleaningReport report={{ pipeline: 'basic', operations: [] }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders pipeline name (underscores replaced with spaces)', () => {
    render(<CleaningReport report={baseReport} />);
    expect(screen.getByText(/basic pipeline/i)).toBeInTheDocument();
  });

  it('renders rows before and rows after', () => {
    render(<CleaningReport report={baseReport} />);
    expect(screen.getByText('1,000')).toBeInTheDocument(); // rows_before
    expect(screen.getByText('900')).toBeInTheDocument();   // rows_after
  });

  it('renders rows removed (before - after)', () => {
    render(<CleaningReport report={baseReport} />);
    // rows_removed = 1000 - 900 = 100
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders duplicates removed stat', () => {
    render(<CleaningReport report={baseReport} />);
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('shows "No rows removed" when before equals after', () => {
    const report: CleaningReportType = {
      ...baseReport,
      summary: { rows_before: 500, rows_after: 500, duplicates_removed: 0 },
    };
    render(<CleaningReport report={report} />);
    expect(screen.getByText(/no rows removed/i)).toBeInTheDocument();
  });

  it('renders data reduction percentage', () => {
    render(<CleaningReport report={baseReport} />);
    // removed = 100, before = 1000 → 10.0%
    expect(screen.getByText('10.0%')).toBeInTheDocument();
  });

  it('renders "0%" data reduction when rows_before is 0', () => {
    const report: CleaningReportType = {
      ...baseReport,
      summary: { rows_before: 0, rows_after: 0, duplicates_removed: 0 },
    };
    render(<CleaningReport report={report} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders operations list', () => {
    const report: CleaningReportType = {
      ...baseReport,
      operations: [
        { name: 'Remove Duplicates', rows_affected: 50, timestamp: '2026-08-18T00:00:00Z' },
        { name: 'Missing values: price (Median)', rows_affected: 0, timestamp: '2026-08-18T00:00:00Z' },
      ],
    };
    render(<CleaningReport report={report} />);

    expect(screen.getByText('Remove Duplicates')).toBeInTheDocument();
    expect(screen.getByText('Missing values: price (Median)')).toBeInTheDocument();
  });

  it('shows rows_affected count for operations with > 0 rows affected', () => {
    const report: CleaningReportType = {
      ...baseReport,
      operations: [
        { name: 'Remove Duplicates', rows_affected: 42, timestamp: '2026-08-18T00:00:00Z' },
      ],
    };
    render(<CleaningReport report={report} />);
    expect(screen.getByText(/42 rows affected/i)).toBeInTheDocument();
  });

  it('shows "—" for operations with 0 rows affected', () => {
    const report: CleaningReportType = {
      ...baseReport,
      operations: [
        { name: 'Missing values: col (Mode)', rows_affected: 0, timestamp: '2026-08-18T00:00:00Z' },
      ],
    };
    render(<CleaningReport report={report} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders CSV preview table when csvBase64 is provided', () => {
    const csv = makeCsvBase64(['name,score', 'Alice,95', 'Bob,88']);
    render(<CleaningReport report={baseReport} csvBase64={csv} />);

    // The <details> element contains the preview
    const details = screen.getByText(/cleaned data preview/i).closest('details')!;
    const table = within(details).getByRole('table');

    expect(table).toBeInTheDocument();
    // Header row
    expect(within(table).getByText('name')).toBeInTheDocument();
    expect(within(table).getByText('score')).toBeInTheDocument();
    // Data rows
    expect(within(table).getByText('Alice')).toBeInTheDocument();
    expect(within(table).getByText('88')).toBeInTheDocument();
  });

  it('does not render CSV preview when csvBase64 is not provided', () => {
    render(<CleaningReport report={baseReport} />);
    expect(screen.queryByText(/cleaned data preview/i)).not.toBeInTheDocument();
  });

  it('does not crash when csvBase64 is invalid base64', () => {
    expect(() =>
      render(<CleaningReport report={baseReport} csvBase64="!!!NOT_BASE64!!!" />),
    ).not.toThrow();
  });
});
