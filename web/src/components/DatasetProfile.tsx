"use client";

import { DatasetProfile as DatasetProfileType } from "@/lib/api/ai";
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatasetProfileProps {
  profile: DatasetProfileType;
}

const FLAG_STYLES: Record<string, string> = {
  "high-missing": "bg-destructive/15 text-destructive",
  "some-missing": "bg-amber-500/15 text-amber-400",
  "has-duplicates": "bg-yellow-500/15 text-yellow-400",
  constant: "bg-muted text-muted-foreground",
};

const FLAG_LABELS: Record<string, string> = {
  "high-missing": "High Missing",
  "some-missing": "Some Missing",
  "has-duplicates": "Duplicates",
  constant: "Constant",
};

export function DatasetProfile({ profile }: DatasetProfileProps) {
  const healthStatus =
    profile.quality_score >= 80 ? "good" : profile.quality_score >= 50 ? "warning" : "bad";

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between bg-card border border-border p-5 rounded-2xl shadow-sm flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "p-3 rounded-xl",
              healthStatus === "good"
                ? "bg-green-500/10 text-green-500"
                : healthStatus === "warning"
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-destructive/10 text-destructive",
            )}
          >
            {healthStatus === "good" ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : healthStatus === "warning" ? (
              <AlertTriangle className="w-7 h-7" />
            ) : (
              <AlertCircle className="w-7 h-7" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold font-sans tracking-tight leading-none">
              {profile.filename}
            </h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">Dataset Profile</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Metric label="Rows" value={profile.dataset.rows.toLocaleString()} />
          <Metric label="Columns" value={profile.dataset.columns.toLocaleString()} />
          <Metric
            label="Duplicate Rows"
            value={profile.dataset.duplicate_rows.toLocaleString()}
            warn={profile.dataset.duplicate_rows > 0}
          />
          <div className="text-right">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
              Quality
            </div>
            <div
              className={cn(
                "text-3xl font-bold font-sans",
                healthStatus === "good"
                  ? "text-green-500"
                  : healthStatus === "warning"
                    ? "text-amber-500"
                    : "text-destructive",
              )}
            >
              {profile.quality_score}%
            </div>
          </div>
        </div>
      </div>

      {/* ── Column table ────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <Th>Column</Th>
              <Th>Type</Th>
              <Th right>Missing</Th>
              <Th right>Missing %</Th>
              <Th right>Unique</Th>
              <Th>Flags</Th>
            </tr>
          </thead>
          <tbody>
            {profile.columns.map((col, i) => (
              <tr
                key={col.name}
                className={cn(
                  "border-b border-border/50 last:border-0 transition-colors hover:bg-muted/20",
                  i % 2 === 0 ? "" : "bg-card",
                )}
              >
                <td className="px-4 py-3 font-mono font-medium text-foreground">{col.name}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-mono">
                    {col.dtype}
                  </span>
                </td>
                <Td right warn={col.missing_count > 0}>
                  {col.missing_count.toLocaleString()}
                </Td>
                <Td right warn={col.missing_percentage > 20}>
                  {col.missing_percentage.toFixed(1)}%
                </Td>
                <Td right>{col.unique_count.toLocaleString()}</Td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {col.quality_flags.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      col.quality_flags.map((f) => (
                        <span
                          key={f}
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            FLAG_STYLES[f] ?? "bg-muted text-muted-foreground",
                          )}
                        >
                          {FLAG_LABELS[f] ?? f}
                        </span>
                      ))
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
        right ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  warn,
}: {
  children: React.ReactNode;
  right?: boolean;
  warn?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 font-mono",
        right ? "text-right" : "text-left",
        warn ? "text-amber-400 font-medium" : "text-muted-foreground",
      )}
    >
      {children}
    </td>
  );
}

function Metric({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className={cn("text-xl font-bold font-mono", warn ? "text-amber-400" : "text-foreground")}>
        {value}
      </div>
    </div>
  );
}
