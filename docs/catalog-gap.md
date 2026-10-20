# HYPERMART master and supplied item-list mapping

Source: `ITEM MASTER AS OF 09-02-2026 1.xlsx`, **HYPERMART only**. GOMART and SET are excluded. Inspected 19 October 2026. The filename is a source label; its date order and price effective date are not confirmed.

## Critical finding

The master HYPERMART sheet has no selling-price column. The later user-supplied workbook, **list of inventory and price list.xlsx**, contains `Sku`, `Description`, `PRICE` in Sheet1, rows 1–14077. It defines the app's visible assortment and supplies its prices.

An exact SKU lookup retains **14,026 master matches** and **50 source-only items**, for **14,076 visible products**. The unmatched rows keep their supplied descriptions/prices without invented classifications or barcodes. The original master contains 672,040 unique products; unlisted products are excluded from the shopper export.

No effective price date is supplied. Preserve that unknown value, distinguish import time from price validity, and let shoppers record private shelf-price corrections. One fractional-centavo amount (SKU 2028, 0.209 pesos) rounds half up to 0.21 pesos and is recorded in `assortment-import-report.json`. Verified net sizes, comparison groups and current stock are still missing, so the app does not claim unit-price savings from this data.

Always display: **Prices may not always be accurate. Estimate only. Final prices are confirmed at the cashier.**

## Actual columns

`PRODUCT_CODE`, `PRODUCT_DESCRIPTION`, `PROD_LEVEL1_CODE`, `PROD_LEVEL2_CODE`, `PROD_LEVEL3_CODE`, `PROD_LEVEL4_CODE`, `SET`, `SKU_TYPE_CODE`, `UPC`, `UPC_CODE`, `STATUS`, `PROD_LEVEL1_DESC`, `PROD_LEVEL2_DESC`, `PROD_LEVEL3_DESC`, `PROD_LEVEL4_DESC`, `BUYING_UOM`, `SELLING_UOM`, `VENDOR_CODE`, `VENDOR_COMPANY_NAME`, `ORDERING_TYPE_CODE`, `ORDERING_TYPE_DESC`, `PRODUCT_TYPE_CODE`, `PRODUCT_TYPE_DESC`.

## Field mapping and gaps

| Required field | Source / status | Decision |
|---|---|---|
| Barcode | UPC, UPC_CODE | Preserve string values and aliases; NULL is missing; flag bad GS1 check digits and ambiguous aliases. |
| SKU | PRODUCT_CODE | Stable product identifier; aggregate repeated rows by SKU without losing barcode aliases. |
| Description | PRODUCT_DESCRIPTION | Use trimmed source text; render as text, never HTML. |
| Brand | Missing | Do not treat vendor as brand or guess from the first word. |
| Category | PROD_LEVEL2_DESC (department: PROD_LEVEL1_DESC) | Preserve source classification. |
| Subcategory | PROD_LEVEL4_DESC (group: PROD_LEVEL3_DESC) | Preserve source classification. |
| Size + unit | No explicit net size; BUYING_UOM / SELLING_UOM are transaction units | A PCS sales unit does not establish net weight or pieces inside a pack. Add NET_SIZE, NET_UNIT, PIECES_PER_PACK. Description parsing is a review aid only. |
| Selling price | PRICE from the supplied item list | Join by exact SKU; decimal half-up rounding to integer centavos. Effective date remains unknown. |
| Promo price / dates | Missing | Add PROMO_PRICE_PHP, PROMO_START, PROMO_END. Require complete valid range. |
| House brand | Missing | Add HOUSE_BRAND; unknown is not false. |
| Stock status | STATUS exists, semantics not verified | Preserve source status; do not equate A/I with live inventory. Add IN_STOCK as a verified boolean. |
| Image | Missing | Use category symbols; no invented product photography. |

## Existing admin code

`masterlist.js` imports **CC Masterlist**, not this item-master format. It stores normalized records in IndexedDB `fuji-masterlist-v1` / `datasets` / `latest`, with SKU, description, barcode, department, subdepartment, vendor and locator fields. It loads `masterlist-default.json` as a fallback. Its alias mapping has no selling-price or net-size fields.

`product-lookup.js` uses static sharded indexes and SKU/barcode aliases. Its price reference importer accepts retail cost, retail price, price, selling price, and unit price, but those columns are absent from the supplied HYPERMART sheet. `app.js` stores cycle-count inventory separately; it is not an authoritative price feed.

Keep the shopper app under `/shopper` in the existing repository so the existing GitHub → Vercel connection can deploy both systems. Keep cycle-count imports and inventory behavior intact. Add an isolated staff catalog workspace and a navigation link only; publishing requires a server-verified online administrator, never the browser's local role.

## Minimal enrichment template

Download `/shopper/templates/price-enrichment.csv`. Required for priced publication: PRODUCT_CODE, SELLING_PRICE_PHP, PRICE_EFFECTIVE_DATE. Required for savings: NET_SIZE, NET_UNIT, BRAND, COMPARISON_GROUP, IN_STOCK. Optional promotions and HOUSE_BRAND have explicit columns. Rows with invalid money, duplicate SKU overrides, incompatible units, invalid dates or ambiguous barcodes block priced publication. Missing enrichments remain visibly unknown in the reference catalog. The supplied undated prices are estimates, not a validated current-price publication.

## Scale and provenance

The worksheet reports 830,319 rows including its header and 23 columns. Import statistics, source checksum, duplicate counts and validation warnings are generated by `scripts/import-hypermart.py`. Vendor details and other internal columns are not copied to the public shopper catalog. A compact searchable product index and barcode shards keep camera lookups independent of database reads. Cached shards work offline; a separate download action makes the entire reference catalog available offline.
