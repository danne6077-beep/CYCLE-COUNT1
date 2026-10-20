# FUJI Grocery Tracker for Android

Native Kotlin/Compose grocery companion for Android 8.0 and later. The user confirmed FUJI Grocery Tracker; the attached screenshot-gallery concept is used only for visual inspiration. All category artwork and the launcher logo are original code-drawn assets. No third-party screenshots are scraped or copied.

## Shared catalog

`node scripts/build-android-catalog.mjs` (from the repository root) generates `app/src/main/assets/seed_data.json` from the website's catalog. Both versions have exactly **14,076 supplied items and prices**, including **14,026 HYPERMART SKU matches** and **50 explicitly unmatched items** with supplied descriptions and no assumed barcode. Unlisted master items are not exported to either app.

The item list contains no effective price date. One source price, SKU 2028 at 0.209 pesos, is rounded half up to 0.21 pesos. Prices are stored and calculated as integer centavos. Stock, verified net sizes, comparison groups and unit-price savings remain unknown. Description text is not treated as a verified pack size.

Every screen displays: **Prices may not always be accurate. Estimate only. Final prices are confirmed at the cashier.**

## Build

Install free Temurin JDK 17 and Android SDK command-line tools. Accept the SDK licenses, then install `platforms;android-37.0`, `build-tools;36.0.0` and `platform-tools`. Set `ANDROID_HOME` or create an untracked `local.properties` containing `sdk.dir=...`. The wrapper pins Gradle 9.6.0; AGP 9.4.0 supports API 37. Java source/target are 17. No paid services, billing keys or secrets are needed.

```sh
node scripts/build-android-catalog.mjs
cd android
./gradlew assembleDebug testDebugUnitTest lintDebug
./gradlew connectedDebugAndroidTest
```

Windows: use `gradlew.bat`. APK output: `app/build/outputs/apk/debug/app-debug.apk`. Install by opening the APK on your phone and allowing that browser/file manager to install apps when prompted, or use `adb install -r app/build/outputs/apk/debug/app-debug.apk` with USB debugging enabled.

The APK is debug signed for review. A Play Store release requires the owner's private release key, which is not created or committed here. R8/shrinking are configured for release builds. CI review APK signatures may change between builds; an incompatible signer requires uninstall/reinstall. Export trips before replacing an installed build.

## Features and design

- Three-slide first-run onboarding, editorial category illustrations, adaptive product grid, local paging, live name/SKU/category search, Filipino search aliases and recent searches.
- Barcode camera scanning via free ZXing, manual SKU/barcode lookup, UPC/EAN aliases and disambiguation when a source code maps to multiple items. Camera permission is requested only on scan; canceled/denied scans retain manual entry.
- Running basket, quantity changes, exact centavo subtotals, optional budget with 80% and over-budget states, private shelf-price overrides and saved trips with frozen prices.
- DataStore favorites, named shopping lists, item checkmarks, add-to-basket actions and CSV sharing through Android's share sheet.
- Private product photos via Android Photo Picker, local Coil loading, pinch-to-zoom and explicit photo sharing. Photos are validated, copied to app-private storage and limited to 12 MB; no storage permission is requested.
- Dark-first FUJI theme, light/system themes, optional Material You colors, free Inter font, edge-to-edge insets, navigation rail on wide screens and accessible touch controls.
- Settings, source/price explanations, privacy, credits, photo deletion, recent-search clearing and deletion of private shopping data.

## Offline architecture

Single Activity, Navigation Compose, MVVM, Repository, Hilt, Coroutines/Flow, Room, DataStore and Coil. Room seeding is transactional and keyed by the shared seed checksum. Catalog replacement does not rewrite saved trip prices or delete private shopping records. Room and DataStore persist state across restarts. Errors and loading states are visible, and failed actions do not silently discard data.

The APK has **no internet permission**, account, ads or analytics. Website and Android share the catalog source, not a live personal-data backend. Personal shopping data stays separately on each device. The website button opens the protected Vercel preview in the phone's browser; that may require Vercel sign-in. New catalog data arrives through a rebuilt APK. This follows the user's free, local-first Android brief.

## Checks

JUnit covers money precision, invalid amounts, quantities, budget boundaries, barcode normalization and ViewModel delegation/filtering. Android instrumented tests seed the real 14,076-item database and check lookup, shelf overrides, frozen trip totals and idempotent reseeding. A Compose test exercises onboarding, supplied price lookup, basket budget, shelf-price edit and saved trip.

`.github/workflows/android.yml` builds and lints the APK, runs unit tests, starts an API 35 emulator with its network disabled, runs instrumented tests, uploads reports and publishes a GitHub prerelease APK only after checks pass. API 35 verifies compatibility below target API 37. This workstation reports hardware virtualization disabled, so emulator acceleration is handled in CI.

## Credits and free tools

Android Studio/SDK, Temurin, Gradle, Kotlin, AndroidX/Compose/Room/DataStore, Dagger/Hilt, Coil, ZXing and Material Icons are free. Inter by Rasmus Andersson is under SIL OFL 1.1 (`app/src/main/assets/Inter-OFL.txt`). Library attributions appear in Settings. Product names, barcode data and prices are user supplied. The Scrnshts directory is a visual reference only.
