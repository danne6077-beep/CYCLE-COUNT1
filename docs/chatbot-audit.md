# Chatbot audit — 19 October 2026

## Existing implementation

The website is static HTML/CSS and JavaScript ES modules. esbuild bundles the lazy ZXing and QR libraries. `shopper/app.js` contains both Ask FUJI UI and its keyword-based `ask()` handler. `shopper/lib/catalog.js` loads gzip search/detail/barcode partitions and a price overlay. IndexedDB `fuji-shopper-v1` stores shopping state and catalog caches. `shopper/sw.js` provides a versioned app shell; full catalog download is currently an explicit Settings action.

The chatbot strips words with substring replacements, examines at most 100 matches, usually returns only the first price, inherits the current department, has no structured results or follow-up entity memory, and keeps chat only in a volatile array. It gives English responses to most Filipino queries. When legacy consent/account state is enabled it attempts `/api/chat`, so the existing chat is not strictly offline. Its single-line input, missing history controls and lack of structured product actions limit accessibility and usefulness.

## Actual data

There are 14,076 unique listed items and prices: 14,026 HYPERMART matches and 50 unmatched supplied-list items. The 3,236,721-byte price JSON contains SKU, name, category, subcategory, department, integer priceCentavos, null priceAsOf, priceSource and masterMatched. Reference shards add barcode aliases, A/I/N source status and selling UOM. A/I/N is not live inventory. The filtered compressed reference is 136 files / 965,395 bytes.

All supplied items have prices. Explicit verified brand, net size, unit, aisle, image, live stock and promo fields are absent. Names contain abbreviations, inconsistent spacing, weight spellings and ambiguous wholesale multipliers. Examples include `SEGUNDINO RICE 1KILO` at 47 pesos and `EXCELLENT RICE 1KG` at 48 pesos. `GRANDEUR HASMIN RICE KILO` does not explicitly state a quantity. Some descriptions combine several multipliers; assuming their selling-pack basis could yield false unit prices. SKU 2028's supplied 0.209 pesos was previously rounded to 0.21; do not invent a corrected price. There is no effective price date.

## Implementation decisions

Build a zero-dependency deterministic engine in `shopper/lib/chat`, with a worker and a compact build-generated snapshot derived from the exact public assortment. Cache the snapshot, dictionaries, worker and UI during the first online preparation. Show Offline ready only after preparation succeeds. Questions perform no network or provider calls. Persist bounded private history and preferences in IndexedDB.

Parse clear size text, label its provenance, and suppress unit ranking for ambiguous multipacks. Unknown brands, stock, aisles and promotions stay unknown. Search alias brands as words in the supplied name rather than inventing verified brand fields. Cheapest means lowest matching sticker price, with a separate clearly qualified unit comparison when possible.

Support bilingual intents, fuzzy aliases, contextual follow-ups, structured tables/cards, budget arithmetic, explicit basket mutations with undo, confirmed clearing, recipe shopping templates and safe unknown responses. Keep Julian jokes affectionate and unrelated to sexual orientation; never replace the shopping answer. The optional on-device LLM is unnecessary for the core request and remains omitted.

Baseline: syntax checks and all 65 repository tests pass. Local production build is blocked by the pre-existing missing esbuild installation; connected GitHub CI is the production build authority. Work starts on `feat/offline-chatbot`, off `codex/fuji-shopper-hypermart`. The user's direct instruction to push/publish overrides the attachment's no-deployment/no-merge instruction. Publish only the separate grocery project after checks, preserving Cycle Count and paused Android work.
