"use client";

import { useCallback, useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";
import { cn } from "@/lib/utils";
import { ACCEPTED_FILE_TYPES, aiApi } from "@/lib/api/ai";

interface FileUploaderProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

export function FileUploader({ onUpload, isUploading }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setTypeError(null);
      if (!aiApi.isAcceptedFile(file)) {
        setTypeError("Unsupported format. Please upload a CSV, XLSX, XLS, or JSON file.");
        return;
      }
      onUpload(file);
    },
    [onUpload],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-2xl">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center w-full p-12 mt-4 border-2 border-dashed rounded-3xl transition-all duration-300",
          isDragging
            ? "border-primary bg-primary/10 scale-[1.02]"
            : "border-border bg-card/50 hover:bg-card/80 hover:border-primary/40",
          isUploading && "opacity-60 pointer-events-none",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        role="button"
        aria-label="Upload dataset file"
        tabIndex={isUploading ? -1 : 0}
      >
        <input
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
          aria-label="Choose a file to upload"
        />

        {isUploading ? (
          <div
            className="flex flex-col items-center gap-5"
            role="status"
            aria-label="Uploading and profiling your dataset"
          >
            <ThinkingOrb
              state="searching"
              size={64}
              theme="auto"
              speed={0.9}
              aria-hidden="true"
            />
            {/* shklha 7lw f45 :) */}
            <div aria-live="polite" className="text-center">
              <h3 className="text-xl font-semibold font-sans">Profiling your dataset…</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Detecting missing values, outliers, and data types
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 pointer-events-none">
            <div className="p-4 rounded-full bg-primary/15 text-primary mb-1">
              <UploadCloud className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-semibold font-sans tracking-tight">
              Drop your dataset here
            </h3>
            <p className="text-muted-foreground text-center max-w-md text-sm">
              Upload your raw merchant or tabular data. The AI will profile the
              dataset, detect anomalies, and let you choose a cleaning pipeline.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded-full mt-1">
              <FileText className="w-4 h-4" />
              <span>CSV · XLSX · XLS · JSON</span>
            </div>
          </div>
        )}
      </div>

      {typeError && (
        <p className="text-destructive text-sm font-medium" role="alert">
          {typeError}
        </p>
      )}
    </div>
  );
}
