# Grocery hardening and optional Smart mode review

Scope: new branch codex/shopper-planner-hardening, targeting codex/fuji-shopper-hypermart in danne6077-beep/CYCLE-COUNT1. No merge, production push, Vercel environment change, deployment or paid provider call was performed. Branch-specific Vercel Git settings disable automatic deployment of this review branch. Grocery and Cycle Count remain separate; master workbooks and Cycle Count production are unchanged. The user's latest decisions remove Julian mode, approve the confirmed scan rule and authorize only optional online Smart mode.

## Changes by phase

| Phase | Result |
| --- | --- |
| 0 | Audited original release/CI/hash drift; removed name mode, assets and toggle; preserved factual legacy replies. |
| 1 | Localized price provenance, unknown effective date, 5-MAD anomaly review flags; no source amount guessed or corrected. |
| 2 | 22 occasion/dish playbooks, slots, deterministic scaling/budget variants, substitutions, exclusions, missing lists, follow-ups and explanations. |
| 3 | 220 golden, 154 regression/held-out and 30 exploratory Bisaya fixtures; actual sums/catalog IDs/flags/budgets tested. |
| 4 | Worker metrics, versioned cached postings, emulated 1x/4x/6x runs and unchanged gzip/latency limits. |
| 5 | Atomic catalog package/cache updates, mixed-version rejection, retry and storage/quota degradation. |
| 6 | Grouped Plan Cards, budget ring, actual basket sync/undo, optional seasonal theme, sharing/tour and three offline games. |
| 7 | Firestore review without rule changes, secure headers, opt-in sound/haptics, local retention/clearing. |
| 8 | Manifest/icons/offline start, focus/keyboard/reduced-motion/reflow/44px checks and bounded rendered history. |
| 9 | Opt-in unanswered log, local price/missing notes, explicit export and recalculated saved plans. |
| 10 | 139 notes dumped with owner checkboxes; three context-review flags, zero unsafe-claim matches; no retired jokes reintroduced. |
| 11 | Exact-commit release/rollback runbook, branch-control recommendations and CI integration without weakening gates. |
| Added scan rule | Remove one leading zero, remove final digit, then cap at 12 digits; camera/photo share the rule. Stored source codes stay intact. Ambiguous prefixes require selection. |
| Added Phase 2B | Consent-off-by-default hybrid Smart mode, strict same-origin POST, Anthropic tools, server + worker verifier, durable rate/reservation controls and friendly offline fallback. |

## Commands and observed output

These are local production-build observations unless stated otherwise. Node executable paths/environment setup vary by host; TEST_BROWSER_CHANNEL=chrome selects the installed isolated test browser.

| Command | Observed output |
| --- | --- |
| node --test | 108 tests, 108 pass, 0 fail; original checks retained |
| node shopper/scripts/check.mjs | 53 source files, 0 syntax errors |
| node shopper/node_modules/typescript/bin/tsc -p shopper/jsconfig.json | exit 0 |
| node scripts/build_pages.js | initial JS 50573 B gzip; worker 23455; snapshot 505129; lazy playbooks 14282; scanner 116532; 14,076 items |
| node shopper/scripts/evaluate-chat.mjs | golden 220/220; held-out regression 154/154; Bisaya 24/30 |
| node shopper/scripts/evaluate-smart.mjs | offline and deterministic contract replay: 220/220 +154/154; 374 injected unknown IDs rejected; 0 accepted fake IDs; 0 arithmetic errors. Not live model accuracy. |
| node scripts/shopper-smoke.cjs | onboarding, five catalog-item scans/manual lookup, shelf prices, budget, trip history and offline reload passed |
| node scripts/shopper-swap-check.cjs | isolated synthetic-price swap saved exactly 2,000 centavos; budget rescue passed |
| node scripts/shopper-offline-check.cjs | all 136 reference files cached; other-department offline lookup passed |
| node scripts/shopper-bundle-check.cjs | QR generation, shipped decoder, price warning and light/dark UI passed |
| node scripts/shopper-camera-check.cjs | no native detector, broken native detector, denied permission/photo and normalized native scan passed; tracks stopped |
| node scripts/shopper-chat-check.cjs | bilingual answers, basket/undo, 33 offline questions, offline reload/history, focus, 44px targets and zero axe violations passed |
| node scripts/shopper-planner-ui-check.cjs | 12 offline planning/follow-ups, games, basket sync/undo, themes; axe [], page errors []; tested warm 4x main-thread tasks >50ms: [] |
| node scripts/shopper-history-check.cjs | lossless legacy migration and injected second-record quota abort passed; original durable records preserved and warning visible |
| node scripts/shopper-resilience-check.cjs | five storage/fetch/version/update cases passed, history preserved, old cache removed |
| node scripts/shopper-installability-check.cjs | manifest/icons/offline start_url, focus, reduced motion, simulated keyboard, 44px controls and 720px reflow passed |
| node scripts/shopper-privacy-check.cjs | opt-in logs/export/restore, complete local clearing (including individual records), Smart consent reset and offline use passed |
| node scripts/shopper-smart-check.cjs | mocked endpoint with real worker verifier: consent off, one same-origin POST, tamper/429 fallback, retry, one-tap off, axe [] |
| Invoke-WebRequest POST http://127.0.0.1:4184/api/chat (synthetic consented request) | 503, status=offline, code=disabled, friendly bilingual notice; no key/limiter configured |
| Lighthouse local download | not measured: registry.npmjs.org TLS chain failed with UNABLE_TO_VERIFY_LEAF_SIGNATURE despite system/extra trusted roots. TLS verification was not disabled. CI retains Performance >=90 and adds the exact Accessibility=100 hardening gate. |

