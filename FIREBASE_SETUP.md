# Firebase setup

The browser config in `firebase-config.js` identifies the existing project `fuji-d3292`; it is public client configuration. It is not an authorization credential. Never commit a Firebase service-account JSON or provider key.

## Authentication

In Firebase Console → Authentication, enable Email/Password and Google sign-in. Add `localhost`, `fujisupersystem.vercel.app`, and the exact Preview domains used by the Vercel project to Authorized domains. Email/password sign-up sends a verification email; unverified users cannot enter the online workspace. Password reset is available on the login form.

The project owner must enable Firebase App Check and enforce it for Firestore in the console. Select a supported web attestation provider and add production/preview domains. Restrict the public Firebase API key to the real production, preview, and localhost domains without blocking the server-side Auth/Firestore APIs. Those project-console settings cannot be deployed from this repo.

## Firestore rules and custom claims

Publish `firestore.rules` in Firebase Console or using Firebase CLI. The rules deny writes by default; public announcements are read-only, announcement writes require an `admin` claim, and store records are isolated by the `storeId` claim. Editors can edit only their own store. Viewers can read only their claimed store. The app does not yet sync browser inventory to Firestore; those rules are prepared for a future opt-in sync and do not enable it by themselves.

New online sign-ups receive the least-privileged `viewer` role in the app when no role claim is present. Promote users through a trusted project administrator shell with the service-account JSON stored in an environment variable, never in a file committed to Git:

```sh
node scripts/set-user-claims.js FIREBASE_UID viewer STORE_ID
node scripts/set-user-claims.js FIREBASE_UID editor STORE_ID
node scripts/set-user-claims.js FIREBASE_UID admin STORE_ID
```

The script merges `role` and `storeId` into the account’s existing custom attributes. It requires IAM permission `firebaseauth.users.get` and `firebaseauth.users.update`, and service-account access to Firestore for AI rate limiting. Have an authorized Firebase project administrator apply rules, enable App Check, and provision the first admin claim. The repository contains no admin private key.

The existing `users/{uid}` role documents are not trusted for authorization anymore. Existing administrators need a server-managed `admin` claim before they can publish announcements. User profiles remain client read-only; the app does not expose a user-management console.

## Device-only workspace and backups

Choose **Open this device workspace** to use offline mode. No password is stored or required. Inventory, preferences, and history stay in the current browser profile. The one-time local migration strips legacy account hashes and leaves inventory, IndexedDB, settings, and backup JSON intact. Treat local controls as trusted-device convenience only.

## AI function secrets

The `/api/chat` function verifies Firebase ID tokens against Google’s public signing certificates, uses the service-account OAuth token for a transactional Firestore rate limit, and calls Gemini with optional Groq fallback. Set `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `GEMINI_API_KEY`, and optional Groq variables as Vercel server-only environment variables for Preview and Production. AI Studio quotas vary by model and project; keep a strict no-billing project if free-only operation is required. With no configuration, Ask FUJI returns an unavailable state and offline search still works.

The rate-limit data lives in Firestore `aiRateLimits/{uid}` and is managed by the Admin REST API, which bypasses Firestore client rules. Do not log request bodies or provider keys. Store only minimal counters and rotate service-account/provider keys if they are exposed.

## Emulator and deployment verification

The current machine has no Firebase CLI or Firebase emulator installed and package-registry access was denied. Therefore the rules have not been exercised against the emulator here. Before using cloud inventory or announcing an online production launch, run the Firebase rules emulator with authenticated admin/editor/viewer contexts, then verify claims, domain authorization, App Check enforcement, and Vercel Preview/Production secrets in their consoles.
