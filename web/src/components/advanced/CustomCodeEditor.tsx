"use client";

import { useState, useRef } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Code2, Play, AlertCircle, TriangleAlert, Info } from "lucide-react";
import { useRunCustomCode } from "@/lib/hooks/useAiApi";
import { TabResult } from "@/lib/hooks/useToolState";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// da monaco ely hy5lek tktb kod 
// 3amlh bs m4 mktn3 beh XD
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-72 flex items-center justify-center bg-[#1e1e1e] rounded-xl text-muted-foreground text-sm">
      Loading editor…
    </div>
  ),
});

const DEFAULT_CODE = `# Your custom cleaning code
# The DataFrame is available as \`df\`
# Make sure the final result is stored in \`df\`

# Example:
# df = df.dropna(subset=["important_column"])
# df["price"] = df["price"].clip(lower=0)
# df = df[df["quantity"] > 0]
`;

interface CustomCodeEditorProps {
  file: File;
  advancedResult: TabResult | null;
}

export function CustomCodeEditor({ file, advancedResult }: CustomCodeEditorProps) {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [runError, setRunError] = useState<string | null>(null);
  const runMutation = useRunCustomCode();

  async function handleRun() {
    setRunError(null);
    try {
      await runMutation.mutateAsync({ code, file });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setRunError(msg);
    }
  }

  const isEndpointMissing = runError?.startsWith("ENDPOINT_NOT_AVAILABLE");

  return (
    <div className="flex flex-col gap-4">
      {/* Chaining notice */}
      <div
        className={cn(
          "flex items-start gap-2 p-3 rounded-xl text-sm border",
          advancedResult
            ? "bg-primary/5 border-primary/20 text-foreground"
            : "bg-muted/30 border-border text-muted-foreground",
        )}
      >
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          {advancedResult
            ? "This code will run on top of your Advanced Step 2 result."
            : "No Step 2 result yet — this code will run on the original upload."}
        </span>
      </div>

      {/* Monaco editor */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-inner">
        <div className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] border-b border-[#333]">
          <Code2 className="w-4 h-4 text-[#569cd6]" />
          <span className="text-xs font-mono text-[#9cdcfe]">custom_cleaning.py</span>
          <span className="ml-auto text-[10px] text-[#666]">Python 3 · pandas/numpy available</span>
        </div>
        <MonacoEditor
          height="300px"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val ?? "")}
          options={{
            fontSize: 13,
            fontFamily: "'IBM Plex Mono', 'Fira Code', 'Consolas', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            renderLineHighlight: "line",
            tabSize: 4,
            wordWrap: "on",
          }}
        />
      </div>

      {/* Run button */}
      <div className="flex items-center gap-3">
        <button
          id="custom-run-btn"
          onClick={handleRun}
          disabled={runMutation.isPending}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all",
            "shadow-color text-white hover:sidebar-primary active:scale-[0.98]",
            runMutation.isPending && "opacity-70 cursor-not-allowed",
          )}
          aria-busy={runMutation.isPending}
        >
          {runMutation.isPending ? (
            <>
              <ThinkingOrb state="solving" size={20} theme="auto" aria-hidden="true" />
              <span aria-live="polite">Executing your code…</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Custom Code
            </>
          )}
        </button>
      </div>

      {/* Error display */}
      {runError && (
        <div
          role="alert"
          className={cn(
            "rounded-xl border p-4 text-sm",
            isEndpointMissing
              ? "bg-amber-500/8 border-amber-500/30"
              : "bg-destructive/8 border-destructive/30",
          )}
        >
          {isEndpointMissing ? (
            <>
              <div className="flex items-center gap-2 font-semibold text-amber-400 mb-2">
                <TriangleAlert className="w-4 h-4" />
                Endpoint Not Yet Available
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The custom Python execution endpoint is not yet available in the FastAPI HTTP
                API. The editor is ready — contact the FastAPI team to ship{" "}
                <code className="font-mono bg-muted px-1 rounded">POST /api/clean/custom</code>{" "}
                to enable this feature.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 font-semibold text-destructive mb-2">
                <AlertCircle className="w-4 h-4" />
                Error in your code
              </div>
              <pre className="font-mono text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg overflow-x-auto">
                {runError}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
