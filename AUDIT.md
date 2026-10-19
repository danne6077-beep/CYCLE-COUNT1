# FUJI Cycle Count System — Phase 0/1 audit

**Audit date:** 2026-10-19  
**Repository:** `danne6077-beep/CYCLE-COUNT1`  
**Audited branch:** `upgrade/audit-ui-auth-ai`  
**Audit snapshot:** The findings below describe the repository before the current implementation work. See the phase status and resolution notes at the end of this document for current progress; open infrastructure and validation gaps remain explicitly listed.

## Phase 0 — Discovery

### 10-line codebase summary

1. **Stack:** Static HTML/CSS/vanilla JavaScript; CommonJS is used only for Node tests/utilities. No React, TypeScript, framework, bundler, or server runtime.
2. **Entry point:** `index.html` contains login, app shell, and the module screens in one document; modules are selected by JavaScript rather than URL routes.
3. **Source layout:** 16 CSS files, 25 JavaScript files, seven inline `<style>` blocks, plus static HTML/data/assets; counts include the design sample and 404 page.
4. **Build:** `scripts/build_pages.js` copies a curated static site into ignored `dist/`; `node scripts/build_pages.js` succeeds.
5. **Tests:** `node --test` runs the existing Node suite; it passed 16/16 tests on Node v24.19.0. Tests cover import utilities, filtering, expiry calculations, and seven theme contrast pairs, but not cycle-count variance.
6. **Core workflow:** Upload Excel/CSV, infer headers, edit/delete imported rows, configure count-sheet layout, preview, then print the count sheet or shelf tags. The primary count-sheet output is a blank physical count form; no expected/counted quantity or variance calculation exists.
7. **Other features:** Product lookup/hotlist, Shelf Tag, Masterlist workbook viewer, Cigarette Monitor/expiry, local/online login, announcements, settings, local backup/restore, search, theme, and offline help.
8. **Persistence:** Local account/session/settings/activity and utility data use `localStorage`; inventory and masterlist workbooks use IndexedDB; Firebase Auth/Firestore provide online identity/announcements. Inventory/session data is not synchronized to a server.
9. **Routes/deployment:** `index.html`, `404.html`, and `/design/` are static documents. The checked-out Git remote is `https://github.com/danne6077-beep/CYCLE-COUNT1.git`; the production Vercel URL is known, but deployment settings are not stored in this repo.
10. **Repo metadata mismatch:** `package.json` still points its repository/bugs/homepage metadata to `Fujitzu25/CYCLE-COUNT1`, while the active Git remote is `danne6077-beep/CYCLE-COUNT1`.

### Local run and command results

| Check | Result |
|---|---|
| Runtime | Node v24.19.0 |
| `node --test` | Pass, 16 tests, 0 failures |
| `node scripts/build_pages.js` | Pass, generated `dist/` |
| `npm run build` | Could not execute: npm is not on this machine's PATH; also no `build` script exists (`build:pages` is the available build script). |
| `npm run lint` | Could not execute: npm is not on PATH and no `lint` script exists. |
| `npm run typecheck` | Could not execute: npm is not on PATH and no `typecheck` script exists; project has no TypeScript. |
| `npm audit` | Not run: npm is unavailable. `package-lock.json` lists Playwright only; CDN-hosted libraries are outside npm's dependency graph. CDN advisory checks are recorded below. |
| Lighthouse mobile baseline | Not measured; no Lighthouse command/configuration is present in the repo or available local command path. |
| Visual suite | Existing `scripts/phase10-visual-regression.js` covers 294 desktop/mobile/theme/display-scale cases. A new audit-turn rerun was interrupted by user input; the previous run on the same source revision reported 294 passing checks and 14 screenshots. No import-to-print e2e or Lighthouse score is claimed here. |

### Storage inventory

No `sessionStorage` usage was found. Application storage currently uses:

