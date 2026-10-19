# FUJI Grocery Tracker

A mobile-first, device-local Hypermart shopping companion at `/shopper/`, alongside the existing FUJI Cycle Count System. It uses only the supplied workbook's **HYPERMART** sheet. GOMART and SET are excluded.

The separate Vercel project **fuji-grocery-tracker** builds the `shopper/` directory and serves this app at its own web root. The Cycle Count Generator keeps its existing project. The two projects share this repository and master-data exports; the grocery deployment excludes the generator's pages. `shopper/vercel.json`, relative manifest paths and service-worker scope support the standalone origin. The older `/shopper/` preview remains a development compatibility route.

The visual direction uses the supplied Scrnshts reference: dark-first editorial layout, free self-hosted Inter, rounded illustrated category cards and room around search/filter controls. Illustrations are original and are labeled as category artwork. Mobile and desktop have matching light and dark themes.

**Prices may not always be accurate. Estimate only. Final prices are confirmed at the cashier.**

## What the data really contains

The visible catalog contains **14,076 items and supplied prices** from `list of inventory and price list.xlsx`, joined by exact SKU to the master workbook's **HYPERMART** sheet. **14,026 matched**; **50 unmatched** items keep the supplied description/price and have no assumed barcode. Unlisted master products are excluded from browsing and barcode lookup. GOMART and SET are excluded. See [the import report](../docs/assortment-import-report.json).

The new price list has **no effective price date**. One amount, SKU 2028 at 0.209 pesos, rounds half up to **0.21 pesos**. All calculations use integer centavos. Live stock, explicit net sizes, verified comparison groups and brand classification remain unknown; description text is not treated as a verified size. Unit-price savings remain unavailable until the necessary data is supplied. Private shelf-price overrides never rewrite the shared catalog. Source A/I/N status is not live inventory.

The native Android app uses the exact same catalog. Build and installation details are in [android/README.md](../android/README.md). Its Room/DataStore data and the website's IndexedDB shopping data remain separately on each device. No live cross-device personal-data sync is provisioned.

## Run and check

Use Node 22+ and pnpm 10. From the repository root:

```sh
pnpm --dir shopper install
pnpm --dir shopper lint
pnpm --dir shopper typecheck
node --test
node scripts/build_pages.js
node shopper/scripts/serve.mjs --dist
```

Open `http://127.0.0.1:4173/shopper/`. `--dist` serves the generated production build, including the lazy scanner/QR bundles. Omit `--dist` for source development. Build output also retains the admin's static files at the root. No shopper runtime dependency is loaded from a third-party CDN.

The build minifies and bundles ZXing separately, generates an app-shell content version, verifies every catalog shard's SHA-256 checksum and rejects initial JavaScript above 150 KB gzipped. The QR encoder is lazy-loaded. Source JavaScript is approximately 34 KB gzipped; use the generated `docs/shopper-build-report.json` for final build measurements.

Run the mobile smoke flow with an installed Playwright Chromium:

```sh
npm ci
npx playwright install chromium
node scripts/shopper-smoke.cjs
node scripts/shopper-swap-check.cjs
node scripts/shopper-offline-check.cjs
node scripts/shopper-bundle-check.cjs
```

Set `TEST_BROWSER_CHANNEL=chrome` to use an installed Chrome, or `SHOPPER_TEST_URL` to check a deployed preview. Each run uses an isolated test browser profile. The test scans real source SKUs through mocked camera input and manual entry, checks exact shelf-price totals, crosses a budget threshold, saves history, checks the local helper, reloads offline and captures mobile light/dark and desktop screenshots. It does not claim that physical camera hardware or Safari has been verified.

## Importing the reference workbook

```sh
python scripts/import-hypermart.py "/path/to/ITEM MASTER AS OF 09-02-2026 1.xlsx" "/path/to/list of inventory and price list.xlsx"
node scripts/build-android-catalog.mjs
```

The standard-library importer streams only HYPERMART, merges repeated SKU rows and keeps all source barcode aliases as strings. Existing numeric-cell leading zeros cannot be reconstructed; correct these in the source file rather than guessing. Import reports list missing fields, invalid check digits, duplicate UPC ownership, row counts and checksums. Some internal labels do not follow GS1 and are warnings. Ambiguous lookups require shopper selection.

