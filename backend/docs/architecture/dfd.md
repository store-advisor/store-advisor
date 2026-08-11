# Store Advisor — Data Flow Diagram

## Purpose

The ERD (`docs/database/erd.md`) answers _what data exists and how it
relates_. This document answers a different question: _how does data move
through the system, and where does the cross-source correlation that makes
this project valuable actually happen?_

See `dfd.mmd` for the diagram source.

## Why this diagram earns its place

Store Advisor's entire value proposition depends on joining two
independent data flows — store state and ad spend — that no single
external system can see together. This diagram exists specifically to
make that joining point visible, which the ERD alone (entities and
relations) doesn't communicate on its own.

## Key points the diagram makes explicit

1. **Two independent ingestion paths** (Store Connector, Ads Connector)
   write into the same canonical layer and the same append-only Events
   table. Neither connector needs to know the other exists — this is what
   Rule 1 (new connector ≠ check engine change) depends on structurally.

2. **The Check Engine is the only component that reads across both
   flows.** Individually, neither the store data nor the ad data reveals
   the "ad spend on out-of-stock product" problem — it only becomes
   visible once both are joined against Events by timestamp.

3. **The AI Service only ever receives Finding evidence, never raw
   canonical or event data.** This is the Golden Rule visualized: the AI
   cannot discover problems or compute costs, because it structurally
   never sees the data it would need to do either.

4. **The loop closes at the bottom** — an executed Action feeds back into
   the next Check Engine run (Stage 6, Verify), which is what allows a
   Finding to become "Fixed. Saved $X/week."