| Storage key / database | Contents |
|---|---|
| `fuji-cycle-count-local-data-v1` (`localStorage`) | Store/date and save metadata; on IndexedDB failure, up to 1,000 rows can be stored here as a fallback. |
| `fuji-cycle-count-local-v1` / object store `state` / key `inventory` (IndexedDB) | Current imported inventory snapshot, store/date, items, schema version, and save time. |
| `fuji-cycle-count-local-history-v1` (`localStorage`) | Recent local actions and row-count summaries. |
| `fuji-local-accounts-v1` (`localStorage`) | Local account usernames, roles, salts, PBKDF2 hashes, and iteration counts. |
| `fuji-unified-local-session-v1` (`localStorage`) | Persistent local session identity, username, role, and creation time; no plaintext password. |
| `fuji-local-announcements-v1` (`localStorage`) | Up to 50 offline announcements. |
| `fuji-login-mode-v1` (`localStorage`) | Last selected local/online login mode. |
| `fuji-masterlist-v1` / object store `datasets` / key `latest` (IndexedDB) | Parsed uploaded masterlist records and workbook sheets. |
| `fuji-cigarette-monitor-v1` (`localStorage`) | Imported cigarette products and daily monitoring records. |
| `cycle-count-workspace-settings-v1` (`localStorage`) | Branding, editor/store names, accent, custom logo data. |
| `danne-lozana-count-layout` (`localStorage`) | Count-sheet layout controls. |
| `danne-lozana-selected-category` / `danne-lozana-selected-supplier` (`localStorage`) | Selected count-sheet categories or suppliers. |
| `danne-lozana-printed-suppliers` (`localStorage`) | Local printed-supplier status/history. |
| `cycle-count-hotlist-shift-v1` (`localStorage`) | Hotlist shift quantities and updates keyed by category/SKU. |
| `cycle-count-master-details-v1` (`localStorage`) | Imported SKU price/locator mapping. |
| `branch_locator_overrides` (`localStorage`) | User-edited SKU-to-locator overrides. |
| `fuji-color-theme-v1` (`localStorage`) | Light/dark preference. |
| `fuji-cookie-choice-v1` (`localStorage`) | Cookie/local-storage notice choice. |
| `fuji-newsletter-interest-v1` (`localStorage`) | Email addresses entered into the local-only newsletter form. |
| `fuji-feedback-drafts-v1` (`localStorage`) | Help feedback drafts; no shared submission occurs. |
| `fuji-sidebar-collapsed-v1:<username>` (`localStorage`) | Per-user sidebar collapse state. |

### Vercel/deployment configuration review

- No `vercel.json`, `.vercel/project.json`, serverless `api/` route, middleware, or environment-variable file is tracked. There is no Vercel build command/output configuration to inspect in the repository; static output is `dist/` from `scripts/build_pages.js`.
- The Git remote differs from `package.json` metadata. Vercel Project Settings, framework preset, configured build/output overrides, deployment logs, production/preview environment variables, Firebase authorized domains, and App Check cannot be verified from this checkout. No app environment-variable references or localhost endpoint URLs were found in application JavaScript; `localhost` appears only in local setup/test instructions.
- No server-side functions exist, so serverless duration/runtime limits, API-route authorization, and route rate limits are not applicable to current code. Firestore is accessed directly by the browser and relies on Firestore Rules.
- Firebase web config in `firebase-config.js` contains the public Firebase web API key/project identifiers, not a server credential. The key is not an authorization boundary; database rules are. No service-account/private key was found.
- The app includes 22 non-deferred script tags at the end of `index.html` (four third-party CDN libraries plus 18 local scripts). They are parser-blocking while loaded and loaded together for the whole static app; large parsing/transfer cost has not been benchmarked.
- `xlsx@0.18.5` is affected by reviewed High-severity SheetJS advisories for prototype pollution (CVE-2023-30533, versions `<0.19.3`) and ReDoS (CVE-2024-22363, versions `<0.20.2`). The npm registry advisory notes patched SheetJS CE releases are distributed outside npm. See [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) and [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9). The current app parses user-selected workbooks in-browser, so a malicious workbook is the relevant input path.
- None of the four CDN script tags has an `integrity` attribute. Firebase compat SDKs are dynamically loaded on online login from `gstatic.com` and also have no SRI pin.

