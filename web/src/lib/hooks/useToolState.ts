"use client";

import { useState, useCallback } from 'react';
import type { DatasetProfile, CleanDatasetResponse, AdvancedCleaningParams } from '../api/ai';

// ─── Per-tab result shape ─────────────────────────────────────────────────────

export interface TabResult {
  response: CleanDatasetResponse;
  params?: AdvancedCleaningParams;
}

export interface ToolState {
  uploadedFile: File | null;
  profile: DatasetProfile | null;

  basicResult: TabResult | null;
  advancedResult: TabResult | null;
  customResult: {
    rowsBefore: number;
    rowsAfter: number;
    error?: string;
  } | null;

  // Setters
  setUploadedFile: (file: File | null) => void;
  setProfile: (profile: DatasetProfile | null) => void;
  setBasicResult: (result: TabResult | null) => void;
  setAdvancedResult: (result: TabResult | null) => void;
  setCustomResult: (result: ToolState['customResult']) => void;
  reset: () => void;
}

export function useToolState(): ToolState {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [basicResult, setBasicResult] = useState<TabResult | null>(null);
  const [advancedResult, setAdvancedResult] = useState<TabResult | null>(null);
  const [customResult, setCustomResult] = useState<ToolState['customResult']>(null);

  const reset = useCallback(() => {
    setUploadedFile(null);
    setProfile(null);
    setBasicResult(null);
    setAdvancedResult(null);
    setCustomResult(null);
  }, []);

  return {
    uploadedFile,
    profile,
    basicResult,
    advancedResult,
    customResult,
    setUploadedFile,
    setProfile,
    setBasicResult,
    setAdvancedResult,
    setCustomResult,
    reset,
  };
}
