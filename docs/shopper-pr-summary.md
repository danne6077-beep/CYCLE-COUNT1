# FUJI Grocery Tracker website and Android companion

The public grocery website is **https://fuji-grocery-tracker.vercel.app/**. Its own Vercel project uses root directory shopper and branch codex/fuji-shopper-hypermart, independently of the Cycle Count Generator. No production merge into the generator's branch is required. Shared master-data exports stay in this repository.

Only the supplied 14,076-item list is visible, joined by exact SKU to HYPERMART: 14,026 matches and 50 explicitly unmatched supplied items. Unlisted master products, GOMART and SET are excluded. The price list has no effective date; SKU 2028 rounds from 0.209 to 0.21 pesos. Every estimate carries the required price-accuracy/cashier warning.

The Scrnshts-inspired redesign uses a dark-first editorial layout, self-hosted Inter and original illustrated category cards, with matching mobile/desktop light and dark themes. Browsing, camera/manual lookup, offline catalog caching, exact-centavo baskets, budgets, shopping lists, frozen trip history and the local catalog helper remain available. Optional cloud services fail closed without configuration.

The mobile camera fix requests access directly from the Scan tap, starts muted inline video before decoder initialization, handles missing/broken native barcode support with a single-stream ZXing fallback, and shows visible permission/busy/retry states. Take barcode photo decodes locally into the same SKU/price lookup. Closing or canceling the scanner releases camera tracks, including late permission responses. Versioned entry points and a complete PWA precache prevent an older shell from retaining the previous scanner.

Validation: 65 repository tests; syntax/type checks; production build; the mobile basket/budget/history/offline flow; native-detector-absent/broken camera tests; denied-permission guidance; actual ZXing photo-to-SKU lookup; and camera-track cleanup. Camera browser tests use a simulated Chromium device with real getUserMedia/video playback. Physical phone camera hardware remains unverified. See docs/shopper-validation.md for exact CI results.

A Kotlin/Compose Android companion using the same catalog is included. **APK work is paused at the user's request.** Its personal Room/DataStore records and website IndexedDB records are separate device-local stores; live cross-device sync is not provisioned.

![FUJI gallery design](images/shopper-desktop-gallery.png)
