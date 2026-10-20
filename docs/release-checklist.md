# Future grocery release checklist — no release performed by this PR

Owner approval is required before merge, production push, promotion or rollback. Target only **fuji-grocery-tracker**, repository danne6077-beep/CYCLE-COUNT1, production branch codex/fuji-shopper-hypermart, app root shopper, public domain https://fuji-grocery-tracker.vercel.app/. Cycle Count is a separate Vercel project and must not be selected.

## Preconditions

- [ ] Review all 12 phase commits, the content-review owner checkboxes and price anomaly report. Resolve owner decisions in hardening-report.md. Confirm only the owner-approved opt-in Smart mode provider is present, off by default with durable limits; no analytics, invalidating storage changes, Firestore-rule changes or default sound/motion.
- [ ] Required checks on the exact proposed head: **Shopper checks / validate** and **Shopper checks / firestore-rules**, both successful. Validate includes all root tests (original 79 retained), syntax/type checks, 220 golden/154 regression/30 exploratory Bisaya evaluations, offline browser flows, zero axe violations, 44px targets, Lighthouse Performance >=90 / Accessibility 100, initial JS <150 KiB gzip and playbooks <=60 KiB gzip.
- [ ] Perform physical Android, TalkBack/VoiceOver and actual 200% zoom checks; record device/results. These are not measured by this PR. Review sample quantities and flagged source amounts with the data owner.
- [ ] Record the current immutable grocery production deployment URL, its commit SHA and worker SHA-256 as the rollback target. Do not use the mutable public alias as a rollback ID. Confirm Vercel CLI is logged into the correct team; never paste tokens into docs or commands.
- [ ] Confirm production deployment is held behind required deployment checks/owner release control. Git integration can deploy a production merge before its push workflow finishes; if that cannot be held, stage and verify the exact production build before assigning domains. This PR recommends controls but does not change account settings.

## Exact-commit CI and worker check

The workflow already triggers on pushes to codex/fuji-shopper-hypermart; retain it. PR checks may run a synthetic merge SHA. A later authorized merge must also pass both jobs on the actual production commit. Never cite a different PR head as evidence that the merge passed. Baseline production fc12f614 did run CI and failed Lighthouse Performance at 88; see post-release-verification.md.

Read-only commands (PowerShell, from repository root):

```powershell
git fetch origin
$releaseSha = git rev-parse origin/codex/fuji-shopper-hypermart
gh run list --repo danne6077-beep/CYCLE-COUNT1 --workflow shopper-checks.yml --commit $releaseSha
# For the successful run's actual ID:
gh run view $runId --repo danne6077-beep/CYCLE-COUNT1 --json headSha,status,conclusion,jobs
```

Require returned headSha=$releaseSha and both jobs success; retain shopper-proof artifact. Rebuild from that exact checkout with installed locked dependency versions, then compare bytes:

```powershell
node shopper/scripts/build.mjs
Invoke-WebRequest 'https://fuji-grocery-tracker.vercel.app/lib/chat/worker.js' -OutFile '.task/released-worker.js'
$builtHash = (Get-FileHash 'shopper/dist/lib/chat/worker.js' -Algorithm SHA256).Hash
$servedHash = (Get-FileHash '.task/released-worker.js' -Algorithm SHA256).Hash
if ($builtHash -ne $servedHash) { throw 'Worker SHA mismatch: stop release verification' }
```

The canonical package digest removes checkout-line-ending drift. builtAt is provenance metadata, not a fabricated source effective date. Hash the worker after the final build; never claim this review branch matches the currently deployed older worker.

## Post-deploy smoke (only after future approval)

