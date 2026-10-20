# Offline Ask FUJI

This branch upgrades the deterministic Hypermart assistant with 22 editable occasion/dish playbooks, scaled sample plans, real catalog prices, grouped basket actions, comparisons and local games. It removes Julian mode, its toggle, generated configuration and all joke assets. A migration strips retired response prefixes from older saved conversations while preserving factual replies. There is no replacement mascot or name-triggered response.

## Data and answers

The supplied assortment contains 14,076 items; master data enrichment remains restricted to HYPERMART. No source price effective date is supplied. Every priced answer/card/plan carries localized saved-price provenance and asks for cashier confirmation. Build-time anomaly flags retain the supplied amounts, disclose caveats in search and exclude flagged prices from automatic plans unless explicitly requested. Flags are review hints, not verified errors.

Facts come from catalog records, human-edited playbooks and integer-centavo arithmetic. Label sizes are estimates unless verified metadata exists. Plans show people/days/budget/diet assumptions, quantities, group subtotals, totals, trims, substitutions, unmatched concepts and provenance. Edit chips, steppers, swap, three budget variants, Add all/by group, undo, explicit trip-budget adoption and text sharing operate on those calculations. A fresh question creates a preview; rows added from a card become linked to the actual trip until undone. Saved plans are recalculated before restoring.

Diet filters exclude named concepts and obvious product-title matches; packaged ingredients and allergy suitability are unverified. Plans are sample selling-unit suggestions, not verified serving counts, nutrition, medical advice, shelf stock or promotions. General knowledge, legal/medical advice and unsupported live-store facts get a scoped fallback. Cebuano/Bisaya has measured partial recognition, not full language support. Unusual questions may need a shorter name, SKU or suggested question.

## Architecture and preparation

```text
HYPERMART enrichment + supplied assortment/prices
             -> anomaly report + canonical version digest
             -> snapshot + aliases + 22 playbooks (atomic package)
                                      |
first paint -> deferred preparation -> worker -> token postings / planner
                    |                    |             |
              complete SW cache      versioned IDB   factual answer
                    |                    |             |
              Offline ready        fallback memory  Plan Card -> actual basket
```

The first preparation runs after paint, or when chat is opened. With Smart mode off, questions, plans and prepared games make zero HTTP/provider requests. Offline ready requires a complete version-matched page cache; a prepared catalog without a page cache is labeled separately. Worker package digests reject mixed snapshot/alias/playbook versions. An older complete package can be used with an explicit notice. Postings are persisted by snapshot version, with rebuild on failure. Schema version and existing IndexedDB stores remain unchanged; added keys do not invalidate trip data. Private/quota failures fall back to tab memory with a visible persistence warning.

The worker is separate from the initial page modules. Playbooks are loaded as data during preparation, games as a lazy module. Modules/data carry versioned URLs, the service worker installs a complete shell before old-cache cleanup, and minified static assets are compressed in production and local build preview. See [snapshot update evidence](snapshot-updates.md).

## Interaction, privacy and accessibility

The native dialog supports bounded history (200 saved messages, 2 visible at a time with earlier/latest controls), focus containment, Escape, a labelled 500-character composer, bilingual onboarding, skeleton/busy states and retry. Christmas decoration is optional; a dismissible offer appears in November–January. Light/dark themes and reduced motion are respected. Sound, haptics and fun effects are off by default; reduced motion suppresses fun effects even if requested.

Hula ang Presyo uses unflagged catalog prices. Beat the Budget scores coverage against a computed scenario baseline. Tipid Streak stores daily check-ins and local results. A baseline comparison is not a promise of shelf savings or nutritional adequacy.

Unanswered logging is opt-in and local (200 entries); wrong-price/missing-item notes are local (200 combined), saved plans are capped at 20 and game results at 100. Export/share always requires a click. Clear chat data confirms, resets these keys/preferences/history/context and removes stale UI; it preserves the grocery trip. Delete my data handles the full device database/cache separately. Optional account snapshots do not contain chat keys. See [privacy review](security-privacy.md), [feedback workflow](feedback-loop.md) and [manual accessibility checklist](a11y-manual-checklist.md).

