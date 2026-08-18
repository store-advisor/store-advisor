"use client";

import { DatasetProfile } from "@/lib/api/ai";
import { DatasetProfile as DatasetProfileView } from "@/components/DatasetProfile";
import { Bot, Clock, ArrowRight, Cpu, ClipboardCheck, MessageSquare, Wrench } from "lucide-react";

interface AgentPipelineTabProps {
  profile: DatasetProfile | null;
}

const PIPELINE_STEPS = [
  { icon: <Cpu className="w-4 h-4" />, label: "Profiler", desc: "Scans the dataset" },
  { icon: <ClipboardCheck className="w-4 h-4" />, label: "Planner", desc: "LLM creates a plan" },
  { icon: <Wrench className="w-4 h-4" />, label: "Controlled Tools", desc: "Approved operations only" },
  { icon: <ClipboardCheck className="w-4 h-4" />, label: "Validator", desc: "Confirms the result" },
  { icon: <MessageSquare className="w-4 h-4" />, label: "Explanation", desc: "Every decision explained" },
];

export function AgentPipelineTab({ profile }: AgentPipelineTabProps) {
  return (
    <div className="flex flex-col gap-8 py-6">
      {/* ── Coming soon card ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/20 p-10 text-center">
        {/*  glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--primary)/0.08),transparent_70%)]" />

        <div className="relative flex flex-col items-center gap-5">
          <div className="p-4 rounded-2xl bg-red-500/10 text-red-400">
            <Bot className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-bold font-sans tracking-tight">Agent Pipeline</h2>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Clock className="w-3 h-3" />
              Coming Soon — Phase 3
            </div>
          </div>

          <p className="text-muted-foreground max-w-md leading-relaxed text-sm">
            The <strong className="text-foreground">Smart Agent</strong> will use an LLM planner
            to automatically analyse your dataset, create a structured cleaning plan, execute
            only approved operations, validate results, and explain every decision.
          </p>

          {/* Pipeline diagram */}
          <div className="flex items-center gap-1 flex-wrap justify-center mt-2">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50 text-xs">
                  <span className="text-muted-foreground">{step.icon}</span>
                  <span className="font-medium">{step.label}</span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                )}
              </div>
            ))}
          </div>

          <p className="text-muted-foreground/60 text-xs mt-1">
            Use <strong className="text-muted-foreground">Basic</strong> or{" "}
            <strong className="text-muted-foreground">Advanced</strong> pipelines in the meantime.
          </p>
        </div>
      </div>

     
    </div>
  );
}
