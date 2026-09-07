"use client";

import { useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Wand2, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { DatasetProfile, isCleaningReportReady } from "@/lib/api/ai";
import { CleaningReport } from "@/components/CleaningReport";
import { useRunBasicPipeline, useDownloadBasicResult } from "@/lib/hooks/useAiApi";
import { TabResult } from "@/lib/hooks/useToolState";
import { cn } from "@/lib/utils";

interface BasicPipelineTabProps {
  file: File;
  profile: DatasetProfile;
  result: TabResult | null;
  onResult: (result: TabResult) => void;
}

export function BasicPipelineTab({ file, profile, result, onResult }: BasicPipelineTabProps) {
  const runMutation = useRunBasicPipeline();
  const downloadMutation = useDownloadBasicResult();
  const [runError, setRunError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleRun() {
    setRunError(null);
    try {
      const response = await runMutation.mutateAsync(file);
      onResult({ response });
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Cleaning failed. Please try again.");
    }
  }

  async function handleDownload() {
    setDownloadError(null);
    try {
      await downloadMutation.mutateAsync(file);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed.");
    }
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* ── Description ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
        <div className="p-2 rounded-lg bg-green-500/10 text-green-500 mt-0.5">
          <Wand2 className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Fixed Sequence Pipeline</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deduplication → Median/Mode Imputation → IQR Outlier Removal
          </p>
        </div>
      </div>

      {/* ── Raw data preview ────────────────────────────────────────────── */}
      <details className="group bg-card border border-border rounded-2xl overflow-hidden">
        <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-2">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Raw Data Preview (first 20 rows)
        </summary>
        <p className="px-4 py-3 text-sm text-muted-foreground italic border-t border-border">
          Preview is available after cleaning via the report below.
        </p>
      </details>

      {/* ── Run button ──────────────────────────────────────────────────── */}
      {!result && (
        <div>
          <button
            id="basic-run-btn"
            onClick={handleRun}
            disabled={runMutation.isPending}
            className={cn(
              "flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold transition-all duration-200",
              "bg-green-600 text-white hover:bg-green-500 active:scale-[0.98]",
              runMutation.isPending && "opacity-70 cursor-not-allowed",
            )}
            aria-busy={runMutation.isPending}
          >
            {runMutation.isPending ? (
              <>
                <ThinkingOrb
                  state="solving"
                  size={20}
                  theme="auto"
                  speed={1}
                  aria-hidden="true"
                />
                <span aria-live="polite">Cleaning with Basic pipeline…</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Run Basic Cleaning
              </>
            )}
          </button>

          {runError && (
            <div
              className="mt-3 flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-xl text-sm"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{runError}</span>
            </div>
          )}
        </div>
      )}

      {runMutation.isPending && result && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 bg-muted/30 border border-border/60 rounded-xl text-sm text-muted-foreground"
          aria-live="polite"
        >
          <ThinkingOrb state="solving" size={20} theme="auto" aria-hidden="true" />
          Cleaning with Basic pipeline…
        </div>
      )}

      {/* ── Result ──────────────────────────────────────────────────────── */}
      {result &&
        !runMutation.isPending &&
        isCleaningReportReady(result.response.report) && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">Cleaning complete</span>
          </div>

          <CleaningReport
            report={result.response.report}
            csvBase64={result.response.cleaned_csv_base64}
          />

          {/* Download */}
          <div className="flex items-center gap-3">
            <button
              id="basic-download-btn"
              onClick={handleDownload}
              disabled={downloadMutation.isPending}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all",
                "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
                downloadMutation.isPending && "opacity-70 cursor-not-allowed",
              )}
              aria-busy={downloadMutation.isPending}
            >
              {downloadMutation.isPending ? (
                <>
                  <ThinkingOrb state="shaping" size={20} theme="auto" aria-hidden="true" />
                  <span aria-live="polite">Preparing download…</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Cleaned CSV
                </>
              )}
            </button>

            <button
              onClick={handleRun}
              disabled={runMutation.isPending}
              className="px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 transition-colors"
            >
              Re-run
            </button>
          </div>

          {downloadError && (
            <p className="text-destructive text-sm" role="alert">
              {downloadError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
