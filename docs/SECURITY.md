# Security model

## Protected assets

- Unpublished manuscript text
- User identity and analysis history
- OpenAI, Supabase, Sentry, and PostHog credentials
- Usage and cost records

## Controls

- Provider calls occur only on the server.
- Supabase uses a browser-safe publishable key plus row-level security; no service-role key is shipped.
- Every user-owned row compares `user_id` with `auth.uid()`.
- The manuscript storage bucket is private and user-path scoped.
- Input length, file type, schema, and feedback length are validated.
- API errors return stable public messages, not provider payloads.
- Sentry PII collection is disabled.
- Quotas reduce cost abuse; request timeouts limit stuck work.

## Known risks

- Manuscripts are sent to the configured model provider; production policy and retention settings must be reviewed before launch.
- Browser-local demo history inherits the security of the user's device and profile.
- Exact quotation validation does not prove logical entailment.
- Anonymous process-local limits are not an abuse control for a multi-instance public deployment.

## Before public launch

1. Confirm provider data-retention settings and publish a privacy policy.
2. Add distributed anonymous rate limiting or require sign-in.
3. Add content deletion and account export flows.
4. Run dependency, RLS, and upload-policy tests against a staging project.
5. Set budget alerts at the provider and application levels.
