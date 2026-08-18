"use client";

import { useState, useMemo } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Check, ChevronDown, ChevronRight, Sparkles, Sliders } from "lucide-react";
import { DatasetProfile, ColumnProfile, AdvancedCleaningParams } from "@/lib/api/ai";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StrategySelections {
  dup_strategy: "remove" | "keep";
  missing_strategies: Record<string, string>;
  outlier_strategies: Record<string, string>;
}

interface StrategyDecisionTreeProps {
  profile: DatasetProfile;
  isRunning: boolean;
  onRun: (params: AdvancedCleaningParams) => void;
}

type BranchMode = "auto" | "manual";

function isNumericDtype(dtype: string) {
  return /int|float|double|decimal|number/i.test(dtype);
}

// da fe elmosta2bl 3ndy fkra en e7na n5ly ai hwa ely y3ml recommendation anhy a7sn
function getRecommendedMissingStrategy(col: ColumnProfile): string {
  return isNumericDtype(col.dtype) ? "Median" : "Mode";
}

const RECOMMENDED_DUP = "remove";
const RECOMMENDED_OUTLIER = "Remove";

// ─── Component ────────────────────────────────────────────────────────────────

export function StrategyDecisionTree({
  profile,
  isRunning,
  onRun,
}: StrategyDecisionTreeProps) {
  const [mode, setMode] = useState<BranchMode | null>(null);
  // Each category section has its own independent open state so
  // all three can be open at once — avoids the hidden-children click bug
  const [dupOpen, setDupOpen] = useState(true);
  const [missingOpen, setMissingOpen] = useState(true);
  const [outliersOpen, setOutliersOpen] = useState(true);
  const [dupStrategy, setDupStrategy] = useState<"remove" | "keep">(RECOMMENDED_DUP);
  const [missingStrategies, setMissingStrategies] = useState<Record<string, string>>({});
  const [outlierStrategies, setOutlierStrategies] = useState<Record<string, string>>({});

  const colsWithMissing = useMemo(
    () => profile.columns.filter((c) => c.missing_count > 0),
    [profile],
  );
  const numericCols = useMemo(
    () => profile.columns.filter((c) => isNumericDtype(c.dtype)),
    [profile],
  );

  function getMissingStrategy(colName: string, col: ColumnProfile) {
    return missingStrategies[colName] ?? getRecommendedMissingStrategy(col);
  }

  function getOutlierStrategy(colName: string) {
    return outlierStrategies[colName] ?? RECOMMENDED_OUTLIER;
  }

  function handleRun() {
    if (mode === "auto") {
      onRun({ mode: "auto" });
      return;
    }
    const missing: Record<string, string> = {};
    for (const col of colsWithMissing) {
      missing[col.name] = getMissingStrategy(col.name, col);
    }
    const outliers: Record<string, string> = {};
    for (const col of numericCols) {
      outliers[col.name] = getOutlierStrategy(col.name);
    }
    onRun({
      mode: "manual",
      dup_strategy: dupStrategy,
      missing_strategies: missing,
      outlier_strategies: outliers,
    });
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Root node */}
      <TreeNode label="Choose Run Mode" depth={0} isRoot>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {/* Auto branch */}
          <ModeCard
            selected={mode === "auto"}
            recommended
            onClick={() => setMode("auto")}
            icon={<Sparkles className="w-5 h-5" />}
            title="Auto-Advanced"
            subtitle="Profile-driven, no configuration"
            description="The AI analyses your dataset and applies the best strategy per column automatically."
            color="green"
          />
          {/* Manual branch */}
          <ModeCard
            selected={mode === "manual"}
            onClick={() => setMode("manual")}
            icon={<Sliders className="w-5 h-5" />}
            title="Manual Strategies"
            subtitle="Configure per-column decisions"
            description="You choose the cleaning strategy for each column, duplicate handling, and outlier treatment."
            color="amber"
          />
        </div>
      </TreeNode>

      {mode === "manual" && (
        <>
          {/* Duplicates */}
          <TreeNode
            label="Duplicates"
            depth={1}
            status={dupOpen ? "active" : "selected"}
            isOpen={dupOpen}
            onToggle={() => setDupOpen((o) => !o)}
          >
            <div className="mt-3 flex flex-wrap gap-2">
              {(["remove", "keep"] as const).map((opt) => (
                <LeafOption
                  key={opt}
                  label={opt === "remove" ? "Remove all duplicates" : "Keep duplicates"}
                  recommended={opt === RECOMMENDED_DUP}
                  selected={dupStrategy === opt}
                  onClick={() => setDupStrategy(opt)}
                />
              ))}
            </div>
          </TreeNode>

          {/* Missing values */}
          <TreeNode
            label="Missing Values"
            depth={1}
            status={missingOpen ? "active" : "selected"}
            isOpen={missingOpen}
            onToggle={() => setMissingOpen((o) => !o)}
          >
            {colsWithMissing.length === 0 ? (
              <p className="mt-2 text-sm text-green-500 flex items-center gap-1">
                <Check className="w-4 h-4" /> No missing values detected
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                {colsWithMissing.map((col) => {
                  const isNum = isNumericDtype(col.dtype);
                  const opts = isNum
                    ? ["Median", "Mean", "Drop column", "Fill with 0"]
                    : ["Mode", "Fill with 'Unknown'", "Drop column"];
                  const current = getMissingStrategy(col.name, col);
                  return (
                    <div key={col.name}>
                      <TreeNode
                        label={
                          <span className="font-mono text-sm">
                            {col.name}
                            <span className="ml-2 text-xs text-muted-foreground font-sans">
                              {col.missing_count.toLocaleString()} missing (
                              {col.missing_percentage.toFixed(1)}%)
                            </span>
                          </span>
                        }
                        depth={2}
                        status="selected"
                      >
                        <div className="mt-2 flex flex-wrap gap-2">
                          {opts.map((opt) => (
                            <LeafOption
                              key={opt}
                              label={opt}
                              recommended={opt === getRecommendedMissingStrategy(col)}
                              selected={current === opt}
                              onClick={() =>
                                setMissingStrategies((prev) => ({
                                  ...prev,
                                  [col.name]: opt,
                                }))
                              }
                            />
                          ))}
                        </div>
                      </TreeNode>
                    </div>
                  );
                })}
              </div>
            )}
          </TreeNode>

          {/* Outliers */}
          <TreeNode
            label="Outliers"
            depth={1}
            status={outliersOpen ? "active" : "selected"}
            isOpen={outliersOpen}
            onToggle={() => setOutliersOpen((o) => !o)}
          >
            {numericCols.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No numeric columns found.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                {numericCols.map((col) => {
                  const current = getOutlierStrategy(col.name);
                  return (
                    <div key={col.name}>
                      <TreeNode
                        label={
                          <span className="font-mono text-sm">
                            {col.name}
                            <span className="ml-2 text-xs text-muted-foreground font-sans">
                              numeric · {col.dtype}
                            </span>
                          </span>
                        }
                        depth={2}
                        status="selected"
                      >
                        <div className="mt-2 flex flex-wrap gap-2">
                          {["Remove", "Cap (Winsorise)", "Keep"].map((opt) => (
                            <LeafOption
                              key={opt}
                              label={opt}
                              recommended={opt === RECOMMENDED_OUTLIER}
                              selected={current === opt}
                              onClick={() =>
                                setOutlierStrategies((prev) => ({
                                  ...prev,
                                  [col.name]: opt,
                                }))
                              }
                            />
                          ))}
                        </div>
                      </TreeNode>
                    </div>
                  );
                })}
              </div>
            )}
          </TreeNode>
        </>
      )}

      {/* ── Run button ──────────────────────────────────────────────────── */}
      {mode !== null && (
        <div className="mt-6 ml-0">
          <button
            id="advanced-run-btn"
            onClick={handleRun}
            disabled={isRunning}
            className={cn(
              "flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold transition-all duration-200",
              "sidebar-primary text-black hover:shadow-color active:scale-[0.98]",
              isRunning && "opacity-70 cursor-not-allowed",
            )}
            aria-busy={isRunning}
          >
            {isRunning ? (
              <>
                <ThinkingOrb state="solving" size={20} theme="auto" aria-hidden="true" />
                <span aria-live="polite">
                  {mode === "auto"
                    ? "Running Auto-Advanced pipeline…"
                    : "Cleaning with your strategies…"}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {mode === "auto" ? "Run Auto-Advanced Pipeline" : "Run with Selected Strategies"}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-comp ───────────────────────────────────────────────────────────

interface TreeNodeProps {
  label: React.ReactNode;
  depth: number;
  children?: React.ReactNode;
  isRoot?: boolean;
  status?: "untouched" | "selected" | "active" | "complete" | "error";
  isOpen?: boolean;
  onToggle?: () => void;
}

function TreeNode({
  label,
  depth,
  children,
  isRoot,
  status = "untouched",
  isOpen,
  onToggle,
}: TreeNodeProps) {
  const indent = depth * 24;
  const isCollapsible = onToggle !== undefined;

  return (
    <div className="relative" style={{ paddingLeft: indent }}>
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 border-l-2 border-border/40"
          style={{ left: (depth - 1) * 24 + 11 }}
        />
      )}

      <div
        className={cn(
          "relative flex items-center gap-2 py-2",
          isCollapsible && "cursor-pointer select-none",
        )}
        onClick={isCollapsible ? onToggle : undefined}
        role={isCollapsible ? "button" : undefined}
        aria-expanded={isCollapsible ? isOpen : undefined}
      >
        {depth > 0 && (
          <div
            className="absolute border-t-2 border-border/40"
            style={{ left: (depth - 1) * 24 + 11, width: 16, top: "50%" }}
          />
        )}

        <div
          className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
            isRoot
              ? "bg-primary border-primary"
              : status === "active"
                ? "border-amber-500"
                : status === "selected" || status === "complete"
                  ? "bg-primary/20 border-primary"
                  : "border-border",
          )}
        >
          {isRoot ? (
            <div className="w-2 h-2 rounded-full bg-primary-foreground" />
          ) : status === "active" ? (
            <ThinkingOrb state="solving" size={20} theme="auto" aria-hidden="true" />
          ) : status === "selected" || status === "complete" ? (
            <Check className="w-3 h-3 text-primary" />
          ) : null}
        </div>

        {/* Label */}
        <span className={cn("text-sm font-medium", isRoot ? "text-base font-semibold" : "")}>
          {label}
        </span>

        {/* Collapse toggle */}
        {isCollapsible && (
          <span className="ml-auto text-muted-foreground">
            {isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}
      </div>

      {children && (
        <div
          className={cn(
            "pb-4",
            isCollapsible && !isOpen && "hidden",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface ModeCardProps {
  selected: boolean;
  recommended?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  color: "green" | "amber";
}

function ModeCard({
  selected,
  recommended,
  onClick,
  icon,
  title,
  subtitle,
  description,
  color,
}: ModeCardProps) {
  const colorClasses = {
    green: {
      border: selected ? "border-green-500/70 bg-green-500/5" : "border-border",
      icon: "bg-green-500/10 text-green-500",
      check: "bg-green-500 border-green-500",
      badge: "bg-green-500/15 text-green-400",
    },
    amber: {
      border: selected ? "border-amber-500/70 bg-amber-500/5" : "border-border",
      icon: "bg-amber-500/10 text-amber-500",
      check: "bg-amber-500 border-amber-500",
      badge: "bg-amber-500/15 text-amber-400",
    },
  }[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-3 p-5 rounded-2xl border-2 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md",
        colorClasses.border,
      )}
    >
      {recommended && (
        <span
          className={cn(
            "absolute -top-3 left-4 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full",
            colorClasses.badge,
          )}
        >
          Recommended
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-xl", colorClasses.icon)}>{icon}</div>
        <div>
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <div
          className={cn(
            "ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
            selected ? colorClasses.check : "border-border",
          )}
        >
          {selected && <Check className="w-3 h-3 text-white" />}
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}

function LeafOption({
  label,
  recommended,
  selected,
  onClick,
}: {
  label: string;
  recommended: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150",
        selected
          ? "bg-primary/15 border-primary text-foreground"
          : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {selected && <Check className="w-3 h-3 text-primary" />}
      {label}
      {recommended && !selected && (
        <span className="text-[9px] uppercase tracking-wider text-primary/70 font-bold">
          AI ↑
        </span>
      )}
    </button>
  );
}
