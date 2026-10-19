# Offline Ask FUJI

## What changed

The old keyword-only helper and optional online provider request are replaced by an on-device catalog assistant. English, Tagalog and Taglish questions produce supplied prices, ranked product cards and tables. Follow-ups resolve the last results, product size or cheaper choices. Explicit add/remove commands and card buttons update the real basket, with undo; clearing requires confirmation. Basket answers use actual quantities, private shelf overrides and the trip budget. Sample meal/budget lists explain their subtotal and remaining amount.

The chat uses a native modal dialog: full height on mobile, a side panel on desktop, keyboard focus containment, Escape, reduced motion, 44px buttons, a 500-character composer, language selection, copy, retry and local history capped at 200 messages. Julian mode has 120 editable friendly lines, a persistent toggle and a build-time kill switch. The jokes never replace product answers or target sexual orientation.

## Architecture

```text
HYPERMART-filtered catalog + supplied item/price list
                |
     build-chat.mjs: SKU join + version hash
                |
       chat-data/catalog.json (14,076 rows)
                |
Service worker precache ---- versioned IndexedDB snapshot
                |                    |
app basket <-- client.js <--> Worker: normalize -> classify -> retrieve
                |                    -> rank -> calculate -> templates
          local chat history          |
                +----------- structured answer, cards, table, actions
```

The worker constructs a token posting index and alias vocabulary away from the UI thread. The raw versioned snapshot is cached in IndexedDB; the index is reconstructed in the worker on startup. All prices use integer centavos. Search uses exact/alias token intersection, inverse-frequency relevance and limited Damerau-Levenshtein corrections. Short tokens are never fuzzy matched. Low-confidence corrections are disclosed and cannot automatically change the basket. Responses have three deterministic introductory variants per intent in English, Tagalog and Taglish, followed by factual templates.

The first online preparation caches the shell, worker, aliases, jokes and full chat catalog. “Offline ready” appears after worker preparation and service worker installation. Subsequent questions make zero HTTP/provider requests. Offline reload uses the cached shell and local index snapshot. Installing the site on a home screen is optional. Browser storage eviction or clearing data requires preparing again. The separate full barcode reference download remains available in Settings.

## Updating the data or behavior

- Publish prices through the existing validated HYPERMART assortment workflow. `node shopper/scripts/build.mjs` regenerates the chat snapshot automatically after preparing the public prices. Do not hand-edit generated `chat-data/catalog.json` or add other master sheets.
- Add bilingual aliases to `shopper/chat-data/aliases.json`; keys are canonical searchable terms and values are spelling/translation arrays. Brand words are searched in supplied titles; they are not claimed as verified brand metadata.
- Add friendly lines in `shopper/chat-data/julian-lines.json`, preserving the language tags and context pools. Set `ENABLE_JULIAN_EGG=false` at build time to disable and hide the feature.
- Add language detection markers in `normalize.js`, openings in `templates.js`, factual translations in `engine.js` and a UI language option in `client.js`. Keep calculation logic shared.
- `Clear chat` removes the saved conversation/context; `Delete my data` also terminates the worker before deleting IndexedDB. Chat is not uploaded with optional account snapshots.

## Validation

From the repository root:

```sh
node shopper/scripts/check.mjs
node shopper/node_modules/typescript/bin/tsc -p shopper/jsconfig.json
node --test
node scripts/build_pages.js
node shopper/scripts/serve.mjs --dist
node scripts/shopper-chat-check.cjs
```

The shopper package exposes `test:chat` and `test:e2e`. Install the repository Playwright dependencies and Chrome/Chromium before E2E tests. `TEST_BROWSER_CHANNEL=chrome` selects installed Chrome; CI uses Playwright Chromium. CI checks both `/shopper/` and standalone `/` hosting. It also retains the existing mobile, camera, pricing, offline, bundle, Lighthouse and Firestore checks.

The chat unit suite checks 160 intent utterances, 42 labeled language examples (at least 90% agreement), fractions/multipacks, number words, typos, real rice prices, ten controlled unit-price rankings, follow-ups, computed budgets, unknown data, currency provenance and Julian variants/toggles/repetition. E2E checks 5 English and 5 Tagalog queries, actual basket changes/undo, 33 more questions with networking disabled, offline reload/history, focus containment, button targets and axe accessibility. Generated proof is in `qa/shopper/chat-report.json`, screenshots and CI artifacts. Timing measurements are from desktop test browsers; they do not establish physical Android performance.

## Known limitations

## Performance (emulated, not physical)

Command: `node scripts/shopper-perf-check.cjs`, against the production build at localhost:4184, 220 golden planner fixtures per run. CDP page CPU throttling is requested; equal worker slowdown is **not independently confirmed**. This is not a physical Android benchmark.

| Requested CPU rate | Cold start ms | Warm start ms | p50 ms | p95 ms |
| --- | --- | --- | --- | --- |
| 1 | 813.5 | 183.1 | 0.3 | 1.4 |
| 4 | 1012.1 | 197.6 | 0.3 | 1.6 |
| 6 | 1153.7 | 191.1 | 0.3 | 1.5 |

The requested 4x run reports p95 below 150ms. Heap is **not measured** because performance.memory is unavailable in the worker. Postings are persisted by snapshot version and reused, with rebuild on cache failure. Main-thread long tasks are checked in the final UI harness. Playbooks total 14,282 gzip bytes at this phase, below 60 KiB.

Physical Android steps (**not performed**; no physical phone connected): record model, OS, browser and battery state; load once on Wi-Fi; clear only the chat-postings key for a cold run; use Chrome remote debugging to collect worker startup and the 220 fixture latencies without CPU emulation; repeat warm, then airplane mode and offline reload; inspect keyboard/input, memory, thermal behavior and battery over a 15-minute session. Export JSON traces and label them with the device. Do not infer physical performance from desktop emulation.

- This is a deterministic Hypermart shopping assistant, not a general-purpose language model. Unusual phrasing may need a shorter name, SKU or a suggested question. Voice and the optional large on-device model are omitted to keep all question processing offline and lightweight.
- Source prices have no effective date and may be inaccurate. The visible warning asks shoppers to confirm shelf/cashier prices. Source anomalies such as SKU 2028 at ₱0.21 are retained, not “corrected” by guesses.
- Live inventory, aisle locations, current promotions, dietary labels and verified brand/net-size metadata are absent. A listed record does not establish stock. No current promo or aisle is invented.
- Clear sizes parsed from titles are labeled as inferred. Ambiguous multipliers suppress unit-price rankings. Lowest pack price and best inferred price per kilo/liter are distinguished. Different product families are not guaranteed equivalent.
- Plans buy one listed selling unit of each suggested ingredient. They are not verified serving counts, nutritional plans or a promise to feed a family for a week. Purchase decisions still require checking the actual pack.
- The legacy authenticated `/api/chat` server route remains for compatibility, but this website's assistant never calls it and offers no online AI consent switch.
- The user directly authorized publishing. Release targets only `codex/fuji-shopper-hypermart` and the separate grocery Vercel project, preserving Cycle Count production and paused APK work. This takes precedence over the attachment's suggested no-deployment workflow.