## Phase 1 — Audit findings

Format: **ID | Severity | File:line | Problem | Impact | Exact fix | Status / Fix commit**. No fixes have been applied in Phase 1.

| ID | Severity | File:line | Problem | Impact | Exact fix | Status / Fix commit |
|---|---|---|---|---|---|---|
| A-01 | High | `index.html:861`; `app.js:285-344`; `cigar-monitor.js:253-282` | The app parses imported user workbooks with `xlsx@0.18.5`, an affected SheetJS CE release (prototype pollution and ReDoS advisories). | A crafted workbook can affect the browser session or consume excessive CPU while being parsed. | Replace with a maintained, patched spreadsheet parser/build; pin and self-host it; set restrictive parse options and size limits; regression-test representative imports. | Open — no fix yet |
| A-02 | High | `app.js:107,116-117,748`; `index.html:809` | Imported supplier/locator/SKU/barcode/description values are interpolated into `innerHTML` when rendering editable inventory, generated tags, and count sheets. | An imported cell can become executable markup/script in the app origin and access browser-local workspace data. | Render data with DOM nodes and `textContent`; centralize safe escaping for any unavoidable HTML; add malicious-cell regression tests for every render path. | Open — no fix yet |
| A-03 | Medium | `firebase-auth.js:60-74,107-146`; `firestore.rules:24-42` | Local role checks are client-side only. Roles are stored in editable localStorage; `readLocalSession()` trusts the local account/session role. Seeded `admin/admin123` and `user/user123` accounts are also created in each fresh local profile. | Anyone with DevTools or the device profile can promote a local account and use local admin-only controls. This is explicitly a trusted-device convenience mode, not a security boundary. | Remove password-based local accounts per brief; retain a no-password local workspace label and isolate its controls. For online accounts use server-managed custom claims or rigorously locked role documents and keep every privileged operation rule-checked. | Open — no fix yet |
| A-04 | Medium | `firestore.rules:24-42`; `firebase-auth.js:199-240` | Firestore Rules enforce admin-only announcement writes (positive finding), but online profile roles are mutable only by out-of-band console setup, announcements are readable only by signed-in users (not public), and no inventory/session collection rules or Storage Rules exist in this repo. Authorized domains and App Check are project-console state and unverified. | The current app has no cloud inventory model; future cloud sync must not ship before per-store ownership rules, role provisioning, App Check/domain restrictions, and emulator tests are in place. | Add deny-by-default rules and emulator tests for each new collection; server-provision immutable role claims; verify Firebase Console auth domains/App Check/Storage policies before enabling cloud sync. | Open — no fix yet |
| A-05 | Medium | `index.html:861-863,864-881`; `package-lock.json:5-20` | Four third-party libraries are loaded by unhashed CDN URLs without SRI; npm audit cannot see those browser dependencies. | CDN or upstream compromise can run in the app origin. XLSX advisory exposure is independently covered by A-01. | Vendor pinned, verified builds locally (or use immutable versions plus SRI and `crossorigin`); document provenance and automate dependency/advisory checks. | Open — no fix yet |
| A-06 | Medium | `app.js:1-120`; `index.html:499-516` | The app prepares a blank physical count sheet; it has no expected quantity, counted quantity, variance (`counted − expected`), variance percentage, tolerance, recount trigger, or count audit trail. | Accuracy/recount metrics requested by this upgrade cannot be computed from the current app data model; existing count-sheet printing remains the core workflow. | Add an explicit session/count schema with validated expected and counted quantities, documented zero-denominator behavior, tolerance/status rules, rounding policy, duplicate checks, and auditable edits; test calculations before surfacing metrics. | Open — no fix yet |
| A-07 | Medium | `cigar-monitor-utils.js:104-107`; `cigar-monitor.js:294-309` | CSV export quotes commas/quotes/newlines but does not neutralize spreadsheet formula prefixes (`=`, `+`, `-`, `@`, tab/CR). | Imported descriptions/metadata can execute formulas when the CSV is opened in spreadsheet software. | Prefix dangerous cells with a safe apostrophe or equivalent export policy before RFC-compatible quoting; add formula-prefix tests. | Open — no fix yet |
| A-08 | Medium | `app.js:226-294`; `tests/count-sheet-import.test.js` | Header aliases and standard-column fallback are implemented, but there is no column-mapping UI or row-numbered import error report; UPC check digits and duplicate SKU/UPC/location combinations are not validated. | Ambiguous files can be silently mapped or accepted with data-quality problems; staff cannot quickly correct all bad rows. | Add explicit mapping confirmation, row/source coordinates, structured validation issues, duplicate/check-digit warnings, and row-level editable corrections. Keep leading-zero SKU/UPC values as strings and test numeric Excel cells with/without display formats. | Open — no fix yet |
| A-09 | Medium | `app.js:427`; `cigar-monitor-utils.js:15-24`; `cigar-monitor.js:247-254` | The main app initializes the date using UTC `toISOString().slice(0,10)`; local calendar dates can differ near timezone boundaries. Spreadsheet serials are converted using UTC; imported `Date` objects also use `toISOString()`. | Inventory/count dates can be saved or printed as the previous/next day for users outside UTC. | Use a tested local-date-only helper for UI calendar dates; retain explicit spreadsheet serial/date interpretation and add timezone boundary tests. | Open — no fix yet |
| A-10 | Medium | `app.js:1-68`; `masterlist.js:2-55`; `firebase-auth.js:3-6`; `layout-persistence.js:139-224,340-405`; `product-lookup.js:32-40,194-200`; `cigar-monitor.js:2,189-321`; `site-extras.js:4-6,121-138`; `app-shell.js:64-72,183` | Important records/preferences are split across browser localStorage and IndexedDB, persist only in the current browser profile, and have no cross-device sync. IndexedDB databases use version 1; backup JSON is the main portable migration path. | Browser clearing/device loss can remove operational data; storage changes risk losing user inventory if no migration is shipped. | Keep current keys readable; add versioned, idempotent migrations and restore tests before changing schema; keep backup/restore backwards-compatible; surface device-only persistence clearly. | Open — no fix yet |
| A-11 | Medium | `index.html:12-25,173-174,860-881`; `styles.css`; `redesign.css`; `app-shell.css` | The prompt's estimate of 24 CSS files is not accurate for this checkout: there are 16 CSS files, 25 JS files, and seven inline style blocks. Across HTML/CSS there are 685 distinct hex literals (1,321 occurrences) and 281 `!important` declarations; many legacy and override palettes coexist. Full value/source/line inventory: [docs/color-inventory.md](docs/color-inventory.md). | Hard to reason about precedence, rebrand safely, keep dark mode consistent, and distinguish UI colors from physical print colors. | Establish `tokens.css` as the UI color source; migrate component-by-component; keep print stock/spec colors separately; remove overrides only after screenshots and print diffs prove equivalence. | Open — no fix yet |
| A-12 | Medium | `tests/token-contrast.test.js:11-21`; `app-shell.css:1-30`; `index.html:26-171` | Current automated contrast test checks seven hand-selected token pairs only; it does not enumerate component text/background pairs, custom colors, disabled states, status treatments, or all focus/hover states. The sample low-contrast literals cited in the brief (`#87928a`, `#6d7971`, `#68766f`) are not present in HTML/CSS. | The current test passing does not establish WCAG AA across the complete app or themes. | Add token-pair and computed component-state contrast tests; include focus/disabled/semantic states; constrain custom accent selection to accessible colors. Record measured accessibility results. | Open — no fix yet |
| A-13 | Medium | `index.html:516,809`; `app.js:359,423-425` | `goGenerate` is duplicated; a hidden legacy div holds `generateBtn`, `backConfigure`, `printBtn`, `pdfBtn`, `tagSheet`, and `generatedSummary`. `app.js` binds handlers to these IDs and writes the legacy tag summary even though those controls/outputs are hidden. | Duplicate IDs are invalid; dead controls and duplicate handlers make the count/print flow difficult to maintain and can bind unpredictably after markup changes. | Trace each compatibility path against the current count-sheet and shelf-tag flow; remove only confirmed-dead markup and handlers, retain the established printable workflows, and use unique IDs. | Open — no fix yet |
| A-14 | Medium | `index.html:177-180`; `firebase-auth.js:35-42` | Skip link always targets `#loginTitle`, but the login page is hidden after successful authentication; the authenticated workspace has no skip-to-workspace target from this link. | Keyboard and screen-reader users can activate a skip link that lands in hidden content. | Point the skip link to a stable main-content landmark and update focus target as auth state changes; keyboard-test both states. | Open — no fix yet |
| A-15 | Medium | `index.html:12-25,173-174,860-881`; `app.js:88-115,244-294` | Twenty-two plain script tags (four CDN dependencies plus 18 local scripts) are included together, with no `defer`, module split, or route-level loading. The large spreadsheet/PDF/canvas libraries load even for screens that do not use them. | Slower startup and main-thread parsing on mobile, with no bundle-size or Lighthouse evidence yet. | Measure transfer/parse cost; defer local scripts safely or add a low-risk build that splits heavy features while preserving vanilla JS and verifying every print workflow. | Open — no fix yet |
| A-16 | Medium | `app.js:76-115,244-344`; `masterlist.js:115-240`; `shelftag.js` | Imports and generated data are held in memory; count inventory renders 100 rows per page, while parser walks the full worksheet and stores all rows. No 10k/50k-row timing/memory baseline or virtualized grid test is present. | Large files can stall or exhaust memory; current pagination limits rendered rows but not parse/retained-data cost. | Benchmark 10k/50k fixtures on supported devices; use chunked parsing/worker or streaming where supported and virtualize large validation tables without changing print pagination. | Open — no fix yet |
| A-17 | Medium | `cigar-monitor.js:195-220`; `cigar-monitor-utils.js:44-100`; `app.js:284-344` | Cigarette monitor requires whole-number quantities but accepts negative integers and does not validate relationships among beginning, withdrawal, sales, JDA sales, and ending counts. General inventory import validates only file readability/header mapping, not numeric quantity fields (there are no counted quantities yet). | Plausible-looking but inconsistent stock records can be saved or printed without actionable row-level messages. | Define business equations and allowed signed/empty values with the operator; validate per SKU/date and report errors without silently coercing values. | Open — no fix yet |
| A-18 | Medium | `index.html:242-245`; `product-lookup.js:336-345`; `home-dashboard.css` | Home inventory row count and last-updated value are data-derived, but “Count workflows” is static copy and there are no real accuracy, variance, open-session, or recount metrics because the schema does not exist. | Some dashboard copy reads as an operational metric when it is only descriptive; intended KPI cards cannot be trusted yet. | Keep descriptive cards clearly labeled; calculate operational metrics only from persisted count-session data and show explicit empty/loading states. | Open — no fix yet |
| A-19 | Low | `site-extras.js:128-138`; `index.html:414-416` | Newsletter form stores email addresses in localStorage and reports local interest; it does not submit or subscribe the user to a mailing list. | Users may reasonably interpret “Sign up” as an external subscription; email persists in a shared browser profile. | Remove the form as planned or relabel it as a local-only saved preference; do not imply a mailing-list subscription without a configured service and consent. | Open — no fix yet |
| A-20 | Low | `index.html:6-8,306-388,414-416`; `profile-danne.jpg`, `JIMBOY ABANTE.jpg`, `RIZ NESTY SAPUNGAN.jpg`, `PITPIT OMBION.jpg` | Title and meta description are identical; no theme-color, web manifest, or Open Graph metadata exists. The About panel contains long marketing/careers sections and named team portraits; repository alone cannot verify photo consent. | Search/social previews are weak; marketing content competes with inventory navigation; consent status is unknown. | Add accurate page metadata/manifest; slim About per the brief; confirm image permissions with the owner before retaining named photos. | Open — no fix yet |
| A-21 | Low | `package.json:18-26`; Git remote | `package.json` repository/bugs/homepage point to `Fujitzu25/CYCLE-COUNT1`, but `origin` is `danne6077-beep/CYCLE-COUNT1`. | Generated package metadata and contributor links can send maintainers to the wrong project. | Align metadata with the intended canonical repository after confirming ownership. | Open — no fix yet |
| A-22 | Low | `index.html:177-178,781-783`; `site-extras.js:37-43,121-138` | The application has scroll progress, floating Contact, back-to-top, a persistent cookie/local-storage notice, and a local-only newsletter form; the latter collects an email without a remote subscription. | These controls compete with the inventory task on small screens; several are not essential for a warehouse workflow. | Remove scroll progress/newsletter, collapse contact into About, and reduce the local-storage notice while retaining accessible navigation and an optional back-to-top action. | Open — no fix yet |
| A-23 | Medium | `index.html:68,157,159,161`; `print.css`; `count-sheet.css`; `count-sheet-reference.css`; `print-tags.css`; `shelftag.css:129-130` | Print rules and `@page` declarations are spread across inline blocks and component styles. No baseline PDFs or pixel-diff captures are stored for the standard count sheet, reference sheet, white shelf tags, or yellow PP tags. | CSS/token changes can silently shift print pagination, barcode dimensions, colors, and physical tag stock output. | Capture baseline PDFs for all four print artifacts and representative layouts before changes; after each style phase compare rasterized page images and verify barcodes with a physical scanner. | Open — no fix yet |
| A-24 | Medium | `firebase-auth.js:258-301`; `index.html:188-203` | Online login currently offers Firebase sign-in only; no sign-up, password reset, email verification, or Google provider flow is present. | New staff cannot onboard or recover access through the app; admin provisioning depends on manual Firebase Console steps. | Implement the requested Auth flows and clear validation/error states, with server-enforced roles and Firebase emulator tests; keep local device mode as a distinct no-password workspace. | Open — no fix yet |

