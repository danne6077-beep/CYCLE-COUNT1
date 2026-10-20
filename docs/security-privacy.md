# Security and local data review

## Firestore (review only; no rules changed)

Source: `firestore.rules`, reviewed in this branch. Unmatched paths are denied by default.

| Collection/path | Read | Create/update | Delete |
| --- | --- | --- | --- |
| users/{id} | Authenticated owner or an administrator whose users document says role=admin | Denied to all clients | Denied to all clients |
| shopperUsers/{uid}/snapshots/{id} | Authenticated owner only | Owner only, id=current, exactly the permitted key set, string payload <=500,000 chars, timestamp, schemaVersion=1 | Authenticated owner only |
| announcements/{id} | Any authenticated user | Administrator only, bounded title/message, immutable author and createdAt on update, server request time on create | Administrator only |
| shopperUsers parent and every other path | Denied | Denied | Denied |

There are no unauthenticated writes. Admin role documents cannot be created or edited by clients. No clearly unsafe rule change is required, so the attachment's stop condition for modifying rules is not entered. Existing emulator tests exercise ownership, unauthenticated access, payload/shape bounds and role escalation. The baseline production run’s Firestore job passed; final branch CI will rerun the same test. Local emulator execution is not claimed unless separately recorded.

## Headers and rendering

`shopper/vercel.json` and root shopper-path headers retain CSP default-src/script-src/worker-src self, local styles/fonts/media, object-src none, base-uri self, form-action self, nosniff, strict-origin-when-cross-origin and camera=(self), microphone=(), geolocation=(). Optional account endpoints are restricted to the existing Google identity/Firestore hosts; chat/planning/games never use them. The public baseline request returned HTTP 200 with these headers (see post-release-verification.md). No external script, font, analytics, provider or model download is introduced.

All catalog names, user prompts, plan notes and feedback are escaped or written with textContent. Dynamic actions use event listeners, not inline script attributes. Module URLs and worker data URLs are versioned. Sharing requires an explicit user action and uses text with provenance, with copy fallback. Tests mock sharing so no person receives a test message.

Sound and vibration are off by default in games, budget alerts and scanner feedback. Both require the persistent opt-in preferences; fun motion also requires opt-in and is suppressed for reduced-motion users. No microphone access is requested.

## Local retention and clearing

IndexedDB remains `fuji-shopper-v1` with the existing state/catalog stores and no schema upgrade. Chat keys are separate from optional account snapshots: chat-history <=200 messages, chat-context last focus, chat-settings preferences, chat-games <=100 results plus streak summary, chat-saved-plans <=20, feedback/unanswered logs <=200. Versioned catalog/postings are cache data. No automatic upload/export occurs.

Clear chat data confirms first, resets history/context/preferences/games/streaks/saved plans/local feedback and clears the in-memory game view. It preserves the grocery trip, which is managed by the existing shopping controls. Delete my data deletes the full local database/cache after terminating the worker. An optional cloud snapshot is separately owned and must be deleted through Account, as explained in the existing notice. Browser quota/private-mode failures fall back to tab memory with a visible warning and no persistence guarantee.

Commands already run: `node scripts/shopper-planner-ui-check.cjs` → zero requests during 12 prepared offline planning queries and all three games; zero page errors. `node scripts/shopper-resilience-check.cjs` → five degradation/update cases passed. Final clearing/export/browser evidence is recorded by the dedicated privacy harness after feedback controls are complete.


## Current follow-up changes (2026-10-20)

The owner's new brief authorizes only opt-in Smart mode. Grocery CSP connect-src is now self; the only Smart browser request is POST /api/chat. The old unused basket-upload/provider endpoint is retired with fail-closed compatibility responses. See smart-mode.md for consent fields, the reused Upstash limiter, provider handling, retention and the disabled-by-default server flag. No Vercel environment changes or live provider calls were performed.

Chat history now uses an additive manifest plus <=200 individual message records in the same state store, at database version 1. Existing message objects and grocery data are preserved. One atomic IDB transaction serializes changed records in separate request callbacks, commits the manifest, removes retired records and removes the old array only after successful migration. A quota abort preserves the entire original legacy array and uses tab memory with a visible warning. Clear removes both formats. Commands: node scripts/shopper-history-check.cjs and node scripts/shopper-privacy-check.cjs; actual results are listed in hardening-report.md. No data-invalidating DB upgrade or Firestore-rule change occurs.
