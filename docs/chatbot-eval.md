# Chatbot evaluation

Commands: `node shopper/scripts/build-chat.mjs`; `node shopper/scripts/evaluate-chat.mjs --baseline` before spelling tuning; `node shopper/scripts/evaluate-chat.mjs` after; `node --test shopper/tests/planner.test.js`. Output from the property test command: tests 3, pass 3, fail 0.

These are **synthetic labeled fixtures**, not an independent native-speaker benchmark. Golden questions systematically cover all 22 playbooks and slots; held-out wrappers are frozen and differ in style, but reuse the same task taxonomy. Tuning on observed held-out failures makes post-fix results a regression measurement, not an unbiased estimate of unseen accuracy.

| Set | Baseline | Post-fix |
| --- | --- | --- |
| golden | 220/220 (100.0%) | 220/220 (100.0%) |
| heldout | 133/154 (86.4%) | 154/154 (100.0%) |
| bisaya | 21/30 (70.0%) | 24/30 (80.0%) |

## Per-language / per-playbook held-out selection accuracy

| Bucket | Baseline | Post-fix |
| --- | --- | --- |
| language: en | 38/44 | 44/44 |
| language: tl | 38/44 | 44/44 |
| language: taglish | 57/66 | 66/66 |
| intent: adobo | 7/7 | 7/7 |
| intent: baon | 7/7 | 7/7 |
| intent: birthday-adults | 7/7 | 7/7 |
| intent: birthday-kids | 7/7 | 7/7 |
| intent: christmas | 0/7 | 7/7 |
| intent: emergency | 7/7 | 7/7 |
| intent: fiesta | 7/7 | 7/7 |
| intent: fruit-salad | 7/7 | 7/7 |
| intent: lent | 7/7 | 7/7 |
| intent: lumpia | 7/7 | 7/7 |
| intent: menudo | 7/7 | 7/7 |
| intent: newhome | 7/7 | 7/7 |
| intent: newyear | 7/7 | 7/7 |
| intent: pancit | 0/7 | 7/7 |
| intent: school | 7/7 | 7/7 |
| intent: sickday | 7/7 | 7/7 |
| intent: simbang | 7/7 | 7/7 |
| intent: sinigang | 7/7 | 7/7 |
| intent: spaghetti | 0/7 | 7/7 |
| intent: student | 7/7 | 7/7 |
| intent: tinola | 7/7 | 7/7 |
| intent: weekly | 7/7 | 7/7 |

## Observed failures

Only three distinct held-out normalization gaps occurred: `nochebuena`, `pansit`, `spageti`. They caused 21 failures. The top 20 actual failing utterances follow; no extra failure patterns are invented to reach twenty. Changes only add explicit spelling normalization and preserve price-only question routing.

- held-christmas-0: need nochebuena supplies for 6 people 2 days php 2000 → expected christmas, got UNKNOWN.
- held-christmas-1: ano po ang bibilhin sa nochebuena anim kami dalawang araw dalawang libo piso → expected christmas, got UNKNOWN.
- held-christmas-2: pls nochebuena plan pang 6 people 2 days 2k budget → expected christmas, got UNKNOWN.
- held-christmas-3: uh can you help me plan nochebuena for six people two days two thousand pesos → expected christmas, got HELP.
- held-christmas-4: pakiplano ng nochebuena 6 tao 2 araw p2000 → expected christmas, got UNKNOWN.
- held-christmas-5: nochebuena budget list please 6 kami 2 days under 2000 → expected christmas, got UNDER_BUDGET.
- held-christmas-6: help me nochebuena budget 2000 6 people 2 araw → expected christmas, got HELP.
- held-pancit-0: need pansit supplies for 6 people 2 days php 2000 → expected pancit, got UNKNOWN.
- held-pancit-1: ano po ang bibilhin sa pansit anim kami dalawang araw dalawang libo piso → expected pancit, got UNKNOWN.
- held-pancit-2: pls pansit plan pang 6 people 2 days 2k budget → expected pancit, got UNKNOWN.
- held-pancit-3: uh can you help me plan pansit for six people two days two thousand pesos → expected pancit, got HELP.
- held-pancit-4: pakiplano ng pansit 6 tao 2 araw p2000 → expected pancit, got UNKNOWN.
- held-pancit-5: pansit budget list please 6 kami 2 days under 2000 → expected pancit, got UNDER_BUDGET.
- held-pancit-6: help me pansit budget 2000 6 people 2 araw → expected pancit, got HELP.
- held-spaghetti-0: need spageti supplies for 6 people 2 days php 2000 → expected spaghetti, got UNKNOWN.
- held-spaghetti-1: ano po ang bibilhin sa spageti anim kami dalawang araw dalawang libo piso → expected spaghetti, got UNKNOWN.
- held-spaghetti-2: pls spageti plan pang 6 people 2 days 2k budget → expected spaghetti, got UNKNOWN.
- held-spaghetti-3: uh can you help me plan spageti for six people two days two thousand pesos → expected spaghetti, got HELP.
- held-spaghetti-4: pakiplano ng spageti 6 tao 2 araw p2000 → expected spaghetti, got UNKNOWN.
- held-spaghetti-5: spageti budget list please 6 kami 2 days under 2000 → expected spaghetti, got UNDER_BUDGET.

## Bisaya gap

No full Cebuano support was added. Improvement from 21/30 to 24/30 is incidental to shared loanword normalization. Native number words and phrases such as “duha”, “unom”, “balay”, “eskwela”, “sud-an”, and “semana” still need explicit language/slot support and native review. Selection accuracy alone does not establish correct Cebuano quantities or response language. Estimated initial alias work: roughly 20–40 native planning/quantity terms plus a larger independently annotated test set; time, comprehension quality and physical-device performance are not measured.

## Properties verified

Every golden answer resolves the expected playbook, people, days and budget; variant totals equal quantity × actual saved product prices; cheapest variants stay within the cap; all returned SKUs exist; flagged items are excluded by default; uncapped quantity scaling is monotonic. Dietary tests cover concept exclusions and obvious title conflicts, **not verified packaged ingredient suitability**. All plans explicitly disclose that gap.


## Owner-approved Smart mode follow-up (2026-10-20)

Commands: `node --test shopper/tests/smart.test.js` -> 11 pass, 0 fail; `node shopper/scripts/evaluate-smart.mjs` -> golden 220/220 offline and contract replay; held-out 154/154 offline and contract replay; 374/374 injected unknown IDs rejected, zero accepted fake IDs, zero arithmetic errors. `node scripts/shopper-smart-check.cjs` -> consent off by default, one same-origin POST when enabled, real worker verification, tamper/429 fallback, retry, one-tap off and axe zero violations.

Smart-only and hybrid numbers here are **deterministic contract replays, not live model quality**. All four candidate thresholds (0.50/0.65/0.75/0.85) escalate every complex fixture; 0.75 is the retained policy tie, not an empirically unique optimum. Full per-language/playbook replay buckets are in qa/shopper/smart-eval.json. Live per-intent/language accuracy, verifier rejection rate, hallucinated-ID rate, arithmetic rate, p50/p95, escalation and actual cost are **not measured**: local Anthropic/limiter credentials are absent and no deployment/provider call was made. A human review of 50 actual Smart answers is also **not measured**. Do not substitute mock replay accuracy for those results. No live gain over offline is established; keep Smart optional. See smart-mode.md for cost calculations, limits and the enabling checklist.