### Suspect checklist and additional checks

| Suspect / check | Audit result |
|---|---|
| Color inventory and override clutter | Partly confirmed. 124 hex occurrences are in `index.html`; repository total is 685 distinct values / 1,321 occurrences and 281 `!important` declarations, not 70. Only 16 CSS files are present. See [full inventory](docs/color-inventory.md). |
| CDN/SRI and xlsx advisory | Confirmed: four CDN scripts, no SRI, xlsx 0.18.5 is affected by two reviewed advisories. |
| Local password storage and admin escalation | Passwords are PBKDF2-SHA256 salted hashes (210,000 iterations); plaintext password is not stored. Local role can be edited through DevTools/localStorage and is not a security boundary. Online announcement write role is enforced by Firestore Rules. |
| Firebase config/rules | Public browser config only. Firestore Rules deny client profile writes and enforce admin announcement writes. No Storage Rules or emulator tests are tracked; authorized domains/App Check need console access. |
| 22 scripts and heavy libraries | Confirmed: 22 non-deferred tags at end of index, including xlsx/jsPDF/html2canvas on all app visits. |
| Supplied low-contrast sample literals | Not present as literals in current HTML/CSS. Existing 7-pair token test passes; full component/state coverage and measured WCAG audit remain outstanding. |
| Duplicate ID and legacy buttons | Confirmed: duplicate `goGenerate`; hidden compatibility controls are still referenced by `app.js`, though their actual user-flow dependence has not been fully e2e-tested. |
| Clutter controls | Confirmed, with newsletter local-only behavior documented in UI. |
| About marketing content | Confirmed as a long section within the single app document; navigation/context impact needs a usability pass. |
| Skip link | Confirmed: fixed target is hidden after login. |
| Brand naming/mark | Confirmed: logo image is used on login/sidebar; workspace and About still use an `F` text mark and title strings vary. |
| Meta/manifest | Confirmed: title duplicates description; no manifest/theme-color/OG metadata. A custom `404.html` exists. |
| Static filler metrics | Partly confirmed: row count and last updated are dynamic; one “Count workflows” value is static descriptive copy; count accuracy KPIs do not exist. |
| Team photo consent | Cannot be confirmed from code/repo. Ask owner before republishing/removing named portraits. |
| Imported-cell XSS | Static review confirms unsafe interpolation in inventory/tag/count-sheet HTML templates; announcement text uses `textContent`. A controlled malicious-workbook browser exploit test was not run during this audit. |
| CSV injection | CSV quoting is present, formula-prefix neutralization is absent. |
| Leading-zero SKU/UPC | Import reads displayed formatted cell text (`cell.w` / `format_cell`) and converts to strings; this helps retain display zeros. Numeric cells with no zero-preserving format have already lost the original digits in the workbook and cannot be recovered. Regression cases are not comprehensive. |
| UPC check digits / duplicate SKU-location | No check-digit validation or import duplicate warnings found. Multiple locators per SKU are supported by some lookup flows, so duplicate policy must be explicit before rejecting rows. |
| Large import performance | No 10k/50k benchmark. Inventory parser yields periodically, retains full rows, and displays 100 rows/page; memory/latency remain unmeasured. |
| Column mapping and locator prefixes | Alias-based mapping plus positional fallback exist; no user-confirmed mapping UI, row-level error report, or configurable SA-/BA-/WH- prefix setting found. |
| Barcode print quality | `JsBarcode` is used by the print UI and CSS requests crisp rendering; no physical scanner test or PDF regression comparison was run. |
| Keyboard/screen reader/mobile | Focus-visible and reduced-motion rules exist. No keyboard-only workflow, screen-reader, axe, 360px tap-target, or full mobile usability audit was run in this phase. |
| Cycle calculations/recount thresholds | No expected/counted variance model or related tests exist. Existing tests do not cover these calculations. |
| Print regression | No before/after PDF baseline/diff assets found. Print must be treated as a protected business artifact before style changes. |
| Storage migration | Current backup/restore is useful and must be preserved. There is no cross-device sync. Data migration and backwards-compatible restore tests are prerequisites for schema changes. |

