/**
 * Hook tests for useToolState
 * Uses @testing-library/react's renderHook to test the hook in isolation.
 */

import { renderHook, act } from '@testing-library/react';
import { useToolState } from '@/lib/hooks/useToolState';
import type { DatasetProfile } from '@/lib/api/ai';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockFile = new File(['a,b\n1,2'], 'data.csv', { type: 'text/csv' });

const mockProfile: DatasetProfile = {
  filename: 'data.csv',
  quality_score: 90,
  dataset: { rows: 100, columns: 2, duplicate_rows: 0 },
  columns: [
    {
      name: 'a',
      dtype: 'int64',
      missing_count: 0,
      missing_percentage: 0,
      unique_count: 100,
      quality_flags: [],
    },
  ],
};

const mockTabResult = {
  response: {
    report: {
      pipeline: 'basic',
      operations: [],
      summary: { rows_before: 100, rows_after: 95, duplicates_removed: 5 },
    },
    cleaned_csv_base64: btoa('a,b\n1,2'),
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useToolState()', () => {
  it('initialises all state to null', () => {
    const { result } = renderHook(() => useToolState());

    expect(result.current.uploadedFile).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.basicResult).toBeNull();
    expect(result.current.advancedResult).toBeNull();
    expect(result.current.customResult).toBeNull();
  });

  it('setUploadedFile updates uploadedFile', () => {
    const { result } = renderHook(() => useToolState());

    act(() => {
      result.current.setUploadedFile(mockFile);
    });

    expect(result.current.uploadedFile).toBe(mockFile);
  });

  it('setProfile updates profile', () => {
    const { result } = renderHook(() => useToolState());

    act(() => {
      result.current.setProfile(mockProfile);
    });

    expect(result.current.profile).toEqual(mockProfile);
  });

  it('setBasicResult updates basicResult', () => {
    const { result } = renderHook(() => useToolState());

    act(() => {
      result.current.setBasicResult(mockTabResult);
    });

    expect(result.current.basicResult).toEqual(mockTabResult);
  });

  it('setAdvancedResult updates advancedResult', () => {
    const { result } = renderHook(() => useToolState());

    act(() => {
      result.current.setAdvancedResult(mockTabResult);
    });

    expect(result.current.advancedResult).toEqual(mockTabResult);
  });

  it('setCustomResult updates customResult', () => {
    const { result } = renderHook(() => useToolState());

    act(() => {
      result.current.setCustomResult({ rowsBefore: 100, rowsAfter: 80 });
    });

    expect(result.current.customResult).toEqual({ rowsBefore: 100, rowsAfter: 80 });
  });

  it('setCustomResult stores error string', () => {
    const { result } = renderHook(() => useToolState());

    act(() => {
      result.current.setCustomResult({ rowsBefore: 0, rowsAfter: 0, error: 'oops' });
    });

    expect(result.current.customResult?.error).toBe('oops');
  });

  it('reset() clears all state back to null', () => {
    const { result } = renderHook(() => useToolState());

    act(() => {
      result.current.setUploadedFile(mockFile);
      result.current.setProfile(mockProfile);
      result.current.setBasicResult(mockTabResult);
      result.current.setAdvancedResult(mockTabResult);
      result.current.setCustomResult({ rowsBefore: 10, rowsAfter: 8 });
    });

    // Sanity check — state is populated
    expect(result.current.uploadedFile).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.uploadedFile).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.basicResult).toBeNull();
    expect(result.current.advancedResult).toBeNull();
    expect(result.current.customResult).toBeNull();
  });

  it('setters are stable references (useCallback)', () => {
    const { result, rerender } = renderHook(() => useToolState());

    const settersBefore = {
      setUploadedFile: result.current.setUploadedFile,
      setProfile: result.current.setProfile,
      setBasicResult: result.current.setBasicResult,
      setAdvancedResult: result.current.setAdvancedResult,
      setCustomResult: result.current.setCustomResult,
      reset: result.current.reset,
    };

    // Trigger a re-render by updating state
    act(() => {
      result.current.setUploadedFile(mockFile);
    });

    rerender();

    // reset is explicitly wrapped in useCallback — verify it's stable
    expect(result.current.reset).toBe(settersBefore.reset);
  });
});