The filtered catalog has **136 compressed files totaling 965,395 bytes**. Startup uses 368 source records in an 8,253-byte starter plus a small price overlay for the first 48 records. The first 24 visible cards are priced immediately; the full price overlay and department indexes load when searching, filtering, looking up a code or downloading offline data. The build regenerates the starter prices from the current full overlay so staff updates cannot leave startup prices stale.

Barcode lookup uses 64 barcode and product partitions. Settings → Download full catalog caches compressed files and the full price overlay. IndexedDB stores catalog and private shopping data; scans make zero Firestore reads. Cached partitions remain compressed until needed, and the parsed partition cache is bounded. Checksums invalidate stale transformed catalog caches.

## Staff price and promo publication

1. Sign in to the existing FUJI admin system and open **Shopper Catalog**. Local admins may validate drafts; only online administrators can publish.
2. Download `templates/price-enrichment.csv`. Fill in verified selling prices and explicit price-effective dates. Fill in net sizes, comparable units, brand, comparison group and stock to enable savings. `BUYING_UOM` / `SELLING_UOM` do not establish net package size.
3. Import up to 5,000 rows in a CSV under 2 MB. Review errors and warnings. Prices must have at most two decimal places. Promos require a lower price and valid inclusive start/end dates. Future price-effective dates and ambiguous source barcode ownership block publication.
4. Download the validated JSON draft if desired. **Publish catalog** calls `/api/catalog-publish`. The server independently verifies the Firebase ID token, Firebase project and the Firestore `users/{uid}.role` value. A browser's local role cannot authorize remote changes.
5. With the server settings configured, publication makes an atomic Git tree commit to the configured deployment branch. Vercel builds the shopper and admin together. Fast-forward-only branch updates prevent silent overwrites. The staff message distinguishes a successful commit from a finished deployment.
6. Version history supports rollback by publishing a new version from an earlier snapshot. Price publication stores explicit names/categories copied from the source; an AI never supplies them. A shopper's saved trip retains the exact prices recorded at finish time.

`catalog.schema.json` describes normalized data; compressed reference arrays use category dictionaries for smaller transfers. Missing values remain null when decoded. `catalog/catalog-meta.json` identifies the product reference; `catalog/catalog-prices.json` is the current price overlay, with `prices.vN.json` immutable price snapshots after publication.

## Deployment on the existing Vercel project

The existing repository already has a working GitHub → Vercel integration for `fujisupersystem.vercel.app`. Keeping `/shopper` in this repo avoids introducing a second admin system or a second source of truth.

- Deploy the feature branch as a Vercel preview, run the checks and then merge its reviewed changes to the configured production branch.
- `vercel.json` builds `dist/`, preserves the root admin app and exposes `/shopper/`, `/api/chat`, and `/api/catalog-publish` on the same origin. API source is excluded from static output.
- Camera permission is restricted to the same origin. CSP permits only the app and the named optional Firebase endpoints; scanner and QR libraries are self-hosted. Metadata and price overlays use `no-store`; reference partitions are checksum verified. App-shell caches are content versioned.
- Set any optional environment values in **both Production and Preview** as appropriate. Keep GitHub publishing credentials on Production only if previews must not publish to the production branch. A token needs contents write on this one repository; never put it in browser configuration.
- The default app needs **no secrets, no Firebase account and no AI key**. Never enable a paid plan implicitly.