### Original prioritized fix plan

1. **P0 security/data safety:** replace or patch the vulnerable workbook parser; eliminate imported-data HTML injection; protect CSV exports against formulas; make local mode's non-security-boundary behavior explicit and remove default password accounts as specified.
2. **P1 preserve and establish correctness:** characterize print outputs and current core workflow; define a versioned count/session model and calculation rules; add import mapping, row error reporting, duplicate/UPC validation, locator-prefix settings, and tests; preserve backup restore through migrations.
3. **P1 Firebase readiness:** run rules/emulator tests, verify role enforcement, App Check, authorized domains, and production/preview project configuration before enabling any cloud inventory or AI data tools.
4. **P2 quality and accessibility:** build comprehensive contrast/accessibility checks, fix skip-link and duplicate/dead IDs, add keyboard/360px/screen-reader testing, and measure Lighthouse before/after.
5. **P2 design/performance:** inventory print-sensitive styles and tokens, migrate colors without changing physical print specs, progressively reduce script/CSS blocking, and benchmark large imports.
6. **P3 UX polish/deploy:** simplify home/About, remove/relabel local newsletter and clutter per the brief, add PWA only after cache/offline semantics are tested, then verify Vercel settings, add headers, capture screenshots, and create a PR. No Phase 2 work starts until the user reviews this audit.

