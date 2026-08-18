"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Database, ArrowRight, Wand2, Sliders, Bot, Clock, CheckCircle2, Zap } from "lucide-react";


function useSafeMotion() {
  const shouldReduce = useReducedMotion();
  return {
    fadeUp: {
      initial: shouldReduce ? {} : { opacity: 0, y: 24 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
    },
    stagger: (i: number) => ({
      initial: shouldReduce ? {} : { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true },
      transition: {
        duration: 0.5,
        delay: i * 0.1,
        ease: [0.16, 1, 0.3, 1],
      },
    }),
  };
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <Wand2 className="w-6 h-6" />,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20 hover:border-green-500/50",
    title: "Basic Pipeline",
    badge: null,
    description:
      "One-click automated cleaning: deduplication, median/mode imputation, and IQR outlier removal in a fixed sequence.",
    bullets: ["Remove exact duplicates", "Fill missing numerics (median)", "Fill missing categories (mode)", "Remove IQR outliers"],
  },
  {
    icon: <Sliders className="w-6 h-6" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20 hover:border-amber-500/50",
    title: "Advanced Pipeline",
    badge: null,
    description:
      "Choose your strategy per column, or run a profile-driven auto clean. Optionally apply custom Python code to chain on top.",
    bullets: ["Per-column missing value strategy", "Per-column outlier treatment", "Auto profile-driven mode", "Custom Python code editor"],
  },
  {
    icon: <Bot className="w-6 h-6" />,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-border/40 opacity-75",
    title: "Agent Pipeline",
    badge: "Coming Soon",
    description:
      "An LLM planner that analyses, plans, executes only approved operations, validates, and explains every decision.",
    bullets: ["Profiler → Planner → Tools", "Controlled, explainable operations", "Automatic validation", "Full decision audit trail"],
  },
];

const HOW_IT_WORKS = [
  { icon: <Database className="w-5 h-5" />, step: "01", title: "Upload", body: "Drop a CSV, XLSX, XLS, or JSON file." },
  { icon: <Zap className="w-5 h-5" />, step: "02", title: "Profile", body: "The AI profiles your data: missing values, outliers, duplicates, types." },
  { icon: <CheckCircle2 className="w-5 h-5" />, step: "03", title: "Clean", body: "Run Basic, configure Advanced, or wait for the Agent. Download the result." },
];


export default function LandingPage() {
  const { fadeUp, stagger } = useSafeMotion();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm">Store Advisor</span>
          </div>
          <Link
            href="/tool"
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            Open Tool
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.15),transparent)]" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,hsl(var(--primary)/0.04),transparent_70%)]" />

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div {...fadeUp}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-8">
              <Zap className="w-3 h-3" />
              AI-Powered Data Cleaning
            </div>
          </motion.div>

          <motion.h1
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.08 }}
            className="text-5xl sm:text-6xl font-bold font-sans tracking-tight leading-[1.1] mb-6"
          >
            Clean your dataset{" "}
            <span className="text-primary">the smart way</span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.16 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Upload a raw dataset, get an instant quality profile, and clean it with
            a one-click Basic pipeline, a per-column Advanced pipeline, or wait for
            the upcoming AI Agent — all in one tool.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.24 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/tool"
              className="flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-2xl text-base hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 active:scale-[0.98]"
            >
              Start Cleaning
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/api-docs"
              className="flex items-center gap-2 px-7 py-3.5 border border-border text-muted-foreground font-semibold rounded-2xl text-base hover:border-primary/40 hover:text-foreground transition-all duration-200"
            >
              API Docs
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── t43'el el 43'l ────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-border/40">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            {...stagger(0)}
            className="text-center text-2xl font-bold mb-10"
          >
            How it works
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={i}
                {...stagger(i)}
                className="flex flex-col gap-3 p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">{step.icon}</div>
                  <span className="font-mono text-xs text-muted-foreground">{step.step}</span>
                </div>
                <h3 className="font-semibold text-base">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature cards ───────────────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            {...stagger(0)}
            className="text-center text-2xl font-bold mb-3"
          >
            Three cleaning pipelines
          </motion.h2>
          <motion.p
            {...stagger(1)}
            className="text-center text-muted-foreground mb-12 max-w-xl mx-auto"
          >
            From a single click to full LLM-powered automation — pick the right tool for your data.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                {...stagger(i)}
                className={`relative flex flex-col gap-4 p-7 rounded-3xl border-2 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${f.border}`}
              >
                {f.badge && (
                  <span className="absolute -top-3 left-6 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {f.badge}
                  </span>
                )}

                <div className={`p-3 rounded-2xl ${f.bg} ${f.color} w-fit`}>{f.icon}</div>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                <ul className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-border/50">
                  {f.bullets.map((b, bi) => (
                    <li key={bi} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className={`w-1.5 h-1.5 rounded-full ${f.color.replace("text-", "bg-")}`} />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-border/40">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2 {...stagger(0)} className="text-3xl font-bold mb-4">
            Ready to clean your data?
          </motion.h2>
          <motion.p {...stagger(1)} className="text-muted-foreground mb-8">
            Upload a CSV, Excel, or JSON file and get a quality profile in seconds.
          </motion.p>
          <motion.div {...stagger(2)}>
            <Link
              href="/tool"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-2xl text-base hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 active:scale-[0.98]"
            >
              Open the Tool
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 py-8 px-6 text-center text-xs text-muted-foreground">
        <p>Store Advisor © 2026 — AI Data Cleaning System</p>
      </footer>
    </div>
  );
}