The feature branch is deployed as a [protected Vercel preview](https://fujisupersystem-git-codex-fuji-shopper-hypermart-fuji-92d1.vercel.app/shopper/) and linked to [PR #2](https://github.com/danne6077-beep/CYCLE-COUNT1/pull/2). Vercel sign-in is required. The dashboard confirms the team is on Hobby; commercial store operation requires an eligible plan or a different eligible host. Production merge has not been performed. Publishing prices, online AI and cloud sync fail closed until their required settings are present.

## Free-tier review — checked 19 October 2026

| Service | Current documented allowance / condition | Choice |
|---|---|---|
| [Vercel Hobby](https://vercel.com/docs/plans/hobby) | 100 GB fast transfer/month; 1,000,000 CDN requests and function invocations; 4 CPU-hours; 360 GB-hours memory; 100 deployments/day. Hobby is restricted to non-commercial personal use. | A store-owned public shopper app conflicts with that commercial-use restriction. The existing integration is retained; no paid upgrade is authorized by the “free tiers” requirement. Confirm an eligible plan before public store operation. |
| [Firebase Spark](https://firebase.google.com/pricing) | Standard Firestore: 1 GiB stored, 10 GiB egress/month, 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day. [Auth limits](https://firebase.google.com/docs/auth/limits) apply; Identity Platform Spark has 3,000 tier-1 daily active users. | Optional private snapshots only; never a lookup per scan. Phone/SMS sign-in and Cloud Functions are not used. |
| [Upstash Redis Free](https://upstash.com/pricing/redis) | 256 MB and 500,000 commands/month. Lua operations consume the applicable command quota; this is not a promise of 500,000 AI requests. | Optional persistent AI rate limits. Stay on Free; no automatic upgrade. |
| [Gemini API](https://ai.google.dev/gemini-api/docs/pricing) | Selected models have free input/output tiers. [RPM/TPM/RPD depend on model/project and are shown in AI Studio](https://ai.google.dev/gemini-api/docs/rate-limits); no account quota was available to verify here. [Unpaid-service terms](https://ai.google.dev/gemini-api/terms) permit submitted content to be used for product/model improvement. | Disabled by default. The account owner must select an available free model. Send no sensitive data. No universal free request limit is claimed. |

Groq and OpenRouter are not configured; no reliance is placed on their free limits. The deterministic local helper needs no AI provider and remains available if all online quotas are exhausted.

## Optional accounts and online helper

Copy `.env.example` values into the deployment environment; do not commit an `.env` file. `SHOPPER_FIREBASE_*` values are public web configuration, while GitHub, Redis and model keys are server-only. The build emits public account configuration without including private keys.

The optional account supports existing Firebase email/password sign-in and explicit private snapshot upload/download. Sync is deliberately opt-in, with confirmation before replacing device data. New account creation and Google sign-in are not enabled in this version. Local shopping needs neither. Restrict the web Firebase key and authorized domains, deploy the included rules, validate App Check/domain enforcement for the store project, and complete the privacy contact/retention policy before enabling cloud sync. Do not set `SHOPPER_CLOUD_SYNC=true` until that work and emulator checks pass.

`/api/chat` requires explicit consent, a verified Firebase token and configured durable Redis limits. Quotas are 15/minute and 100/day per user, plus 30/minute and 300/day per hashed IP. Requests are length limited; no personal data or raw IPs are logged. Optional Gemini classification sends the question only and selects a bounded search intent. Product names and all final prices are rendered deterministically from catalog tools, so model-generated price text is never displayed. Provider 429/5xx/timeouts fall back to deterministic answers. Responses are bounded JSON, not streamed; the local helper supports the main budget/product questions without online latency.

## Firestore emulator checks

The included rules allow users to read/write only their own `shopperUsers/{uid}/snapshots/current`; other paths remain denied under the existing rule set. The test checks cross-user access, unauthenticated access, payload limits, unexpected fields and role escalation.

The separate CI job installs the pinned dependencies from shopper/emulator/package.json and runs the checks against demo-fuji-shopper with Java 21. These isolation/security checks passed; they do not deploy production rules. For a local run with Java 21+, Firebase CLI, `firebase` and `@firebase/rules-unit-testing` installed in a disposable development environment:

```sh
firebase emulators:exec --only firestore --project demo-fuji-shopper "node shopper/emulator/firestore.mjs"
```

This is an emulator test, never a command to deploy production rules. The snapshot JSON is capped below Firestore's document limit. Deleting local data does not imply that a cloud snapshot was deleted; Account provides a separate cloud-delete action.

## Privacy and remaining verification

The app has no ads, analytics, tracking pixels or automatic scan telemetry. Missing-item reports are stored locally after an explicit shopper action. The in-app privacy notice explains local storage, optional cloud sharing, deletion and backup. The store should supply its contact and retention policy and assess its obligations under [RA 10173](https://privacy.gov.ph/data-privacy-act/).

See [test status](../docs/shopper-validation.md), [device checklist](../docs/shopper-device-checklist.md) and [design system](../docs/shopper-design-system.md). The generated build scored Lighthouse mobile Performance 97 / Accessibility 100 in CI. Physical iPhone/Android camera behavior, production rules deployment and live optional services remain unverified.
