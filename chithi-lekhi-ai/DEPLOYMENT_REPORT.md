## Deployment readiness

**Waiting for configured staging environment.**

Reviewed on 2026-09-13 from checkpoint STEP 6 and current working changes above commit `9312a5e`. Application code and SQL were not modified during STEP 7. No remote database, deployment, account creation, or paid provider request was performed.

Local implementation is verified. Production readiness is conditional on the configuration, migration preflight, and staging checks below. The release must include the reviewed uncommitted application changes and three currently untracked migrations; deploying the base commit alone omits this work. Exclude the unrelated untracked parent `.DS_Store`.

## Migration status

All three files are **reviewed locally; remote application status is unverified**. Apply in this order only after confirming the target migration history through `20260912020000_quota_reservations.sql`:

| Order | Migration | Change and dependency |
| --- | --- | --- |
| 1 | `20260912030000_voice_quota_finalization.sql` | Adds `finalize_voice_generation`; requires `voice_cache`, `ai_usage`, and the five-argument `consume_ai_quota`. Audio cache, quota consumption, and successful audit commit together. |
| 2 | `20260912040000_share_privacy_and_table_privileges.sql` | Replaces the shared-letter lookup RPC and revokes unused table privileges. Requires existing letters/shares and all seven tables named in its REVOKE statement. |
| 3 | `20260912050000_ai_usage_finalization.sql` | Adds `finalize_ai_usage`; requires `ai_usage` and the five-argument `consume_ai_quota`. Text-generation/refinement quota and successful audit commit together. |

Installation creates/replaces functions and changes privileges. It contains no deployment-time row deletion, data rewrite, truncation, or table removal. Runtime functions intentionally write cache/usage records. Existing successful lookup responses and legacy API URLs remain compatible. Private/expired lookup responses intentionally omit letter/audio/owner data and retain only token, visibility, and expiry metadata.

Target database preflight — all pending:

- [ ] Confirm the target project and migration history. Do not infer remote state from local Git commits, and do not blindly replay earlier migrations. In particular, `20260912000000` references the older quota signature removed by `20260912020000`.
- [ ] Confirm `consume_ai_quota(text,date,text,integer,uuid)` returns `jsonb`, has the reservation parameter default, and the older four-argument overload is absent. Confirm reserve/release RPCs from `020000` are installed.
- [ ] Confirm `user_usage.quota_reservations` is non-null `jsonb` with `{}` default and `user_usage(identifier,date)` has its unique constraint/index.
- [ ] Confirm a valid, non-deferrable unique index on `voice_cache(content_hash)`; required columns are `voice_style`, `audio_url`, `audio_format`, and `file_size_bytes`. Check for target-specific constraints that reject base64 audio.
- [ ] Confirm `ai_usage` has nullable UUID `user_id`, `identifier`, `action_type`, `model`, integer `tokens_used`, boolean `success`, and action constraints accepting generation/refinement/voice.
- [ ] Confirm `shares.share_token` is unique, `is_public` is non-null boolean, and `expires_at` is a timestamp. Confirm `letters` and all seven privilege-target tables exist: `plans`, `user_subscriptions`, `download_history`, `favorites`, `admin_audit_logs`, `letter_views`, `voice_history`.
- [ ] If historical migration replay is necessary, reconcile the known assumptions `profiles.updated_at` and `public_letters.share_token`; the local SQL test fixture explicitly supplies them.
- [ ] Use a migration role able to replace the existing RPC and change grants. Apply each migration transactionally through the tracked deployment workflow; stop on any failure.
- [ ] After installation, confirm both finalizers are `SECURITY DEFINER` with empty search paths and EXECUTE granted to `service_role`, denied to public clients. Confirm the shared-reader RPC remains callable by anon/authenticated clients.
- [ ] Refresh/verify PostgREST schema discovery and exercise both finalizers with staging fixtures before releasing application traffic. Missing RPCs can fail after a paid provider call has already completed.

## Environment requirements

Inspected variable names and configuration status without printing secret values. `.env.local` is ignored and not tracked. Its Supabase and AI credentials are placeholders; `NEXT_PUBLIC_APP_URL` points to localhost; no explicit `GEMINI_MODEL` is set. No linked Vercel project metadata or callable Supabase/Vercel connector is available in this session. Hosting dashboard configuration has not been inspected.

