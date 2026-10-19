# Shopper validation — 19 October 2026

## Data and public website

The grocery website is https://fuji-grocery-tracker.vercel.app/. An anonymous HTTPS request returned 200 with the FUJI Grocery Tracker page and no Vercel login. Its Vercel project is fuji-grocery-tracker (root shopper), separate from the Cycle Count Generator. The previous temporary domain redirects to this address. Preview deployments may remain protected.

The visible catalog is the supplied 14,076-item assortment: 14,026 exact HYPERMART SKU matches and 50 explicitly unmatched supplied items. Unlisted master items, GOMART and SET are excluded. There is no effective price date. SKU 2028 rounds half up from 0.209 to 0.21 pesos. Every estimate displays: **Prices may not always be accurate. Estimate only. Final prices are confirmed at the cashier.**

Stock, verified package sizes and comparison groups remain unknown. Personal shelf prices do not rewrite shared data. Website and Android share catalog provenance; personal shopping data stays separately on each device.

## Verified web baseline

The redesigned app at commit 91c2255 passed [CI run 39226997714](https://github.com/danne6077-beep/CYCLE-COUNT1/actions/runs/39226997714): syntax/type checks, 59 repository tests, production build, the mobile shopping flow, exact centavo totals, budget/history/helper/theme behavior, offline reload, fixture-only savings, shipped QR/ZXing round-trip decoding and Firestore emulator isolation tests. Lighthouse mobile 13.5.0 scored **Performance 91 / Accessibility 100**. These are lab measurements, not guarantees for all devices.

The filtered offline catalog has 136 compressed files totaling 965,395 bytes. A small starter plus 48 first-screen prices makes all 24 initial cards priced without loading the full price/search overlays. The importer and Android seed derive from the same filtered export.

## Camera update

The phone-camera update requests getUserMedia directly from the Scan tap before decoder loading. It uses muted inline playback, visible opening/permission/error states, a basic-camera constraint retry, a single-stream ZXing fallback when native BarcodeDetector is absent or broken, cancellation/late-stream cleanup and a local Take barcode photo option. Images and frames are not uploaded.

**65 repository tests pass locally**, including six camera lifecycle/error regressions. The complete source mobile shopping flow passes after the update. Camera browser checks pass at both /shopper/ and the standalone / root using Chromium's simulated camera and real getUserMedia/video playback. They cover absent/broken native detectors, one camera request per session, permission denial and enabled retry, actual shipped ZXing decoding of a barcode photo into SKU 486522 at 14.05 pesos, and stopped tracks after close.

The production build now replaces the precache placeholder correctly, includes decoder assets, and versions app/scanner entry points so an older worker cannot retain the previous camera implementation. Updated production CI and public deployment verification are recorded after publication.

## Limits and paused work

Physical phone camera hardware, torch/focus behavior, iPhone Safari and screen-reader use remain device checks. A site cannot override a permission denial in the phone's browser or OS. In embedded browsers, open the public URL directly in Chrome or Safari; permission guidance and photo/manual fallbacks remain available.

Optional cloud sync, online AI and staff publication remain disabled without provider/security configuration. Production Firestore rules and cross-device shopping sync are not provisioned. The default app works without these services.

Local dependency installation still encounters certificate-chain issues; TLS verification has not been disabled. Production build/type/bundle checks run in GitHub CI. Android APK work is paused at the user's explicit request; no final native build or physical-device validation is claimed.
