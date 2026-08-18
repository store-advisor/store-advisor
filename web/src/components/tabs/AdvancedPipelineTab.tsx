"use client";

import { useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Download, CheckCircle2, AlertCircle, Sliders } from "lucide-react";
import { DatasetProfile, isCleaningReportReady } from "@/lib/api/ai";
import { CleaningReport } from "@/components/CleaningReport";
import { StrategyDecisionTree } from "@/components/advanced/StrategyDecisionTree";
import { CustomCodeEditor } from "@/components/advanced/CustomCodeEditor";
import { useRunAdvancedPipeline, useDownloadAdvancedResult } from "@/lib/hooks/useAiApi";
import { TabResult } from "@/lib/hooks/useToolState";
import { AdvancedCleaningParams } from "@/lib/api/ai";
import { cn } from "@/lib/utils";

interface AdvancedPipelineTabProps {
  file: File;
  profile: DatasetProfile;
  result: TabResult | null;
  onResult: (result: TabResult) => void;
}

export function AdvancedPipelineTab({
  file,
  profile,
  result,
  onResult,
}: AdvancedPipelineTabProps) {
  const runMutation = useRunAdvancedPipeline();
  const downloadMutation = useDownloadAdvancedResult();
  const [runError, setRunError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [lastParams, setLastParams] = useState<AdvancedCleaningParams | null>(null);

  async function handleRun(params: AdvancedCleaningParams) {
    setRunError(null);
    setLastParams(params);
    try {
      const response = await runMutation.mutateAsync({ file, params });
      onResult({ response, params });
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Cleaning failed. Please try again.");
    }
  }

  async function handleDownload() {
    if (!lastParams) return;
    setDownloadError(null);
    try {
      await downloadMutation.mutateAsync({ file, params: lastParams });
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed.");
    }
  }

  return (
    <div className="flex flex-col gap-8 py-6">
      {/* ── Description ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 mt-0.5">
          <Sliders className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Per-Column Strategy Selection</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose Auto for profile-driven cleaning, or Manual to configure each column individually.
          </p>
        </div>
      </div>

      {/* ── DT ────────────────────────────────────────── */}
      <section aria-label="Step 1: Choose cleaning strategies">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-sm">01</span>
          Choose Cleaning Strategies
        </h3>
        <StrategyDecisionTree
          profile={profile}
          isRunning={runMutation.isPending}
          onRun={handleRun}
        />
      </section>

      {runError && (
        <div
          className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-xl text-sm"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{runError}</span>
        </div>
      )}

      {runMutation.isPending && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 bg-muted/30 border border-border/60 rounded-xl text-sm text-muted-foreground"
          aria-live="polite"
        >
          <ThinkingOrb state="solving" size={20} theme="auto" aria-hidden="true" />
          Running advanced cleaning pipeline…
        </div>
      )}

      {/* ── result ────────────────────────────────────────────────── */}
      {result &&
        !runMutation.isPending &&
        isCleaningReportReady(result.response.report) && (
        <section
          className="flex flex-col gap-6 animate-in fade-in duration-300"
          aria-label="Step 2: Cleaning result"
        >
          <div className="flex items-center gap-2 text-amber-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">
              {result.params?.mode === "auto"
                ? "Auto-Advanced cleaning complete"
                : "Manual strategy cleaning complete"}
            </span>
          </div>

          <CleaningReport
            report={result.response.report}
            csvBase64={result.response.cleaned_csv_base64}
          />

          <div className="flex items-center gap-3">
            <button
              id="advanced-download-btn"
              onClick={handleDownload}
              disabled={downloadMutation.isPending}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all",
                "bg-amber-500 text-black hover:bg-amber-400 active:scale-[0.98]",
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
                  Download Advanced-Cleaned CSV
                </>
              )}
            </button>
          </div>

          {downloadError && (
            <p className="text-destructive text-sm" role="alert">
              {downloadError}
            </p>
          )}
        </section>
      )}

      {/* ── CC ──────────────────────────────────────────── */}
      <section aria-label="Step 3: Custom Python cleaning">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-sm">03</span>
          Custom Python Cleaning{" "}
          <span className="text-xs text-muted-foreground font-normal">(optional)</span>
        </h3>
        <CustomCodeEditor file={file} advancedResult={result} />
      </section>
    </div>
  );
}
