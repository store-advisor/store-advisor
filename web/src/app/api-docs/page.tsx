"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Database, ArrowLeft, ExternalLink } from "lucide-react";
import "swagger-ui-react/swagger-ui.css";

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

// ── Custom Swagger UI styling that integrates with the dark theme ─────────────
const swaggerStyles = `
  /* Reset Swagger UI into our dark theme */
  .swagger-ui {
    font-family: var(--font-sans), system-ui, sans-serif;
    color: hsl(var(--foreground));
  }

  /* Top bar — hidden (we have our own nav) */
  .swagger-ui .topbar { display: none !important; }

  /* Info section */
  .swagger-ui .info { margin: 0 0 2rem; }
  .swagger-ui .info .title {
    color: hsl(var(--foreground));
    font-size: 1.5rem;
    font-weight: 700;
  }
  .swagger-ui .info p,
  .swagger-ui .info li,
  .swagger-ui .info table td,
  .swagger-ui .info a {
    color: hsl(var(--muted-foreground));
  }
  .swagger-ui .info a { color: hsl(var(--primary)); }

  /* Scheme selector */
  .swagger-ui .scheme-container {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    margin-bottom: 1.5rem;
    box-shadow: none;
  }
  .swagger-ui .schemes label { color: hsl(var(--muted-foreground)); }
  .swagger-ui .schemes select {
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
  }

  /* Server selector */
  .swagger-ui .servers label { color: hsl(var(--muted-foreground)) !important; }
  .swagger-ui .servers > label select {
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
  }

  /* Tags */
  .swagger-ui .opblock-tag {
    color: hsl(var(--foreground));
    border-bottom: 1px solid hsl(var(--border));
    font-size: 1.1rem;
    font-weight: 600;
  }
  .swagger-ui .opblock-tag:hover { background: hsl(var(--accent) / 0.3); }

  /* Operation blocks */
  .swagger-ui .opblock {
    border-radius: 0.75rem;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--card));
    margin-bottom: 0.5rem;
    box-shadow: none;
  }
  .swagger-ui .opblock .opblock-summary {
    border-radius: 0.75rem;
  }
  .swagger-ui .opblock.opblock-get .opblock-summary { border-color: hsl(142 71% 45% / 0.4); background: hsl(142 71% 45% / 0.05); }
  .swagger-ui .opblock.opblock-post .opblock-summary { border-color: hsl(217 91% 60% / 0.4); background: hsl(217 91% 60% / 0.05); }
  .swagger-ui .opblock.opblock-put .opblock-summary { border-color: hsl(38 92% 50% / 0.4); background: hsl(38 92% 50% / 0.05); }
  .swagger-ui .opblock.opblock-delete .opblock-summary { border-color: hsl(0 72% 51% / 0.4); background: hsl(0 72% 51% / 0.05); }
  .swagger-ui .opblock.opblock-patch .opblock-summary { border-color: hsl(258 90% 66% / 0.4); background: hsl(258 90% 66% / 0.05); }

  .swagger-ui .opblock-summary-path,
  .swagger-ui .opblock-summary-description,
  .swagger-ui .opblock-summary-operation-id {
    color: hsl(var(--foreground)) !important;
  }

  /* HTTP method badges */
  .swagger-ui .opblock-summary-method {
    border-radius: 0.375rem;
    font-weight: 700;
    font-size: 0.7rem;
    min-width: 4rem;
  }

  /* Expand / collapse */
  .swagger-ui .opblock-body {
    background: hsl(var(--background));
    border-top: 1px solid hsl(var(--border));
  }
  .swagger-ui .tab li { color: hsl(var(--muted-foreground)); }
  .swagger-ui .tab li.active { color: hsl(var(--primary)); border-bottom-color: hsl(var(--primary)); }

  /* Parameters table */
  .swagger-ui table thead tr td,
  .swagger-ui table thead tr th {
    color: hsl(var(--muted-foreground));
    border-bottom: 1px solid hsl(var(--border));
    background: transparent;
  }
  .swagger-ui .parameters-container .parameters tr td,
  .swagger-ui .parameter__name,
  .swagger-ui .parameter__type,
  .swagger-ui .parameter__deprecated,
  .swagger-ui .parameter__in {
    color: hsl(var(--foreground));
  }
  .swagger-ui .parameter__in { color: hsl(var(--muted-foreground)); font-size: 0.7rem; }

  /* Input fields */
  .swagger-ui input[type=text],
  .swagger-ui input[type=password],
  .swagger-ui input[type=search],
  .swagger-ui input[type=email],
  .swagger-ui textarea,
  .swagger-ui select {
    background: hsl(var(--background));
    border: 1px solid hsl(var(--border));
    color: hsl(var(--foreground));
    border-radius: 0.5rem;
  }
  .swagger-ui input[type=text]:focus,
  .swagger-ui textarea:focus {
    border-color: hsl(var(--primary));
    outline: none;
    box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
  }

  /* Execute button */
  .swagger-ui .btn.execute {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
  }
  .swagger-ui .btn.execute:hover { opacity: 0.9; }
  .swagger-ui .btn.cancel {
    border-color: hsl(var(--border));
    color: hsl(var(--muted-foreground));
    border-radius: 0.5rem;
  }
  .swagger-ui .btn.try-out__btn {
    border-color: hsl(var(--primary) / 0.5);
    color: hsl(var(--primary));
    border-radius: 0.5rem;
  }
  .swagger-ui .btn.try-out__btn:hover { background: hsl(var(--primary) / 0.1); }

  /* Authorization button */
  .swagger-ui .btn.authorize {
    color: hsl(var(--primary));
    border-color: hsl(var(--primary));
    border-radius: 0.5rem;
  }
  .swagger-ui .authorization__btn { color: hsl(var(--primary)); }

  /* Responses */
  .swagger-ui .responses-inner h4,
  .swagger-ui .responses-inner h5 {
    color: hsl(var(--foreground));
  }
  .swagger-ui .response-col_status { color: hsl(var(--foreground)); font-weight: 600; }
  .swagger-ui .response-col_description { color: hsl(var(--muted-foreground)); }

  /* Code / pre blocks */
  .swagger-ui .highlight-code,
  .swagger-ui pre {
    background: hsl(var(--background)) !important;
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    color: hsl(var(--foreground)) !important;
  }
  .swagger-ui .microlight { color: hsl(var(--foreground)) !important; }

  /* Model / schema */
  .swagger-ui .model-box {
    background: hsl(var(--card));
    border-radius: 0.5rem;
    border: 1px solid hsl(var(--border));
  }
  .swagger-ui .model { color: hsl(var(--foreground)); }
  .swagger-ui .model .property.primitive { color: hsl(var(--muted-foreground)); }
  .swagger-ui span.prop-type { color: hsl(var(--primary)); }
  .swagger-ui .model-toggle:after { border-color: hsl(var(--muted-foreground)); }

  /* Auth modal */
  .swagger-ui .dialog-ux .modal-ux {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 1rem;
    color: hsl(var(--foreground));
  }
  .swagger-ui .dialog-ux .modal-ux-header {
    border-bottom: 1px solid hsl(var(--border));
    background: hsl(var(--card));
    border-radius: 1rem 1rem 0 0;
  }
  .swagger-ui .dialog-ux .modal-ux-header h3 { color: hsl(var(--foreground)); }
  .swagger-ui .dialog-ux .modal-ux-content { color: hsl(var(--foreground)); }
  .swagger-ui .dialog-ux .modal-ux-content p,
  .swagger-ui .dialog-ux .modal-ux-content label { color: hsl(var(--muted-foreground)); }

  /* Info badges */
  .swagger-ui .info__tos a,
  .swagger-ui .info .contact__block a { color: hsl(var(--primary)); }

  /* Filter input */
  .swagger-ui .operation-filter-input {
    background: hsl(var(--background));
    border: 1px solid hsl(var(--border));
    color: hsl(var(--foreground));
    border-radius: 0.5rem;
  }
`;