## Implementation progress (2026-10-19)

This branch implements the feasible local application work from Phases 2–7 and the Phase 10 shell/design brief. The Vercel Preview deployment reports Ready, but access protection prevented visual verification of the hosted URL from the connected account.

| Checkpoint | Commit / result |
|---|---|
| Phase 0–1 audit baseline | `3381e51` |
| Application and visual QA implementation | `96b41c1` |
| Syntax check | Passed: 34 JavaScript files |
| Unit tests | Passed: 29/29 |
| Build | Passed: static `dist/` output and valid web manifest |
| Browser layout regression | Passed: 336 cases; 300 after screenshots, zero failures; screenshots at `qa/phase10/before/` and `qa/phase10/after/` |
| Vercel Preview | Deployment check reported Ready; branch preview at `https://fujisupersystem-git-upgrade-audit-ui-auth-ai-fuji-92d1.vercel.app/` is protected by team access |
| Pull request | [#1](https://github.com/danne6077-beep/CYCLE-COUNT1/pull/1) |

| Phase / area | Current result | Remaining verification |
|---|---|---|
| Security and data safety | Imported values are escaped before HTML rendering; spreadsheet CSV formula prefixes are neutralized; local password accounts and seeded credentials are removed via a one-time data-preserving migration; workbook parser is pinned to official SheetJS 0.20.3 CDN; headers and restrictive Firestore rules are added. | CDN libraries are not vendored or SRI-pinned; Firestore emulator, Firebase Console App Check/auth domain policy, Vercel secrets, and live auth/AI routes are not verified. |
| Inventory correctness | Import mapping confirmation, row-numbered issue reporting, duplicate/check-digit validation, 50k row guard, configurable locator prefixes, count variance utilities, and print page estimate utilities are implemented and unit-tested. | Count sessions/variance are not wired into persisted operational workflow; business rule validation for cigarette quantity relationships is unresolved; no operator-approved tolerances. |
| Design and UX | Tokenized themes, shell/navigation, internal design page, skip link, keyboard help, PWA shell, offline help, streamlined About/contact, reduced motion, and local preview server are implemented. | Full Lighthouse/axe/screen reader/keyboard-only signoff is outstanding; contrast tests cover selected semantic token pairs, not every computed component state. |
| Performance and scale | Inventory display is paginated and file/row sizes are bounded at 20MB/50k; tests cover a 50k utility fixture. | Import parsing is still synchronous and retains rows; no device performance/memory benchmark, virtualization, or Lighthouse measurement. |
| Print and regression | Print theme aliases stay light; screenshots and automated layout checks cover viewports, scales, themes, and primary screens when the visual run completes. | No printer/PDF reference baseline or barcode scanner validation; print output has not been compared to known production forms. |
| Cloud and deployment | Firebase email verification, password reset, Google sign-in, claims provisioning script, role-checked rules, optional consent-gated server AI endpoint with rate limits, and Vercel config are implemented. | No cloud credentials are present; custom claims, rules emulator, provider quotas, Vercel preview deployment, and production deployment remain unverified until connected configuration is available. |

Do not describe the application as cross-device synchronized: inventory and activity remain local browser data. The static Vercel app can deploy independently, while Firebase and Ask FUJI online features need external environment setup.

## Count-session follow-up (2026-10-19)

The status table above is the earlier Phase 2–7 implementation checkpoint. Since then, the physical count workflow has been connected to imported inventory and local persistence:

- CSV/XLSX import mapping recognizes optional expected quantity columns (including `ON HAND` and `QTY`). Count Entry snapshots imported rows and expected quantities into a separate IndexedDB session store, preserving the existing inventory store.
- Operators can record counted quantities, variance reasons and notes, approve/recount variances, inspect an audit trail, export a formula-safe CSV, print a report, resume saved sessions, and complete only after required variances have been resolved.
- Local backup export/restore includes count sessions. Sessions remain local to the browser; no cloud sync is claimed.
- Regression evidence: JavaScript syntax check passed for 38 files; unit suite passed 34/34; static build passed; browser count flow passed real CSV import and expected-quantity mapping, variance review, audit, CSV export, completion, reload persistence, six responsive/theme screenshots, and zero page errors. Expanded visual regression passed 384 cases with no failures. Screenshots are under `qa/phase10/after/`.
- Failure handling: a new count session reports local persistence errors before opening a session that was not saved.

Remaining requirements are still open: Firebase emulator and live claim/rules verification; configured Vercel environment and hosted preview access; cloud inventory synchronization (not implemented); real-world AI provider verification; full accessibility/Lighthouse and keyboard-only signoff; physical print/PDF parity; barcode scanner validation; and large-device performance/virtualization. The Vercel preview is access-protected for the connected account, so the Ready deployment status does not constitute hosted visual verification. Production has not been changed.

