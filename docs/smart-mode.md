# Optional Smart mode — review branch, off by default

The owner's 2026-10-20 brief authorizes only this opt-in online enhancement. The offline engine still answers first and stays fully functional with zero question/game HTTP requests when Smart mode is off. No merge, production push or deployment is performed by this work. No live provider evaluation is claimed: the required local environment variables are absent, and the Vercel connection previously returned 403. Do not paste API keys into chat or the repository.

## Routing and verified facts

The deterministic router uses confidence <0.75, a complex plan/compare/why intent, multiple constraints or the explicit Ask Smart mode action. The local debug hook `window.__fujiSmartDebug` (localhost only) and saved local message.smartRoute record the reason/threshold, without analytics. Golden/held-out complex questions escalate at all tested cutoffs (0.50/0.65/0.75/0.85); these data cannot identify a unique best threshold. Keeping 0.75 is a policy tie choice, not evidence of optimal tuning.

The server uses Anthropic's Messages API directly with native Fetch: Haiku 5.5 for non-planning enhancements, Sonnet 5.5 for planning. There is no new SDK, gateway or runtime dependency. It uses current `output_config.format` JSON schema, strict tool input schemas and auto/none tool choice; Sonnet 5.5 does not accept forced tool choice. A bounded loop allows at most six calls, twelve tool executions and one verifier repair, subject to the shared 14-second abort deadline. Last turns disable further tool calls so a repair has room. Every provider message has <=768 output tokens and <=24,000 bytes of request JSON. Redirects are refused.

Five tools wrap the same snapshot/ChatEngine/Planner as offline: search_catalog, get_item, compare_items, build_plan and compute_total. Tool results are untrusted data, never instructions. Tool-issued ID/quantity pairs are tracked for the request. Arbitrary quantities, unknown tools/IDs, duplicate IDs and unapproved flagged prices are rejected. Plans use fixed user constraints and the actual playbook's computed variants; a model cannot silently change headcount, days, diet or budget. Numeric totals and pack prices are recalculated, never taken from model text.

The server verifier runs before a response is sent. The worker repeats verification against the device's current snapshot version, recomputes the accepted variant and derives display data from local records. A version mismatch, unknown ID, budget/scaling/diet violation, timeout, 429/5xx or disabled controls retains the offline answer. Model summaries are discarded in favor of a computed summary. Free-text notes pass an exact whitelist of generic, product-free tips; invented prices, stock/promo/aisle or medical/dosing claims cannot enter those notes. Unmatched playbook concepts remain visible. General tips have their own source label.

Every answer/section shows one of: From saved catalog, Planned from saved prices, General tip, not from the catalog, or Offline answer. A verified Smart plan is still a sample plan from saved prices, not live stock or dietary certification. Ask Smart mode while off opens the notice/toggle; it cannot silently grant consent. Retry repeats one explicitly consented attempt. A visible Smart mode on button turns it off immediately and aborts the current online attempt.

## Consent notice and data

The notice beside the unchecked toggle reads: “Smart mode sends your question text, people, days, budget, dietary flags and language to our server and Anthropic. It never sends basket history, stored notes or a device ID. Your connection IP is hashed temporarily for rate limits. Offline stays available.” Bilingual supporting text is shown. The choice is stored on the device and cleared with chat data.

The client sends only a POST to same-origin /api/chat, with a strict 4 KiB body: mode, affirmative consent, question (1–500 chars), language, people, days, budgetCentavos, exclusions and explicit flagged-price permission. Cookies and referrer are omitted. No conversation array, prior answers, basket lines, stored notes, account token, device ID or analytics is sent. Follow-up context stays local; an ambiguous standalone follow-up may simply retain the offline answer. Clear chat data aborts pending enhancement and resets consent. Smart code is prepared before Offline ready, so loading it cannot add a request during an offline question.

Application code logs neither question text nor raw IPs. The raw connection IP is used only in-flight to derive an HMAC. Existing Upstash stores the HMAC minute/day counters for 120/90,000 seconds (about 25 hours), plus a global numeric daily reservation counter for 90,000 seconds. No question text is written there. A process-local result cache holds at most 200 verified, canonical catalog answers for five minutes, keyed by an HMAC of normalized request/snapshot/date. It stores no raw question, model summary, private notes or IP. Platform/provider access-log and retention settings are separate owner controls and **not measured or changed here**; review those before enabling. This is not a claim of zero vendor retention.

