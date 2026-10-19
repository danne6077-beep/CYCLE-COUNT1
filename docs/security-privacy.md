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
