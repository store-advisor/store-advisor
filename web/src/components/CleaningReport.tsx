"use client";

import { CleaningReport as CleaningReportType } from "@/lib/api/ai";
import { CheckCircle2, XCircle, TrendingDown, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface CleaningReportProps {
  report: CleaningReportType;
  csvBase64?: string;
}

export function CleaningReport({ report, csvBase64 }: CleaningReportProps) {
  if (!report?.summary) return null;

  const { summary } = report;
  const removed = summary.rows_before - summary.rows_after;
  const preview = csvBase64 ? decodePreview(csvBase64) : null;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportMetric
          label="Pipeline"
          value={report.pipeline.replace(/_/g, " ")}
          mono
        />
        <ReportMetric
          label="Rows Before"
          value={summary.rows_before.toLocaleString()}
        />
        <ReportMetric
          label="Rows After"
          value={summary.rows_after.toLocaleString()}
        />
        <ReportMetric
          label="Rows Removed"
          value={removed.toLocaleString()}
          warn={removed > 0}
        />
      </div>

      {report.operations.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/30">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Operations Applied
            </h4>
          </div>
          <ul className="divide-y divide-border/50">
            {report.operations.map((op, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  <span className="font-medium">{op.name}</span>
                </div>
                <span className="font-mono text-muted-foreground text-xs">
                  {op.rows_affected > 0 ? `${op.rows_affected.toLocaleString()} rows affected` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── ML59 ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={<TrendingDown className="w-4 h-4" />}
          label="Duplicates Removed"
          value={summary.duplicates_removed.toLocaleString()}
        />
        <StatCard
          icon={removed > 0 ? <XCircle className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
          label="Net Row Change"
          value={removed === 0 ? "No rows removed" : `-${removed.toLocaleString()} rows`}
          warn={removed > 0}
        />
        <StatCard
          icon={<Layers className="w-4 h-4" />}
          label="Data Reduction"
          value={
            summary.rows_before > 0
              ? `${((removed / summary.rows_before) * 100).toFixed(1)}%`
              : "0%"
          }
        />
      </div>

      {/* ── Cleaned data preview ────────────────────────────────────────── */}
      {preview && (
        <details className="group bg-card border border-border rounded-2xl overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-2">
            <span className="group-open:rotate-90 transition-transform">▶</span>
            Cleaned Data Preview (first {preview.length} rows)
          </summary>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30">
                  {preview[0]?.map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(1).map((row, i) => (
                  <tr
                    key={i}
                    className="border-t border-border/40 hover:bg-muted/10 transition-colors"
                  >
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

// ─── Sub-comp ───────────────────────────────────────────────────────────

function ReportMetric({
  label,
  value,
  mono,
  warn,
}: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="bg-muted/30 border border-border/60 rounded-xl px-4 py-3">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={cn(
          "text-lg font-bold",
          mono ? "font-mono capitalize" : "",
          warn ? "text-amber-400" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 bg-card border border-border/60 rounded-xl px-4 py-3">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </div>
        <div className={cn("text-sm font-semibold font-mono mt-0.5", warn ? "text-amber-400" : "text-foreground")}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decodePreview(base64: string): string[][] {
  try {
    const csv = atob(base64);
    const lines = csv.split("\n").filter(Boolean).slice(0, 21); // header + 20 rows
    return lines.map((line) =>
      line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")),
    );
  } catch {
    return [];
  }
}
