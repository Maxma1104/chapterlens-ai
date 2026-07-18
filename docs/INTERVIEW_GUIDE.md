# Interview guide

## 30-second version

“ChapterLens is an evidence-grounded manuscript review product. A writer uploads a chapter, the system returns structure and editorial diagnostics, and every claim links to an exact source span. I separated typed extraction, editorial generation, exact-quote validation, and claim-support verification, so unsupported conclusions are removed before the UI sees them. The product also has auth, RLS history, atomic quotas, cost logs, monitoring, CI, browser tests, and a 55-case evaluation suite.”

## Five-minute walkthrough

1. **Problem:** generic AI feedback is fast but expensive to verify.
2. **User flow:** load the example, run a review, open continuity, click a citation, inspect the highlighted source.
3. **Architecture:** typed extraction → evidence index → editorial draft → exact-quote validator → support verifier → RLS persistence.
4. **Failure behavior:** invalid quotes disappear; an unsupported summary becomes an explicit refusal.
5. **Production thinking:** durable user quota, bounded input, cache, timeout, retry, cost field, Sentry, PostHog, health route.
6. **Evaluation:** 55 cases; exact-quote and validator-probe metrics have explicit boundaries, and the no-key baseline is not presented as model quality.
7. **Limitation:** exact quotation proves presence, not entailment. Human-labeled entailment is the next quality layer.

## Likely questions

### Why not just send the whole chapter in one prompt?

Because a prose response has no stable units to validate, evaluate, or render. ChapterLens uses separate structured extraction, editorial, and support-verification calls. Evidence IDs create stable seams for citation checking, UI navigation, and per-capability metrics.

### What happens at 1,000 users?

Authenticated quotas and conservative monthly cost reservations already serialize in Postgres; anonymous traffic is restricted to the deterministic engine. Next I would move cache and anonymous limits to a distributed store, queue long analyses, and reconcile reservations against actual cost. I would not scale embeddings first because model concurrency and spend are the immediate risks.

### How do you measure hallucination?

The automated metric measures hallucinated citations: quotes or offsets that do not exist in the source. That is necessary but not sufficient. A quote can exist and still fail to entail a claim, so the next dataset needs human support labels and inter-annotator agreement.

### Why Supabase?

It gives one operational unit for Postgres, auth, storage, RLS, and pgvector. That reduces integration surface for an MVP. The analysis contract is not coupled to Supabase, so persistence can move without changing the provider or validator.

### What would you change with another week?

I would run a blind editor evaluation and add claim-level entailment labels before building DOCX or relationship graphs. Quality evidence has higher second-order value than a larger feature list.
