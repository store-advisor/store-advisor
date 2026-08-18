import { useMutation } from '@tanstack/react-query';
import { aiApi, AdvancedCleaningParams } from '../api/ai';

export function useProfileDataset() {
  return useMutation({
    mutationFn: (file: File) => aiApi.profileDataset(file),
  });
}

export function useRunBasicPipeline() {
  return useMutation({
    mutationFn: (file: File) => aiApi.cleanDataset(file, 'basic'),
  });
}

export function useRunAdvancedPipeline() {
  return useMutation({
    mutationFn: ({
      file,
      params,
    }: {
      file: File;
      params: AdvancedCleaningParams;
    }) => aiApi.cleanDataset(file, 'advanced', params),
  });
}

export function useDownloadBasicResult() {
  return useMutation({
    mutationFn: (file: File) => aiApi.downloadCleanDataset(file, 'basic'),
    onSuccess: (blob, file) => triggerDownload(blob, `basic_cleaned_${file.name}`),
  });
}

export function useDownloadAdvancedResult() {
  return useMutation({
    mutationFn: ({
      file,
      params,
    }: {
      file: File;
      params: AdvancedCleaningParams;
    }) => aiApi.downloadCleanDataset(file, 'advanced', params),
    onSuccess: (blob, { file }) =>
      triggerDownload(blob, `advanced_cleaned_${file.name}`),
  });
}


export function useRunCustomCode() {
  return useMutation({
    mutationFn: async (_params: { code: string; file: File }) => {
      throw new Error(
        'ENDPOINT_NOT_AVAILABLE: The custom Python execution endpoint is not yet ' +
          'available in the FastAPI HTTP API. This feature requires a server-side ' +
          'endpoint (e.g. POST /api/clean/custom) that is not documented in ' +
          'API_DOCUMENTATION.md. Contact the FastAPI team to ship this endpoint.',
      );
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/\.(xlsx?|json)$/, '.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
