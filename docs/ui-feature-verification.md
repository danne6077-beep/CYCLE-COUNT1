# Phase 6 UI evidence

Command: `node scripts/shopper-planner-ui-check.cjs` against the production build at localhost:4184. Output: “Planner UI passed: grouped add/undo, stepper/swap, share, themes, offline planning/games, axe and requested-4x main-thread tasks.”

The harness checked grouped add, add-all without duplicating a previously added group, undo, linked quantity edits/undo, swaps with recomputed sums, explicit trip-budget action, sharing text with unverified-price notice, 12 planning/follow-up queries with networking disabled, price guessing, budget-game scoring and a daily check-in. Sound and haptics default unchecked, with zero observed invocations. Sharing is mocked to prevent sending anything externally.

Result JSON: `qa/shopper/planner/report.json`: status passed, offlinePlans 12, zeroNetwork true, axeViolations [], mainThreadTasksAtRequested4x [], errors []. The main-thread measurement covers one warm Noche Buena query, not every possible UI/history state. A first-contentful-paint event occurred at 168ms; the first snapshot request event was at about 483ms relative to the page time origin, after paint. This is a desktop browser measurement, not physical Android.

Screenshots in `qa/shopper/planner/` cover the budget ring in mobile/desktop × light/dark × default/Christmas themes, plus game views. No Julian mascot, joke pool or toggle is present. The seasonal decoration uses static SVG; fun motion, generated sound and haptics require opt-in, and motion is suppressed by reduced-motion preferences.

Plan edits are previews until Add is chosen. Rows added from a card are linked so subsequent card steppers/swaps update the actual basket with undo. A fresh text follow-up creates a new preview; it does not silently replace a previously accepted trip. Each new preview says whether it has been added. The plan budget is separate from the current trip budget until the explicit “Use this budget for my trip” button.

Commands: `node --test shopper/tests/games.test.js` → tests 2, pass 2, fail 0. `node --test shopper/tests/planner.test.js` → tests 3, pass 3, fail 0.

The production builder fingerprints every module import and worker URL, and measures the actual static import graph. This avoids stale storage/client modules during updates. The 150 KiB initial JavaScript and 60 KiB playbook gates remain enforced.