Legacy /shopper/ checks ran on localhost:4185, standalone / checks on localhost:4184. Camera/chat checks passed on both paths. The final targeted UI/history/privacy rerun and screenshots use the final build. Generated JSON/PNGs are in qa/shopper and the CI shopper-proof artifact; selected screenshots are tracked in docs/screenshots. CI status on the final PR head is reported in the PR, not inferred from an earlier SHA. Production baseline CI at fc12f614 failed Performance at 88; see post-release-verification.md.

Build drift versus the original reported 45,215/14,710/498,732/116,532 gzip bytes is +5358/+8745/+6397/0 bytes. Initial JS stays below 150 KiB and lazy playbooks below 60 KiB. No new runtime dependency is added. Current package version: c321c263705279dfb989. Flags: 1,611 total (0 nonpositive/missing, 1 below one peso, 1,001 category and 693 unit-price outliers; categories overlap).

## Emulated performance

Command: node scripts/shopper-perf-check.cjs, 220 golden planner queries per rate. Desktop Chrome, not physical Android. CDP page CPU rates are requested; matching worker slowdown is not independently confirmed. Heap is not measured because performance.memory is unavailable in the worker.

| Requested CPU rate | Cold ms | Warm ms | p50 ms | p95 ms |
| --- | --- | --- | --- | --- |
| 1 | 821.7 | 300.6 | 0.1 | 1.3 |
| 4 | 999.1 | 208.5 | 0.2 | 2.0 |
| 6 | 1340.7 | 219.2 | 0.2 | 1.5 |

The UI harness records first contentful paint at 208ms and first snapshot request at about 496ms, after paint. It isolates the warm query from axe/automation setup in a fresh process with saved synthetic history. One in-page interval covers submission through persistence/paint. Layout containment, local scrolling, two visible rich messages and atomic per-message writes address actual foreground work; 200 messages remain accessible. The final local run passed with no tasks over 50ms. Earlier Windows runs varied, including a 53ms failure before the final formatter caching; this is not a guarantee for every browser/history state. CI enforces the same threshold without a tolerance increase.

## Not measured and remaining decisions

| Severity | Open item / practical implication |
| --- | --- |
| High release condition | Live Smart-only/hybrid quality, provider p50/p95, actual usage/cost and 50 human-reviewed Smart answers are not measured: credentials absent, no deployment/provider call. Keep Smart optional/off by default; configure the grocery environment securely and complete the checklist before operational enablement. |
| Medium | Physical phone camera/thermal/battery, TalkBack/VoiceOver and actual browser-toolbar 200% zoom are not measured: no connected physical device. Desktop simulated camera/reflow is not a substitute. |
| Medium | Source price effective date, stock, promos, aisles, packaged ingredients and most true pack sizes are unknown. Flags can be false positives; confirm actual packs/prices at cashier. Sample plans do not certify servings, nutrition or emergency sufficiency. |
| Medium release condition | Required validate and firestore-rules jobs must pass on the final proposed/production SHA. Local Lighthouse is unavailable due certificate trust; release remains gated by CI and future owner approval. |
| Low | Bisaya coverage is 80% on 30 synthetic examples; no full support or broad natural-language accuracy claim. |

Owner review: approve the unchecked content notes; confirm source anomalies; complete physical checks; configure Anthropic and the already-used Upstash limiter without sharing secrets; retain the initial $1 ceiling and disabled server kill switch until ready. Default-on Smart mode, a higher cap, stored server questions, any additional destination, merge or deployment require a separate explicit decision. Branch-protection recommendations are documented but settings were not changed.

Graphify rank_files and list_workspaces both returned no_workspace. The provided reply did not identify a workspace handle. Work continued with targeted local reads; no Graphify indexing or token-saving measurement is claimed.
