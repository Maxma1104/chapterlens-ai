# ChapterLens MVP product requirements

## Positioning

ChapterLens is an evidence-grounded AI manuscript review assistant for writers and editors and a portfolio project for Applied AI, AI Product Engineering, AI Quality, Product Operations, and publishing-technology roles.

## Core outcome

After a user pastes a long excerpt or uploads a `.txt` chapter, the product produces:

- Chapter summary
- Character extraction and relationships
- Timeline
- Plot contradiction and logic-gap detection
- Character behavior consistency signals
- Narrative pacing analysis
- Prioritized editorial suggestions
- Exact source quotations for every judgment
- Explicit refusal rather than speculation when evidence is insufficient

## MVP user experience

- Public landing page and product explanation
- Email registration and sign-in
- Paste text or upload `.txt`
- Maximum-length policy
- Visible analysis progress
- Structured report with source-location navigation
- Analysis history
- Helpful / unhelpful feedback
- Friendly errors and retry
- Daily usage limit
- Responsive, deployable interface

## AI workflow

The system must not expose an unchecked free-form model answer. It must separate input cleanup, segmentation, structured extraction, evidence collection, editorial generation, citation validation, and low-confidence refusal. Structured JSON must be schema-validated. Provider failures should time out and retry safely.

## Production requirements

- Next.js, TypeScript, Tailwind
- Supabase PostgreSQL, Auth, Storage, and pgvector
- OpenAI API
- Sentry and PostHog integration points
- Vercel deployment configuration
- Authentication and row-level ownership
- Per-user daily limit, text/token cap, timeout, bounded cache, model choice, cost log, and monthly budget protection
- API errors, health check, and analysis logs
- Automated lint, type, unit, build, and browser checks

## Evaluation

Create 40–60 cases covering normal summaries, characters, chronology, explicit answers, absent answers, hallucination traps, malicious input, and long input. Report character accuracy/recall, citation accuracy, hallucination rate, refusal accuracy, latency, request cost, and errors. Provider-specific metrics must not be represented as general system quality.

## Portfolio package

- Polished README and repository map
- Architecture and decision record
- Evaluation report
- Case study
- Two-minute demo script
- Interview explanation
- Honest current limits and roadmap
- Resume-ready description only after real deployment and provider evaluation

## Out of scope for MVP

PDF/DOCX, multi-chapter projects, book-wide graphs, version comparison, style analysis, PDF export, streaming, and multilingual product localization are phase-two candidates.
