# Editing offline playbooks

`shopper/chat-data/playbooks/*.json` is human-editable and contains no prices. Each file has an id, localized names, aliases/triggers, optional month windows, default people/days, named groups and item concepts. Items have catalog search terms, quantity rules (`person`, `person-day`, `day`, `household`, `fixed`), priority (`essential`, `nice`, `optional`), curated concept tags, substitutes and a suggestion note.

Quantities are suggested selling units, rounded up. When a rule gives a mass and the catalog has a verified size, packs are rounded using that size. Otherwise `approxUnits` is used and every line is marked approximate. Product-title sizes are not treated as verified pack sizes. Headcounts are capped at 200, days at 31, quantities at 9,999. A plan is not a serving or nutrition guarantee.

The builder generates `index.json` and a canonical content digest, includes that version in the snapshot, and the worker prepares all playbooks as one atomic package before questions begin. Playbooks are fetched during chat preparation, never during a question, and are not embedded in initial JavaScript. The build enforces a 60 KiB combined gzip budget.

The planner selects real saved products, preferring an unflagged lowest pack price. A missing/flagged-only item can use the curated substitute terms; that substitution is disclosed. Unsatisfied concepts remain in `missing`. Dietary exclusions are applied to concepts and product-title filters; packaged ingredients remain unverified and require label checks. “Healthy” requests receive a shopping list, not nutrition claims.

The three deterministic variants are cheapest (essentials), balanced (essentials then extras within the cap), and complete (all suggested quantities, with any over-budget amount shown). The greedy variants can reduce suggested quantities to fit the cap, and explicitly list trims. This is not an optimal knapsack solver. A budget below the cheapest available item yields an empty list with trims, never an over-budget “cheapest” result.

To add a playbook, copy a file, choose unique ids/concepts, add EN/TL/Taglish triggers, verify the concept tags and aliases, then run `node shopper/scripts/build-chat.mjs`, unit/evaluation tests and the browser check. Review `docs/content-review.md` before release. Never add prices, stock, promos, aisle assertions, dosing, or guaranteed savings to playbook notes. New Year’s twelve-fruits content is explicitly a tradition; twelve distinct matching fruits are not guaranteed.
