# Architecture

## Core invariant

No analytical conclusion reaches the UI unless every referenced evidence ID resolves to an exact, contiguous substring of the submitted source.

This is intentionally stricter than semantic similarity. Similarity can retrieve candidates, but it cannot prove that a quotation exists. The validator therefore recomputes every offset with `source.indexOf(quote)`, drops missing quotes, removes conclusions that depend on invalid evidence, and emits a refusal when the summary loses support.

## Request lifecycle

1. The route parses `{ title, text }` with Zod and rejects text outside 120–50,000 characters.
2. Signed-in requests consume an atomic Postgres daily quota. Anonymous local demos use a bounded process-local counter.
3. A SHA-256 key checks the 24-hour response cache.
4. The provider returns a typed analysis draft. OpenAI uses strict structured output; no-key development uses a deterministic engine.
5. The evidence validator normalizes quotes, rebuilds offsets, and removes unsupported nodes.
6. The grounded report is returned and, for authenticated users, stored behind RLS.
7. The browser stores the ten most recent demo reports locally and exposes source-linked review tabs.

## Data ownership

`analyses`, `document_chunks`, `feedback`, and `daily_usage` all carry `user_id`. Row-level policies compare it with `auth.uid()`. Manuscript storage is private and paths must start with the authenticated user ID. The client never receives a service-role key.

## Retrieval seam

The MVP can analyze one chapter within the model context window, so full vector retrieval would add latency and failure modes without improving this exact scope. The schema already includes offset-aware chunks and pgvector. Phase two can add multi-chapter retrieval without changing the report interface or citation validator.

## Scale path

At 1,000 users, the first constraint is cost and concurrent model latency, not Next.js rendering. The planned order is:

1. Move the content cache to a distributed store.
2. Queue analyses and stream durable progress events.
3. Use a low-cost extraction model before selective high-reasoning critique.
4. Enforce a monthly dollar budget in the same transaction as daily quota.
5. Batch embeddings and cache chunks by content hash.

This preserves the grounding invariant while changing infrastructure behind stable seams.
