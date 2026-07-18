# ADR 0001: Validate exact evidence outside the model

Status: accepted

## Context

The product must provide source citations and refuse unsupported conclusions. Model instructions alone cannot guarantee either behavior.

## Decision

The model returns typed analytical nodes with evidence IDs and exact quote candidates. A deterministic server boundary verifies each quote against the source, rebuilds offsets, removes nodes with invalid dependencies, and refuses when the summary is unsupported.

## Consequences

- Citation presence becomes mechanically testable.
- UI navigation and evaluation share the same evidence contract.
- Model providers remain replaceable.
- A valid quote can still be misinterpreted, so entailment needs a separate human-labeled evaluation.
