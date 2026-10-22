# FUJI Cycle Count System

FUJI is a browser-based inventory workspace for importing retail inventory, reviewing rows, configuring count sheets, printing shelf tags, product lookup, masterlists, and cigarette stock/expiry monitoring. The app stays in vanilla HTML/CSS/JavaScript to protect the existing import-to-print workflow.

## Local development

Requires Node.js 20 or newer. Install the existing Playwright development dependency when network access is available, then run:

```sh
npm install
npm run check
npm run test:visual
```

`npm run check` syntax-checks JavaScript, runs unit tests, and builds `dist/`. To preview the built app, run `npm run serve` and open `http://127.0.0.1:4173`.

## Data and offline use

Offline device workspace has no password and stores inventory, preferences, and history in the current browser profile. That mode is for a trusted device and is not a server-side permission boundary. Use Settings → Data Management to export JSON before changing devices or restoring a backup. The versioned local-auth migration removes old local password hashes and does not clear inventory, settings, or backup files.

The PWA caches the shell, local assets, and pinned public UI libraries. It does not cache authenticated API calls. Online Firebase sign-in and Ask FUJI require a network connection. Cloud inventory synchronization is not enabled; data remains device-local.

Physical counts are saved as separate sessions in IndexedDB. Import inventory, choose **Start physical count**, then enter counted quantities and review variances. Expected quantities are optional import columns (for example `ON HAND` or `QTY`). Each count edit, variance decision, and completion is recorded in the session audit trail. Export a count CSV or include sessions in the Settings data backup before changing devices; sessions are not synced to Firebase.

## FOR SPR

**FOR SPR:** In Count Sheet → Choose Mode, select FOR SPR and upload an Excel or CSV file containing SKU, BARCODE, and DESCRIPTION. It prints a Letter portrait sheet with a count column and no CCD/locator fields. Rows retain their uploaded order and duplicates; the upload stays in memory and does not overwrite the inventory workspace. `npm run test:e2e:spr` checks a real XLSX upload, generated barcodes, two portrait PDF pages, invalid upload handling, and the existing manual mode. Cache the app's pinned official SheetJS and JsBarcode scripts locally and set `FUJI_SHEETJS_TEST_PATH` and `FUJI_JSBARCODE_TEST_PATH` to their absolute paths before running this check.

## Vercel deployment

`vercel.json` builds the static site into `dist/`, exposes `/api/chat`, and applies CSP, MIME, framing, and referrer headers. Vercel Preview deployments are created when the linked repository receives a non-production branch push. Production deploys from the project’s configured production branch; this repo cannot verify or change the Vercel project’s branch, plan, or environment configuration.

Set these values only in Vercel Project → Settings → Environment Variables. `.env.example` contains empty placeholders:

| Variable | Purpose |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase project ID (`fuji-d3292`) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service account JSON for the Cloud Datastore and Identity Toolkit operations used by rate limiting and claim provisioning |
| `GEMINI_API_KEY` | Optional Google AI Studio key; server-side only |
| `GEMINI_MODEL` | Optional model override; defaults to `gemini-2.5-flash` |
| `GROQ_API_KEY` | Optional fallback provider key; server-side only |
| `GROQ_MODEL` | Optional fallback model override |

Do not commit live keys or service-account JSON. Keep the Gemini key on a project with billing disabled if a no-cost-only policy is required, and check its quota in AI Studio before use. Gemini’s free quota is model- and project-specific and may change. The endpoint limits each signed-in user to 20 messages per minute and 200 per UTC day; Firestore writes and AI quotas still apply.

Vercel Hobby is free but restricted to personal, non-commercial use. It includes a 10-second default function duration and can pause usage after free quotas; verify the linked Vercel plan and project use before enabling `/api/chat`. If this workplace app is used commercially, the free Hobby plan may not be eligible. See [Vercel Hobby plan](https://vercel.com/docs/plans/hobby).

## Firebase setup and roles

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md). Cloud auth uses Firebase Authentication; email/password users must verify their email. Online authorization reads the Firebase ID token’s `role` and `storeId` custom claims. Firestore rules reject client writes to user roles and gate store data by claims. The local device role is never a cloud authority.

The app uses Firebase Spark-compatible Auth, Firestore, and App Check services. Firestore’s free quota currently includes one free database per project, 1 GiB stored data, 50,000 reads/day, 20,000 writes/day, and 20,000 deletes/day. Confirm current usage and pricing in the Firebase console; exceeding a free quota can stop operations. See [Firebase pricing](https://firebase.google.com/pricing) and [Firestore free quota](https://firebase.google.com/docs/firestore/pricing).

## AI and privacy

Ask FUJI is optional. Consent is off by default in Settings. It sends the typed question and recent chat to the configured provider only after the user presses Ask. The app does not send local inventory, announcements, or account data. Provider responses are treated as untrusted text and displayed with `textContent`. If secrets or service credentials are missing, offline help remains available.

## Quality and open setup

The source of truth for issues, evidence, and phase status is [AUDIT.md](AUDIT.md). Design roles and examples are in [docs/design-system.md](docs/design-system.md); in-app guidance is [docs/help.md](docs/help.md). Emulator rules tests, full sign-up/import/print/AI end-to-end tests, Lighthouse, print-PDF baselines, Firebase App Check/domain restrictions, Vercel environment values, and production deployment status must be verified before claiming full Phase 7 completion. Vercel Hobby’s use restrictions and project plan are also unverified from this checkout.