export default function ApiDocsPage() {
  return (
    <>
      <style>{swaggerStyles}</style>
      <div className="min-h-screen bg-background text-foreground">
        {/* ── Nav ────────────────────────────────────────────────────────── */}
        <nav className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
                  <Database className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm">Store Advisor</span>
                <span className="text-muted-foreground text-sm">/ API Docs</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50 px-3 py-1.5 rounded-lg hover:border-primary/30 transition-all"
              >
                <ExternalLink className="w-3 h-3" />
                FastAPI Swagger
              </a>
              <a
                href="http://localhost:3000/api-docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50 px-3 py-1.5 rounded-lg hover:border-primary/30 transition-all"
              >
                <ExternalLink className="w-3 h-3" />
                NestJS Swagger
              </a>
            </div>
          </div>
        </nav>

        {/* ── Hero header ─────────────────────────────────────────────────── */}
        <div className="border-b border-border/40 bg-card/30">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                  OpenAPI 3.0
                </span>
                <span className="text-xs text-muted-foreground">v1.0.0</span>
              </div>
              <h1 className="text-2xl font-bold">Store Advisor — Complete API Reference</h1>
              <p className="text-muted-foreground text-sm max-w-2xl">
                All HTTP endpoints across both services. Switch the server dropdown on any endpoint
                to target the correct backend.
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  <span>Data Cleaning API — FastAPI · port 8000</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                  <span>Store Advisor API — NestJS · port 3000</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Swagger UI ──────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <SwaggerUI
            url="/openapi.json"
            docExpansion="list"
            defaultModelsExpandDepth={1}
            displayRequestDuration
            tryItOutEnabled={false}
            filter
          />
        </div>
      </div>
    </>
  );
}