CSP connect-src is self; service worker explicitly bypasses /api/chat (including GET), and API responses are no-store/private. No third-party scripts or analytics are added. Grocery and Cycle Count remain separate. Optional existing account code that calls Google directly would require a separately reviewed same-origin proxy under this CSP; the shipped default account config is disabled.

## Environment and cost controls

Configure secrets directly in the **grocery** Vercel project, never in source, screenshots or logs:

| Variable | Purpose/default |
| --- | --- |
| ANTHROPIC_API_KEY | Server-only Anthropic credential; missing means offline fallback |
| SMART_MODE_ENABLED | Must equal true to permit server attempts; unset/false is the kill switch |
| SMART_DAILY_CAP_USD | Initial ceiling $1; may be reduced. Values >1 fail closed. Raising needs owner approval and a reviewed change |
| UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN | Reuse the existing rate-limit service, restricted to HTTPS *.upstash.io; no new service destination |
| RATE_LIMIT_SALT | Server-only HMAC secret, at least 16 characters; reuse the existing limiter secret |

Missing/unavailable persistent controls disable Smart mode. One Redis Lua transaction enforces 10 attempts/minute/IP, 50/day/IP and a global daily reservation cap. Each attempt reserves $0.50 before any provider request. Known successful usage refunds the unused reservation; errors/timeouts retain it conservatively, since billed usage may be unknown. Consequently a cap can be reached before actual known spending reaches $1. There is no in-memory-only fallback for limits. All instances share the durable ledger. No authentication or basket upload is required for Smart mode.

The accounting uses published 2026-10-20 prices: Haiku input/output $0.10/$0.50 per million for bounded short prompts; Sonnet $2/$10 per million. Cache discounts are not assumed. Six bounded messages plus output-token caps fit the conservative reservation at those rates. Check current pricing and actual usage before enabling; this is application-side reservation control, not an Anthropic billing-account limit. Keep a provider-side account spending limit as an independent owner control.

Illustrative single-call cost for 3,000 input +768 output tokens: Haiku $0.000684 ($0.684/1,000 questions); Sonnet $0.01368 ($13.68/1,000). Tool turns and repairs multiply calls, and actual input lengths vary. These are calculations, not a measured bill. No paid provider call was made for these tests.

## Verification and enabling checklist

Commands: `node --test shopper/tests/smart.test.js`; `node scripts/shopper-smart-check.cjs`; `node shopper/scripts/evaluate-smart.mjs`. The browser test mocks only the same-origin endpoint and exercises the real client worker verifier. It asserts default-off zero requests, exactly one POST during an eligible online attempt, no private fields, unknown-ID rejection, friendly 429 fallback, retry, one-tap off and axe zero violations. Unit tests cover tools, double verification rejection/repair, injection strings, persistent limiter request shape and cap refusal. These do not measure real provider quality, latency or a live Redis service.

- [ ] Owner configures the server variables securely and confirms the existing Upstash project; do not change any cap above $1 without approval.
- [ ] In an approved test environment, run golden (220) and held-out (154) fixtures in offline-only, Smart-only and hybrid modes. Keep rate/cap controls active; stop when limited rather than bypassing them. Spreading runs over days or a higher evaluation budget requires an owner decision.
- [ ] Record per-language/playbook accuracy, escalation rate, verifier rejection rate, post-verifier ID/math errors, live p50/p95 and actual usage/cost. The current replay results are not a substitute for live measurements.
- [ ] Have a human review 50 live Smart answers for question fit, assumptions, source labels, missing items, language, numbers and unsafe claims. This has **not been performed** because no live answers exist here.
- [ ] If hybrid fails to beat offline on complex questions, keep it optional. The current deterministic complex fixtures already score 100%; no live improvement has been established.
- [ ] Do not enable Smart mode by default. Owner approval is required for that, server-side question persistence, raising the cap or any additional destination.

Rollback: turn SMART_MODE_ENABLED=false and redeploy only after release authorization; existing local consent may remain true, but the endpoint fails closed and the UI keeps offline answers. A future client rollback must preserve all message records; follow release-checklist.md. No environment changes or deployment commands were executed in this review task.

References checked before coding: [model IDs/prices](https://platform.claude.com/docs/en/models/overview), [Messages API](https://platform.claude.com/docs/en/api/messages/create), [strict tools and auto/none choice](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools), [structured output schema](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
