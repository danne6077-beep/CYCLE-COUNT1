# Manual accessibility / physical-device checklist

Automated axe, reflow, reduced-motion and focus tests do not replace TalkBack/VoiceOver. Physical screen-reader use and browser-toolbar 200% zoom are **not measured** here because no device is connected. The browser harness emulates a narrow layout/keyboard viewport; label it accordingly.

Record tester, device/model, OS, browser, assistive technology/version and date. Repeat default and Christmas themes, light/dark. Check:

- [ ] Launcher announces Ask FUJI and opens a modal; focus stays inside, Escape/back closes, focus returns to launcher.
- [ ] Tour is skippable; language and options are labeled; all controls have 44px click targets.
- [ ] New replies are announced once without rereading the entire history. Saved history loads without an announcement storm.
- [ ] Price tables read headers, item/SKU, size provenance, price and unit price in a useful order; horizontal scrolling is keyboard accessible.
- [ ] Plan summary, assumptions, editable people/days/budget, groups, quantities and computed total read in order. No stock/nutrition/price-certainty claim is implied.
- [ ] Steppers announce the item and changed quantity/total; group adds and undo announce results. Confirm there is no unexpected focus loss after swap or variant change.
- [ ] Budget ring has text/icon state and a meaningful progressbar value; color is not its only signal.
- [ ] Share/copy includes the price provenance and unverified-price warning. Clear chat data confirms and resets all chat-related data; cancel preserves it.
- [ ] Every game works with keyboard and screen reader. Guess form has a label, result is announced, budget score/coverage are understandable, daily check-in does not increment twice.
- [ ] Effects remain off under reduced motion. Sound/haptics are off until opted in. No microphone prompt occurs.
- [ ] At actual browser 200% zoom, all text remains readable and the composer/buttons remain usable without clipping. Check landscape and system large text.
- [ ] Android/iOS keyboard leaves the composer visible. Scroll large plans, collapse groups and return to typing without losing focus.
- [ ] Install through the real browser menu, launch from home screen, go into airplane mode and restart. Test an old cached version updating with history preserved.

Automated commands: `node scripts/shopper-planner-ui-check.cjs` (axe across themes and games), `node scripts/shopper-installability-check.cjs` (manifest/icons/offline start, reduced motion, simulated keyboard, focus and reflow). Results belong in qa/shopper and final CI artifacts; never claim a Lighthouse PWA score.
