# Phase 0: release verification (2026-10-19)

Read-only baseline at production commit `fc12f614ee0b0703fc00e27132fa3d1e98b4773e`, before hardening. New work is isolated on `codex/shopper-planner-hardening`; no merge or deployment is authorized by this task. The user explicitly removed the name-based mode, overriding all mascot/joke requirements in the attachment.

| Command / evidence | Observed output |
| --- | --- |
| `node --test` at repository root | tests 79, pass 79, fail 0 |
| `pnpm --dir shopper test` | tests 59, pass 59, fail 0. The original report's 79 includes 20 root tests; shopper-only never had 79. Preserve all root checks. |
| `node shopper/scripts/build.mjs` | initial 45,216 B; worker 14,711 B; snapshot 498,735 B; scanner 116,532 B gzip. Drift from report: +1/+1/+3/0 B. |
| `Get-FileHash -Algorithm SHA256 .task/baseline-public-worker.js` after `Invoke-WebRequest` | `DEB4BB1770BFDF1F8CD59176F6FA3558A43EF78F3EB91518DA8E47F64E570D3A` |
| `Get-FileHash shopper/dist/lib/chat/worker.js` | `AD74072EC155023C0DB27A36BF10A4107C11D3B8FFF9767EB5A18ADF4B0B471F` — mismatch after Windows checkout. The old version digest hashed raw JSON file line endings. Canonical JSON hashing is required for reproducibility. |
| GitHub workflow run 39263970666, head b4eb03c2 | validate success; Firestore success; Lighthouse Performance 90 / Accessibility 100 |
| GitHub workflow run 39264365570, production fc12f614 | CI **did run** on the production merge commit. Unit/mobile/Firestore success, Lighthouse failed at Performance 88 / Accessibility 100. Existing production push trigger is present and retained. No claim that production CI passed. |
| `Invoke-WebRequest https://fuji-grocery-tracker.vercel.app/` | HTTP 200; CSP worker-src self; camera=(self), microphone=(), geolocation=(). |

Graphify `graphify_rank_files` and `list_workspaces` both returned FORBIDDEN/no_workspace, including when trying to discover authorized workspaces. No workspace handle was returned. Local targeted source reads are the fallback, not a claim that Graphify indexed the release.

The phase 0 commit removes the retired mode's UI, runtime, asset and generated config; old saved joke prefixes are sanitized while preserving factual shopping responses and user messages. A branch-specific `git.deploymentEnabled=false` rule in both Vercel configs prevents this PR branch from auto-deploying. See [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration). Production branches retain their existing behavior.