- [ ] Public domain returns 200 without authentication; inspect CSP, nosniff, Referrer-Policy and camera=(self). Scan on a physical phone; verify stop closes stream and denied-permission guidance works.
- [ ] In a clean browser, prepare until Offline ready, then disable networking. Ask: **“ano bibilhin ko for Noche Buena, 8 kami, 5k budget”**, **“bagyo supplies for 4 people 3 days budget 3000”**, **“school baon for 2 kids for a week budget 1500”**. Check real SKUs/prices, assumptions, exact sums, unmatched concepts, flagged exclusions and provenance.
- [ ] Add by group/all, change quantity/swap, undo, adopt budget explicitly, reload offline and restore history. Verify an existing cached installation updates atomically. Exercise all games with sound/haptics off. No question/game requests or analytics.
- [ ] Confirm Julian toggle, assets and name-triggered replies are absent. Check light/dark and Christmas layouts, keyboard, focus, screen reader, clear-data/export and local retention.

## Rollback commands (future owner-authorized incident only)

Set $vercelScope to the **verified grocery team slug**, and $rollbackDeployment to the **immutable previously verified grocery deployment URL** recorded before release. Values are intentionally not invented here. Run these exact commands from repository root; inspect project/team/commit output before the mutating rollback command:

```powershell
vercel link --cwd shopper --project fuji-grocery-tracker --scope $vercelScope
vercel inspect $rollbackDeployment --scope $vercelScope
vercel rollback $rollbackDeployment --cwd shopper --scope $vercelScope
```

Verify the public domain and old worker hash, online and cached/offline behavior. Vercel rollback disables automatic domain assignment until a later authorized `vercel promote`; keep that control while investigating. Do not rollback the Cycle Count project. Source rollback is a reviewable revert PR, not a force push:

```powershell
git fetch origin
git switch -c codex/revert-grocery-planner origin/codex/fuji-shopper-hypermart
# Set $releaseMergeSha to the reviewed merge commit being reverted.
git revert -m 1 $releaseMergeSha
git push -u origin codex/revert-grocery-planner
gh pr create --repo danne6077-beep/CYCLE-COUNT1 --base codex/fuji-shopper-hypermart --head codex/revert-grocery-planner --title 'Revert grocery planner release' --body-file .task/rollback-pr.md
```

Write rollback-pr.md with the actual incident, target deployment/commit and verification before creating the PR. Re-run both required jobs. Merge/promote requires separate owner authorization. A future release must keep storage/cache compatibility and test the reverse update path; no browser user data should be deleted to hide a rollback issue.

## Recommended branch controls (not changed)

For codex/fuji-shopper-hypermart: require PRs, one owner approval, current-branch checks for validate and firestore-rules, resolved review threads, and no force pushes/deletion/direct pushes. Apply controls to admins where practical, with a documented emergency bypass owner. Enable deployment checks/required environment approval on the grocery project and verify exact production SHA as above. Keep Cycle Count's branch/project policy separate. The new review branch alone has git.deploymentEnabled=false in both Vercel configs; unspecified production branches retain existing behavior.

Reference: [Vercel deployment promotion](https://vercel.com/docs/deployments/promoting-a-deployment), [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration). Commands are a runbook, not evidence they were executed.


## History compatibility before an authorized older-client rollback

The new storage API reads both the old array and the new per-message manifest. If rolling back to an old client, first export and atomically reconstruct its array on that device. This procedure is **not executed by this PR**. In the grocery browser console, after saving a private backup:

```js
const {database,read}=await import('./lib/storage.js');
const history=await read('chat-history'),db=await database();
const keys=await new Promise(resolve=>{const r=db.transaction('state').objectStore('state').getAllKeys();r.onsuccess=()=>resolve(r.result);});
await new Promise((resolve,reject)=>{const t=db.transaction('state','readwrite'),s=t.objectStore('state');s.put(history,'chat-history');for(const key of keys)if(String(key).startsWith('chat-message:')||key==='chat-history-manifest')s.delete(key);t.oncomplete=resolve;t.onabort=()=>reject(t.error);});
```

Then run the approved deployment rollback and verify the old conversation and trip. A later upgrade can migrate that array again. Never clear user data to conceal a rollback problem. The newer owner-approved Smart mode remains off by default; live evaluation and secure credentials are prerequisites for its operational enablement, and enabling it by default requires a separate owner decision.
