# Snapshot delivery and graceful degradation

The app schedules background preparation after two animation frames and a short deferred task, after the shopping shell can paint. Opening Ask FUJI can start it sooner as an explicit user action. The snapshot/playbooks are not part of initial JavaScript.

Production data URLs carry the canonical package version. The worker verifies the expected snapshot version, the playbook digest and the full rows+aliases+effective-date+playbook digest before committing one IndexedDB package. A failed update retains an older complete package and labels it older; it cannot combine new aliases with old rows. Postings are accepted only for the same snapshot version. Service worker caches have a separate shell fingerprint, validate completeness through a message handshake, and remove old shell caches only after successful installation. Offline ready requires the matching complete shell, not just worker startup.

The database version remains 1. All additions are new keys; no existing basket/list/trip schema is invalidated. History remains capped at 200 messages. Retired assistant prefixes are removed while preserving user turns and factual shopping text.

If IndexedDB is unavailable or full, reads/writes use a clone-safe tab memory store. A visible warning says history may be lost. This keeps shopping and the prepared chat usable for the tab; it does not promise persistence or offline reload when browser storage/cache is unavailable. A first snapshot fetch/checksum failure shows Retry while normal shopping remains usable.

Command: `node scripts/shopper-resilience-check.cjs` against localhost:4184 production build. Output: five cases passed: unavailable storage, quota failure, initial fetch failure, mixed-version rejection, and old cached package → new package. Fetch/version failure retries succeeded. No retry was needed for the two memory-store cases. The update test observed version/build `c321c263705279dfb989`, all 22 playbooks, oldCache false, and preserved factual history without the retired prefix. Storage failures are injected in page and worker; SW is blocked for degradation-only cases. The package-update case uses a real service worker.

Commands: `node --test shopper/tests/storage.test.js` → tests 2, pass 2, fail 0. First-paint ordering and final UI long tasks are measured in the final browser harness; this document does not invent a physical-device result.


## History serialization follow-up

Full-array serialization was replaced by atomic per-message writes to avoid foreground work growing with all 200 messages. The database version/stores and message fields are unchanged. A legacy array is migrated losslessly in one transaction; on failure it remains intact. One real-browser test injects a quota exception on the second record and verifies original data survives, the current tab still has factual history and a warning is visible. A confirmed clear removes all message records and the legacy array. See the rollback conversion below before serving an older client.
