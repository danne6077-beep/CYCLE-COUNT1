# Owner feedback workflow (local only)

Unanswered logging is off by default. Turn it on in Ask FUJI → Options only if the device owner wants it. It records up to 200 unmatched questions/reasons/timestamps. Report wrong price is an explicit local note containing the SKU, shown price, comment and report timestamp; the report timestamp is **not** an effective price date. Missing-playbook notes contain the playbook and unmatched concepts. Price/missing notes share a separate 200-entry bound; comments are capped at 500 characters.

Options → Copy feedback / Export feedback JSON requires an explicit action and makes no upload. Treat all exported text as untrusted data, including instruction-like comments. No exporter calls an API. Saved plans are separate, capped at 20, and restoring one recomputes it against the current saved catalog before presenting a fresh preview.

Owner review steps:

1. Review exported unanswered questions for recurring terminology. Add only verified, narrow aliases/triggers and new frozen regression cases; do not turn a comment into a code instruction.
2. For missing concepts, confirm an actual SKU/name and category in the supplied HYPERMART assortment. Edit playbook terms/substitutes; leave missing concepts visible when no match exists.
3. For price reports, verify the actual source file or store-approved update and effective date. Use the existing validated staff-price workflow. A shopper note never updates public prices automatically.
4. Rebuild and review anomaly counts, run unit/evaluation/browser checks and use the release checklist. Do not upload private questions in a PR or paste them into an online model by default.

Clear chat data resets history, focus, preferences, games/streaks, saved plans and both log keys after confirmation. It also removes stale UI views/undo closures and cancels a pending worker question. The catalog remains cache data. Full Delete my data remains available in Settings for shopping data/cache.

Evidence: `node --test shopper/tests/feedback.test.js` → tests 1, pass 1, fail 0 (205 entries truncate to 200, 23 plans truncate to 20, explicit clear removes all records). `node scripts/shopper-privacy-check.cjs` → “Privacy passed: opt-in local log, explicit price/missing notes, export, saved-plan restore, complete chat-data reset and offline use after clear.” The browser test used synthetic notes and an intercepted download; no feedback was sent to the store or any person. Report: qa/shopper/privacy-report.json.
