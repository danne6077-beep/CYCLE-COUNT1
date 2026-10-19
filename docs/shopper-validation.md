# Shopper validation — 19 October 2026

## Verified

- **57 repository tests** pass, including existing admin checks and shopper money, promo, barcode, unit-price, savings, catalog-integrity, API and contrast checks.
- **Syntax and typecheck** pass in GitHub CI. Syntax checks cover the shopper source; TypeScript checks the money/savings and enrichment-validation modules configured in shopper/jsconfig.json.
- **Production build** passes. It verifies every catalog checksum, generates the PWA shell version and enforces the 150 KB initial JavaScript gzip budget.
- **Mobile production flow** passes at 360 px: onboarding/budget, a mocked camera read plus five real Hypermart SKU lookups, exact shelf-price totals, quantity changes, budget overrun, saved history, local helper, offline reload, themes and no horizontal overflow. Camera tracks stop when the scan sheet closes. No uncaught browser errors.
- **Scanner and QR bundles** pass a round-trip test: generate a PNG QR with the shipped encoder and decode it using the shipped ZXing browser bundle. This verifies bundling and decoder operation, rather than physical camera hardware.
- **Savings UI** passes with isolated, intercepted test-only prices: an exact ₱20 swap and budget rescue. Fixture prices never enter the catalog.
- **Full offline catalog** passes: 135 compressed files, 33,934,645 bytes. An unvisited non-grocery SKU resolves offline. Downloads retain two parsed partitions instead of expanding the entire reference into RAM. Cached desktop lookup averaged 0.01 ms, maximum 0.1 ms; these figures exclude camera/network and are not mobile hardware measurements.
- **Startup** uses 216 exact source grocery records in a 3,331-byte compressed starter. Search and further browsing load the full department index with a visible loading state. The mobile test checks that the initial usable screen does not request the large search shards.
- **Lighthouse mobile 13.5.0:** Performance **97**, Accessibility **100**, on the generated production build in [CI run 39204341645](https://github.com/danne6077-beep/CYCLE-COUNT1/actions/runs/39204341645), app commit 2e62f60. This is a lab measurement, not a guarantee for every device or network. Reports and built-screen screenshots are in that run's shopper-proof artifact.
- **Reference integrity:** only HYPERMART; 672,040 unique products; no invented selling prices, stock or net sizes. Vendor fields are excluded. Text contrast checks meet the 4.5:1 threshold.
- **Firestore emulator rules** pass in [CI run 39204593995](https://github.com/danne6077-beep/CYCLE-COUNT1/actions/runs/39204593995): owner access/deletion, cross-user read/write/delete denial, unauthenticated access denial, payload/field/path restrictions and admin-role escalation denial. The project is demo-fuji-shopper; no production Firebase project is touched.

The earlier Performance score of 74 exposed the full-index startup delay. The smaller starter catalog resolved that issue; the score threshold remains enforced in CI.

## GitHub and Vercel

The implementation is published in [PR #2](https://github.com/danne6077-beep/CYCLE-COUNT1/pull/2) on codex/fuji-shopper-hypermart. The existing GitHub → Vercel integration builds the admin root and /shopper/ together.

[Vercel shopper preview](https://fujisupersystem-git-codex-fuji-shopper-hypermart-fuji-92d1.vercel.app/shopper/) was opened in the signed-in browser. The Hypermart product count, unavailable prices and required warning were visible. An isolated anonymous browser is redirected to Vercel sign-in, so this is a protected preview, not a public store launch. Protection has not been weakened.

The hosting dashboard identifies team fuji as **Hobby**. [Vercel Hobby](https://vercel.com/docs/plans/hobby) is restricted to non-commercial personal use. A commercial store launch conflicts with the brief's simultaneous free-only and Vercel requirements. No plan was purchased or upgraded, and this PR has not been merged to the production branch. An eligible Vercel plan or a different eligible host is required for commercial operation.

Mobile source-preview screenshots are also committed in docs/images/. The CI artifact contains the generated-build screenshots, Lighthouse reports, build report and generated dependency lockfile.

## Remaining limits

- Local registry downloads still fail certificate-chain verification, including attempts using the existing Windows root/intermediate trust stores. TLS verification was never disabled. Build, TypeScript, bundle and browser verification completed successfully in GitHub CI instead.
- Physical Android Chrome/iPhone Safari cameras, torch/focus, damaged labels, native home-screen installation and screen-reader checks remain on the [device checklist](shopper-device-checklist.md).
- Optional cloud sync, online model classification and staff price publication remain disabled without provider credentials and security configuration. Production Firestore rules have not been deployed. Public privacy contact/retention details and App Check/domain verification are required before enabling cloud sync.
- Google sign-in, sign-up, streaming AI and complete Filipino translation are deferred. The default device-local shopping app works without those services.
