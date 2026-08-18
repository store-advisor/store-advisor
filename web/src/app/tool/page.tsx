"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ThinkingOrb } from "thinking-orbs";
import { Database, UploadCloud, RefreshCw, AlertCircle } from "lucide-react";
import { FileUploader } from "@/components/FileUploader";
import { DatasetProfile } from "@/components/DatasetProfile";
import { BasicPipelineTab } from "@/components/tabs/BasicPipelineTab";
import { AdvancedPipelineTab } from "@/components/tabs/AdvancedPipelineTab";
import { AgentPipelineTab } from "@/components/tabs/AgentPipelineTab";
import { useProfileDataset } from "@/lib/hooks/useAiApi";
import { useUploadFile, useRecordSelection } from "@/lib/hooks/useNestApi";
import { useToolState } from "@/lib/hooks/useToolState";
import { cn } from "@/lib/utils";

type TabId = "basic" | "advanced" | "agent";

const TABS: { id: TabId; label: string; color: string }[] = [
  { id: "basic", label: "Basic Pipeline", color: "text-green-400" },
  { id: "advanced", label: "Advanced Pipeline", color: "text-amber-400" },
  { id: "agent", label: "Agent Pipeline", color: "text-red-400" },
];

export default function ToolPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawTab = searchParams.get("tab");
  const activeTab: TabId =
    rawTab === "advanced" || rawTab === "agent" ? rawTab : "basic";

  const state = useToolState();
  const profileMutation = useProfileDataset();
  const uploadMutation = useUploadFile();
  const selectionMutation = useRecordSelection();
  const [uploadError, setUploadError] = useState<string | null>(null);

  function setTab(id: TabId) {
    router.replace(`/tool?tab=${id}`, { scroll: false });
  }

  const handleUpload = useCallback(
    async (file: File) => {
      setUploadError(null);
      try {
        const sessionId = crypto.randomUUID();
        const [profile] = await Promise.all([
          profileMutation.mutateAsync(file),
          uploadMutation
            .mutateAsync({ file, sessionId })
            .catch((e) => { console.warn('NestJS upload audit failed (non-blocking):', e); return null; }),
        ]);
        // Only set state after both succeed (profile is the critical one)
        state.setUploadedFile(file);
        state.setProfile(profile);
      } catch (err) {
        console.error('Upload/profile failed:', err);
        setUploadError(
          err instanceof Error ? err.message : "Failed to profile the dataset. Please try again.",
        );
      }
    },
    [profileMutation, uploadMutation, state],
  );

  const handleReset = useCallback(() => {
    state.reset();
    setUploadError(null);
    router.replace("/tool?tab=basic", { scroll: false });
  }, [state, router]);

  const isUploading = profileMutation.isPending || uploadMutation.isPending;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── el7eta ele fo2 ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 bg-primary rounded-lg text-primary-foreground group-hover:bg-primary/90 transition-colors">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm font-sans">Store Advisor</span>
          </a>

          {state.profile && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              New dataset
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        {/* ── Upload zone  ────────────── */}
        {!state.profile && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold font-sans tracking-tight mb-2">
                Upload your dataset
              </h1>
              <p className="text-muted-foreground">
                Supports CSV, XLSX, XLS, and JSON — up to 50MB
              </p>
            </div>

            {isUploading ? (
              <div
                className="flex flex-col items-center gap-5"
                role="status"
                aria-label="Profiling dataset"
              >
                <ThinkingOrb
                  state="searching"
                  size={64}
                  theme="auto"
                  speed={0.85}
                  aria-hidden="true"
                />
                <div aria-live="polite" className="text-center">
                  <p className="font-semibold">Profiling your dataset…</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Detecting missing values, outliers, and data types
                  </p>
                </div>
              </div>
            ) : (
              <FileUploader onUpload={handleUpload} isUploading={false} />
            )}

            {uploadError && (
              <div
                className="mt-4 flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-xl text-sm max-w-md"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Tool — profile + tabs ────────────────────────────────────── */}
        {state.profile && state.uploadedFile && (
          <div className="flex flex-col gap-8">
            {/* 3rd gz2 mn eldata */}
            <DatasetProfile profile={state.profile} />

            {/* Tab strip */}
            <div>
              <div
                role="tablist"
                aria-label="Cleaning pipelines"
                className="flex gap-1 bg-muted/30 p-1 rounded-2xl w-fit"
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={activeTab === tab.id}
                    aria-controls={`panel-${tab.id}`}
                    onClick={() => setTab(tab.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
                      activeTab === tab.id
                        ? "bg-card border border-border shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab panels */}
              <div
                id="panel-basic"
                role="tabpanel"
                aria-labelledby="tab-basic"
                hidden={activeTab !== "basic"}
              >
                <BasicPipelineTab
                  file={state.uploadedFile}
                  profile={state.profile}
                  result={state.basicResult}
                  onResult={state.setBasicResult}
                />
              </div>

              <div
                id="panel-advanced"
                role="tabpanel"
                aria-labelledby="tab-advanced"
                hidden={activeTab !== "advanced"}
              >
                <AdvancedPipelineTab
                  file={state.uploadedFile}
                  profile={state.profile}
                  result={state.advancedResult}
                  onResult={state.setAdvancedResult}
                />
              </div>

              <div
                id="panel-agent"
                role="tabpanel"
                aria-labelledby="tab-agent"
                hidden={activeTab !== "agent"}
              >
                <AgentPipelineTab profile={state.profile} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
