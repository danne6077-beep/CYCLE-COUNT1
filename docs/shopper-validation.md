# Shopper validation — 19 October 2026

## Passed locally

- **56 tests**: complete repository Node test suite, including the existing admin tests and new shopper money, promo, barcode, unit-price, savings, catalog-integrity, API and contrast checks.
- **Source syntax lint**: JavaScript syntax checks for app, libraries, build/preview scripts and staff workspace; API handlers also parse successfully.
- **360 px mobile Chrome flow**: onboarding and budget, a mocked camera frame/result, five real Hypermart SKU lookups, exact shelf-price arithmetic, quantity changes, a budget overrun, saved trip history, local Ask FUJI, offline reload, light/dark themes and no horizontal overflow. Camera tracks stop when the scan sheet closes. No uncaught browser exceptions.
- **Savings UI using test-only intercepted price data**: an exact ₱20 swap replaces the source item; budget rescue appears when spending exceeds the budget. Fixture prices do not modify any catalog files.
- **Full offline catalog**: 134 compressed files, 33,931,314 bytes, saved successfully. A previously unvisited non-grocery SKU resolves offline. Downloading retains two parsed partitions, rather than expanding the entire reference into memory.
- **Cached lookup benchmark**: desktop Chrome average 0.01 ms, maximum 0.1 ms for ten already-cached lookups. This excludes camera decoding/network and is not a physical mobile-device benchmark.
- **Data integrity**: every shard matches its SHA-256 checksum; all 672,040 search records have string SKUs and source names, with no vendor fields. No selling prices were generated.
- **Text token contrast**: tested light/dark foreground/background pairs meet the 4.5:1 threshold. This is not a substitute for a complete screen-reader or Lighthouse audit.

Screenshots and machine-readable smoke/swap/offline reports are in local `qa/shopper/` (ignored by Git). Source JavaScript is approximately 34 KB gzipped, excluding the scanner and QR bundles.

## Not yet verified / blocked

- **Dependency installation**: initial official-registry requests failed certificate-chain verification. Later attempts using the existing Windows trust roots did not execute because automatic approval review reported its selected model at capacity, and one review timed out. TLS verification was never disabled.
- **Typecheck**: TypeScript is not installed. Running the script could not complete while dependency installation was blocked.
- **Production build**: attempted and stopped because `esbuild` is unavailable. No successful build is claimed. The ZXing Safari fallback and QR encoder need bundling and browser verification after installation.
- **Lighthouse**: not run; no Performance or Accessibility score is claimed.
- **Firestore emulator**: tests are included but not run. Java/Firebase CLI/test dependencies are unavailable. Cloud sync remains disabled and production rules were not deployed.
- **Physical cameras / installation**: Android Chrome, iPhone Safari, torch/focus behavior and native home-screen installation remain on the device checklist. Automated camera input was mocked.
- **Online AI / cloud sync / staff publication**: source is implemented with configuration and authentication gates, but live provider credentials, private rules and publication configuration were not provisioned. No online-service success is claimed.
- **GitHub / Vercel publication**: branch creation was prevented by the same automatic-review capacity failure. No remote feature branch, PR or new Vercel deployment was created during this task.

## Release sequence after access is restored

1. Install pinned shopper dependencies, run syntax lint, TypeScript, the full Node suite and the production build. Commit the generated lockfile after reviewing it.
2. Serve `dist/` and verify the bundled ZXing fallback and QR poster. Run mobile automation against the generated build, then Lighthouse and the physical-device checklist.
3. Publish the feature branch, create/attach its PR and inspect the Vercel preview before merging. Preserve the existing root admin behavior. Confirm the account's hosting plan is eligible for commercial store operation; do not silently upgrade a free account.
4. Configure optional services only when needed. Deploy/test private Firestore rules and complete the store privacy contact/retention/App Check work before enabling cloud sync. Keep private tokens server-side.

The current result is a locally tested source implementation with a prepared deployment configuration, not a verified production launch.