## Commands

From the repository root, install existing dependencies, then run:

```sh
pnpm --dir shopper install --no-frozen-lockfile
pnpm --dir shopper lint
pnpm --dir shopper typecheck
node --test
node scripts/build_pages.js
node shopper/scripts/evaluate-chat.mjs
node shopper/scripts/review-content.mjs
SHOPPER_PREVIEW_PORT=4184 node shopper/scripts/serve.mjs --dist --standalone
# In another terminal:
SHOPPER_TEST_URL=http://127.0.0.1:4184/ node scripts/shopper-chat-check.cjs
node scripts/shopper-planner-ui-check.cjs
node scripts/shopper-resilience-check.cjs
node scripts/shopper-installability-check.cjs
node scripts/shopper-privacy-check.cjs
node scripts/shopper-perf-check.cjs
```

Install repository Playwright dependencies with `npm ci --ignore-scripts` and `npx playwright install chromium`. `TEST_BROWSER_CHANNEL=chrome` selects installed Chrome for isolated local tests. CI retains both hosting paths, camera/shopping/offline/bundle checks and Firestore emulator tests, and adds the planner/privacy/resilience/installability checks. Original Lighthouse checks remain; the additional hardening gate requires Accessibility exactly 100, Performance >=90, initial JS <150 KiB gzip and lazy playbooks <=60 KiB gzip. Every axe suite requires zero violations.

Playbook/alias edits: follow [playbooks.md](playbooks.md), rebuild, evaluate and review the content dump. Do not hand-edit generated snapshot files or infer missing price dates. The owner subsequently approved optional online Smart mode, off by default; see [smart-mode.md](smart-mode.md). The separate on-device-model proposal remains unimplemented. The unused legacy basket-upload route is retired. Optional Smart mode uses /api/chat with a strict consented payload and no basket/history.

## Performance

Phase 4 command: `node scripts/shopper-perf-check.cjs`, production build on localhost:4184, 220 golden planner fixtures per run. These are **emulated desktop measurements, not physical Android**. CDP page CPU rates were requested; equal worker slowdown is **not independently confirmed**.

| Requested CPU rate | Cold start ms | Warm start ms | p50 ms | p95 ms |
| --- | --- | --- | --- | --- |
| 1 | 813.5 | 183.1 | 0.3 | 1.4 |
| 4 | 1012.1 | 197.6 | 0.3 | 1.6 |
| 6 | 1153.7 | 191.1 | 0.3 | 1.5 |

Final remeasurement and browser/Lighthouse results are recorded in [hardening-report.md](hardening-report.md) and the CI artifact, rather than overwriting the baseline. Heap is **not measured**: performance.memory is unavailable in the worker. Initial JS and playbook gzip counts are emitted by the build into shopper-build-report.json. Snapshot transfer follows first paint in the browser harness. Long-task assertions cover a representative warm planner query with bounded history, not every conceivable browser state.

Physical Android performance is **not measured** because no phone is connected. To measure: record model, OS, browser, battery and date; prepare once on Wi-Fi; clear only the chat-postings key for cold startup; remotely debug the worker and run the 220 fixtures without CPU emulation; repeat warm; enable airplane mode, reload and repeat. Inspect keyboard/input, TalkBack, memory, thermal behavior and battery for 15 minutes. Export traces with device details. Use the manual checklist for VoiceOver and actual browser 200% zoom; desktop narrow-viewport reflow does not establish those results.

## Release scope

This post-release task authorizes one review PR on codex/shopper-planner-hardening, targeting codex/fuji-shopper-hypermart. Do not merge, deploy or push to production. Branch-specific Vercel Git configuration disables automatic deployment of the review branch. Grocery and Cycle Count remain separate projects; APK work remains paused. See [release-checklist.md](release-checklist.md) for a future authorized release and rollback process.