| Setting | Required deployment configuration |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Exact HTTPS staging origin; set the production origin separately before its build. |
| `NEXT_PUBLIC_SUPABASE_URL` | Valid URL for the intended environment's Supabase project. Current CSP supports `*.supabase.co`; a custom Supabase domain needs a separately reviewed CSP change. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key from that same project. |
| `SUPABASE_SERVICE_ROLE_KEY` | Matching private server credential for quota, audit, cache, and server persistence. Never expose through a `NEXT_PUBLIC_` variable. |
| `GEMINI_API_KEY` | Valid server credential with permission for the chosen model. |
| `GEMINI_MODEL` | Explicit supported model, validated using this application's existing SDK and bilingual generation/refinement flows. |
| `OPENAI_API_KEY` | Valid server credential with access to the configured `gpt-4o-mini` text fallback and `tts-1` voice paths. Live access is unverified. |
| Optional environment-admin fallback | Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`, and a private `ADMIN_SESSION_SECRET` only when using this login path. Local values exist but have not been approved or verified for staging. Supabase admin accounts need trusted `app_metadata.role` or `profiles.role`. |

**Configuration blocker:** the code's default `gemini-1.5-flash` was shut down on September 29, 2025. Set the existing `GEMINI_MODEL` override to a supported model and verify genuine provider output; fallback success alone does not pass the Gemini check. No code rewrite is required to supply this override. [Google release notes](https://ai.google.dev/gemini-api/docs/changelog#september-29-2025), [current model lifecycle](https://ai.google.dev/gemini-api/docs/deprecations).

Configure Supabase Auth Site URL, permitted callback/recovery URLs, and email delivery for the staging origin. Public variables are needed at build time, so rebuild after changing them. Use separate staging and production credentials/data. The installed Next package requires Node >=20.9.0; the local verified runtime is Node 26.7.0. Confirm a supported hosting runtime and reproduce the build there. Repository deployment configuration is Vercel/Next.js; all AI route variants declare 60-second execution budgets. Verify the hosting environment honors them.

## Verified tests

STEP 6 evidence retained; no application changes were made in STEP 7:

- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `npm run build` — passed; 28 static pages and legacy/canonical routes present.
- `NODE_PATH=/tmp/chithi-sql-tests/node_modules node --test tests/*.test.cjs` — 126 passed, 0 failed, 0 skipped.
- `node tests/http-smoke.cjs` — 16 passed against a local production build.
- Browser smoke — Bengali/English switching, themes, login/signup forms, and guest dashboard rendered. Live authentication was not exercised.

STEP 7 verification:

- Focused SQL suite rerun — 26 checks passed, including migration reapplication, privileges, transaction rollback, and duplicate-consumption protection.
- Current `git diff --check` — passed.
- Secret-redacted environment review — confirmed staging configuration is unavailable.

Staging integration checklist — **every row is waiting**, not passed:

| Area | Required acceptance evidence |
| --- | --- |
| Signup/login/logout/session | Create disposable accounts through signup; complete email verification if enabled; login, refresh session, logout, reload, and confirm old session access is denied. Test recovery/callback redirects on the staging origin. |
| Admin/isolation/IDOR | Use two ordinary users plus a trusted admin. Reject forged roles/cookies; block cross-user reads/edits/deletes/refinement/sharing of private letters. Verify authorized admin access and logout behavior. |
| Generation/refinement success | Obtain actual provider output for Bengali/English; persist owned current text, preserve original snapshots, and match each success to one quota increment and one success audit. Test canonical and legacy routes. |
| Generation/refinement failure | Exercise invalid input, provider rejection, empty response, and storage failure using controlled staging fixtures. Invalid requests must not reach providers; unsuccessful/fallback-only operations must not consume quota. |
| Voice/timeout | Generate and play actual TTS, test cache hits and browser fallback, and simulate provider timeout in staging. Confirm failed/cached/browser requests are free, no stale reservation blocks later requests, and cache/accounting/audit commit together. |
| Free quota | Verify generation/refinement/voice limits of 5/10/2 per day and rejection beyond each limit. Verify the configured daily rollover and retained accounting. |
| Premium/concurrency | Provision a real premium test subscription through the existing subscription path; confirm no daily cap. At a free-user boundary, send concurrent requests across instances and verify reservations prevent excess paid execution and duplicate charges. |
| Sharing/reader | Test private save and private share denial, guest and authenticated share creation, owner edits including metadata-only edits, expiration, public reader, legacy tokens, and denied-share text/audio redaction. Recheck local-draft POST and favorite preservation. |
| Dashboard/exports | Confirm each account sees its own saved/shared items and counts. Export PDF and PNG at high resolution; inspect Bengali fonts, complete content, dimensions/page breaks, and light/dark rendering. |

Record request IDs, expected/actual status, provider name, before/after quota and audit counts, and artifact checks without storing credentials or private letter contents in this report.

## Remaining risks

- Target schema, migration history, credentials, successful providers, authenticated flows, and hosted runtime are unverified. Local mocks/PGlite cannot establish production success.
- SQL must precede application rollout, and PostgREST must discover the new RPCs. Rolling out code first can spend provider cost before quota finalization fails.
- Database TypeScript RPC declarations still omit reservation/new-finalizer contracts. The current admin client is untyped, so this is not a runtime blocker, but TypeScript alone does not prove RPC compatibility. Reconcile generated types against the migrated staging schema in a separate bounded follow-up.
- Text output persistence precedes quota/audit finalization in separate requests. A finalization failure may leave saved text while the API reports failure; staging should confirm this known failure state and support/retry behavior. Quota and successful audit are atomic together.
- No release commit has been prepared, and the reviewed migrations are untracked. Preserve the exact reviewed file set when assembling the release.

## Production steps

1. Configure staging secrets and HTTPS origin in the hosting environment; select and validate a supported Gemini model. Do not copy local placeholders/admin values as deployment credentials.
2. Assemble a release from the reviewed working changes and migrations. Run `npm ci`, TypeScript, lint, tests, and build in a clean checkout using the selected hosting runtime and staging configuration.
3. Confirm target identity, existing schema, and migration history. Take/verify a recoverable database backup, then apply only pending migrations in order using the tracked migration workflow.
4. Verify finalizer discovery/grants and transactional behavior against disposable staging fixtures, then deploy the application to staging.
5. Execute every staging integration row above and record evidence. Resolve real failures with bounded fixes and repeat only affected checks plus release validation.
6. Once staging passes, repeat environment/schema checks for production. Apply pending database migrations before routing traffic to the verified app release. Confirm auth redirects, admin isolation, provider/accounting, public reader, and exports on the deployed origin.
7. Monitor application errors, provider failures/timeouts, failed quota finalization, and share failures. If release checks fail, halt promotion; roll application traffic back to a tested compatible release while preserving migrations/data. Do not blindly revert security migrations or reset the database.

CURRENT POSITION: STEP 7 — local deployment review complete; waiting for configured staging environment.
NEXT STEP: Supply staging configuration through the hosting/secret-management environment, verify target migration history, then run the migration and integration checklist above.
CHANGED FILES: DEPLOYMENT_REPORT.md, CONTINUATION.md (documentation only in STEP 7).
TEST RESULTS: Existing 126 regression / 16 HTTP / TypeScript / lint / build / browser passes retained; focused SQL 26/26 and diff checks passed in STEP 7. No live staging result claimed.


## Generation regression follow-up (after baseline 3b72afa)

Local production preview now validates configuration during Next's production-server config phase. Missing values stop `npm run start` with “Service configuration required” and variable names only. The build phase remains available. See `.env.example` for the existing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY names, private service-role/provider credentials, and explicit supported GEMINI_MODEL.

Quota/API failures distinguish daily exhaustion, required configuration/schema setup, and transient storage failure; the generation form renders localized messages. Production fail-closed behavior and atomic accounting are unchanged. The full regression suite now passes 142 checks; TypeScript, lint, and build passed again. The actual production configuration loader rejected the placeholder environment as intended. Configured success was verified with controlled auth/provider/Supabase test boundaries, not live credentials.

Waiting for configured staging environment. Follow the existing deployment steps above; previous HTTP/browser passes are historical evidence, not new live verification of this follow-up. The local HTTP reproduction attempt was blocked by automatic approval review's account usage limit, and its temporary server was stopped.
